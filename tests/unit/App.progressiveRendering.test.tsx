import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { sampleDataset } from '../../src/data/sampleDataset';
import { db } from '../../src/db/database';
import { contentRepository } from '../../src/repositories/contentRepository';
import type { DatasetInput } from '../../src/schemas/contentSchemas';

const LARGE_QUESTION_COUNT = 65;

function buildLargeDataset(): DatasetInput {
  const baseQuestion = sampleDataset.questions[0];
  const baseMaterial = sampleDataset.materials[0];
  const baseOccurrence = sampleDataset.sourceOccurrences[0];
  if (!baseQuestion || !baseMaterial || !baseOccurrence) {
    throw new Error('sample fixture is incomplete');
  }

  const ids = Array.from({ length: LARGE_QUESTION_COUNT }, (_, index) =>
    `PERF-Q-${String(index + 1).padStart(3, '0')}`
  );

  return {
    datasetVersion: 'performance-rendering-fixture',
    schemaVersion: '0.5',
    questions: ids.map((id, index) => ({
      ...baseQuestion,
      id,
      prompt: `Performance QA ${String(index + 1).padStart(3, '0')}`,
      relatedMaterialIds: [baseMaterial.id]
    })),
    materials: [
      {
        ...baseMaterial,
        relatedQuestionIds: ids
      }
    ],
    sources: sampleDataset.sources,
    sourceOccurrences: ids.map((id, index) => ({
      ...baseOccurrence,
      source_occurrence_id: `PERF-OCC-${String(index + 1).padStart(3, '0')}`,
      canonical_question_id: id,
      source_question_no: index + 1,
      source_occurrence_order: index + 1
    })),
    media: []
  };
}

describe('App progressive rendering', () => {
  beforeEach(async () => {
    cleanup();
    await db.open();
    await Promise.all([
      db.learningHistory.clear(),
      db.materialHistory.clear(),
      db.examSessions.clear()
    ]);
    await contentRepository.replaceDataset(buildLargeDataset());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders large question lists in batches and keeps the full practice pool count', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '問題' }));
    await screen.findByText('Performance QA 001');

    expect(document.querySelectorAll('.question-card')).toHaveLength(30);
    expect(screen.getByText('30 / 65問を表示中')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '65問からセットを作成' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'さらに30問表示' }));
    await waitFor(() => expect(document.querySelectorAll('.question-card')).toHaveLength(60));
    expect(screen.getByText('60 / 65問を表示中')).toBeInTheDocument();
  });

  it('expands the rendered question range when a related material opens a target beyond the first batch', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '資料' }));
    const targetButton = await screen.findByRole('button', {
      name: '関連問題を開く: PERF-Q-065'
    });
    fireEvent.click(targetButton);

    await screen.findByText('Performance QA 065');
    await waitFor(() => expect(document.querySelectorAll('.question-card')).toHaveLength(65));
    expect(document.querySelector('#question-PERF-Q-065')).toHaveClass('targeted');
  });
});
