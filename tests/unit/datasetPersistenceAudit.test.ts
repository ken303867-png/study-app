import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../../src/data/sampleDataset';
import {
  auditDatasetPersistence,
  DatasetPersistenceAuditError
} from '../../src/repositories/datasetPersistenceAudit';

describe('datasetPersistenceAudit', () => {
  it('passes when the persisted snapshot exactly matches the normalized delivery dataset', () => {
    const audit = auditDatasetPersistence(sampleDataset, snapshotFromSample());

    expect(audit).toMatchObject({
      status: 'pass',
      questionCount: 1,
      verifiedQuestionCount: 1,
      verifiedChoiceAnswerCount: 1,
      verifiedExplanationCount: 1,
      verifiedSourceOccurrenceCount: 1
    });
  });

  it('detects a changed correct answer after persistence', () => {
    const snapshot = snapshotFromSample();
    const first = snapshot.questions[0];
    if (!first || !('correctChoiceIndexes' in first)) throw new Error('choice question fixture expected');
    first.correctChoiceIndexes = [0];

    expect(() => auditDatasetPersistence(sampleDataset, snapshot)).toThrow(
      DatasetPersistenceAuditError
    );
  });

  it('detects missing source occurrence and version metadata', () => {
    const snapshot = snapshotFromSample();
    snapshot.sourceOccurrences = [];
    delete snapshot.meta.schemaVersion;

    let caught: unknown;
    try {
      auditDatasetPersistence(sampleDataset, snapshot);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DatasetPersistenceAuditError);
    if (!(caught instanceof DatasetPersistenceAuditError)) {
      throw new Error('DatasetPersistenceAuditError expected');
    }
    expect(caught.issues.join('\n')).toMatch(/sourceOccurrences/);
    expect(caught.issues.join('\n')).toMatch(/meta\.schemaVersion/);
  });
});

function snapshotFromSample() {
  return {
    questions: structuredClone(sampleDataset.questions),
    materials: structuredClone(sampleDataset.materials),
    sources: structuredClone(sampleDataset.sources),
    sourceOccurrences: structuredClone(sampleDataset.sourceOccurrences),
    media: structuredClone(sampleDataset.media),
    meta: {
      datasetVersion: sampleDataset.datasetVersion,
      schemaVersion: sampleDataset.schemaVersion,
      explanationTemplateVersion: '1.0',
      formalDataSpecVersion: '1.1'
    }
  };
}
