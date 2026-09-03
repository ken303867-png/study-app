import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../../src/data/sampleDataset';
import {
  auditDatasetPersistence,
  DatasetPersistenceAuditError,
  type DatasetPersistenceSnapshot
} from '../../src/repositories/datasetPersistenceAudit';
import { datasetSchema } from '../../src/schemas/contentSchemas';

const normalizedSample = datasetSchema.parse(sampleDataset);

describe('datasetPersistenceAudit', () => {
  it('passes when the persisted snapshot exactly matches the normalized delivery dataset', () => {
    const audit = auditDatasetPersistence(normalizedSample, snapshotFromSample());

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

    expect(() => auditDatasetPersistence(normalizedSample, snapshot)).toThrow(
      DatasetPersistenceAuditError
    );
  });

  it('detects missing source occurrence and version metadata', () => {
    const snapshot = snapshotFromSample();
    snapshot.sourceOccurrences = [];
    snapshot.meta = {
      datasetVersion: normalizedSample.datasetVersion,
      explanationTemplateVersion: '1.0',
      formalDataSpecVersion: '1.1'
    };

    let caught: unknown;
    try {
      auditDatasetPersistence(normalizedSample, snapshot);
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

function snapshotFromSample(): DatasetPersistenceSnapshot {
  return {
    questions: structuredClone(normalizedSample.questions),
    materials: structuredClone(normalizedSample.materials),
    sources: structuredClone(normalizedSample.sources),
    sourceOccurrences: structuredClone(normalizedSample.sourceOccurrences),
    media: structuredClone(normalizedSample.media),
    meta: {
      datasetVersion: normalizedSample.datasetVersion,
      schemaVersion: normalizedSample.schemaVersion,
      explanationTemplateVersion: '1.0',
      formalDataSpecVersion: '1.1'
    }
  };
}
