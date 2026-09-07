import { db } from '../db/database';
import { datasetSchema, type Dataset, type DatasetInput } from '../schemas/contentSchemas';
import type {
  Material,
  MediaBlobRecord,
  MediaRecord,
  Question,
  SourceOccurrence,
  SourceRecord
} from '../types/domain';
import {
  auditDatasetPersistence,
  DatasetPersistenceAuditError,
  type DatasetPersistenceAudit,
  type DatasetPersistenceMetadata
} from './datasetPersistenceAudit';

export interface ContentRepository {
  getQuestions(): Promise<Question[]>;
  getMaterials(): Promise<Material[]>;
  getSources(): Promise<SourceRecord[]>;
  getSourceOccurrences(): Promise<SourceOccurrence[]>;
  getMedia(): Promise<MediaRecord[]>;
  getMediaBlob(mediaId: string): Promise<Blob | undefined>;
  putMediaBlob(record: MediaBlobRecord): Promise<void>;
  replaceDataset(
    input: DatasetInput,
    metadata?: Partial<DatasetPersistenceMetadata>
  ): Promise<DatasetPersistenceAudit>;
  replaceValidatedDataset(
    dataset: Dataset,
    metadata?: Partial<DatasetPersistenceMetadata>
  ): Promise<DatasetPersistenceAudit>;
  replaceVerifiedPublicDataset(
    dataset: Dataset,
    metadata?: Partial<DatasetPersistenceMetadata>
  ): Promise<DatasetPersistenceAudit>;
}

export class DexieContentRepository implements ContentRepository {
  async getQuestions(): Promise<Question[]> {
    return db.questions.toArray();
  }

  async getMaterials(): Promise<Material[]> {
    return db.materials.toArray();
  }

  async getSources(): Promise<SourceRecord[]> {
    return db.sources.toArray();
  }

  async getSourceOccurrences(): Promise<SourceOccurrence[]> {
    return db.sourceOccurrences.toArray();
  }

  async getMedia(): Promise<MediaRecord[]> {
    return db.media.toArray();
  }

  async getMediaBlob(mediaId: string): Promise<Blob | undefined> {
    return (await db.mediaBlobs.get(mediaId))?.blob;
  }

  async putMediaBlob(record: MediaBlobRecord): Promise<void> {
    const media = await db.media.get(record.media_id);
    if (!media) throw new Error(`MEDIA metadataが存在しません: ${record.media_id}`);
    await db.mediaBlobs.put(record);
  }

  async replaceDataset(
    input: DatasetInput,
    metadata: Partial<DatasetPersistenceMetadata> = {}
  ): Promise<DatasetPersistenceAudit> {
    return this.replaceValidatedDataset(datasetSchema.parse(input), metadata);
  }

  async replaceValidatedDataset(
    dataset: Dataset,
    metadata: Partial<DatasetPersistenceMetadata> = {}
  ): Promise<DatasetPersistenceAudit> {
    const expectedMetadata = normalizeMetadata(metadata);
    return db.transaction(
      'rw',
      [
        db.questions,
        db.materials,
        db.sources,
        db.sourceOccurrences,
        db.media,
        db.mediaBlobs,
        db.meta
      ],
      async () => {
        await replaceStoredContent(dataset, expectedMetadata);

        const [
          questions,
          materials,
          sources,
          sourceOccurrences,
          media,
          datasetVersion,
          schemaVersion,
          explanationTemplateVersion,
          formalDataSpecVersion
        ] = await Promise.all([
          db.questions.toArray(),
          db.materials.toArray(),
          db.sources.toArray(),
          db.sourceOccurrences.toArray(),
          db.media.toArray(),
          db.meta.get('datasetVersion'),
          db.meta.get('schemaVersion'),
          db.meta.get('explanationTemplateVersion'),
          db.meta.get('formalDataSpecVersion')
        ]);

        return auditDatasetPersistence(
          dataset,
          {
            questions,
            materials,
            sources,
            sourceOccurrences,
            media,
            meta: {
              ...(datasetVersion?.value === undefined ? {} : { datasetVersion: datasetVersion.value }),
              ...(schemaVersion?.value === undefined ? {} : { schemaVersion: schemaVersion.value }),
              ...(explanationTemplateVersion?.value === undefined
                ? {}
                : { explanationTemplateVersion: explanationTemplateVersion.value }),
              ...(formalDataSpecVersion?.value === undefined
                ? {}
                : { formalDataSpecVersion: formalDataSpecVersion.value })
            }
          },
          expectedMetadata
        );
      }
    );
  }

  async replaceVerifiedPublicDataset(
    dataset: Dataset,
    metadata: Partial<DatasetPersistenceMetadata> = {}
  ): Promise<DatasetPersistenceAudit> {
    const expectedMetadata = normalizeMetadata(metadata);
    return db.transaction(
      'rw',
      [
        db.questions,
        db.materials,
        db.sources,
        db.sourceOccurrences,
        db.media,
        db.mediaBlobs,
        db.meta
      ],
      async () => {
        await replaceStoredContent(dataset, expectedMetadata);

        const [
          questionCount,
          materialCount,
          sourceCount,
          sourceOccurrenceCount,
          mediaCount,
          datasetVersion,
          schemaVersion,
          explanationTemplateVersion,
          formalDataSpecVersion
        ] = await Promise.all([
          db.questions.count(),
          db.materials.count(),
          db.sources.count(),
          db.sourceOccurrences.count(),
          db.media.count(),
          db.meta.get('datasetVersion'),
          db.meta.get('schemaVersion'),
          db.meta.get('explanationTemplateVersion'),
          db.meta.get('formalDataSpecVersion')
        ]);

        const issues: string[] = [];
        compareCount('questions', dataset.questions.length, questionCount, issues);
        compareCount('materials', dataset.materials.length, materialCount, issues);
        compareCount('sources', dataset.sources.length, sourceCount, issues);
        compareCount(
          'sourceOccurrences',
          dataset.sourceOccurrences.length,
          sourceOccurrenceCount,
          issues
        );
        compareCount('media', dataset.media.length, mediaCount, issues);
        compareMeta('datasetVersion', dataset.datasetVersion, datasetVersion?.value, issues);
        compareMeta('schemaVersion', dataset.schemaVersion, schemaVersion?.value, issues);
        compareMeta(
          'explanationTemplateVersion',
          expectedMetadata.explanationTemplateVersion,
          explanationTemplateVersion?.value,
          issues
        );
        compareMeta(
          'formalDataSpecVersion',
          expectedMetadata.formalDataSpecVersion,
          formalDataSpecVersion?.value,
          issues
        );

        if (issues.length > 0) throw new DatasetPersistenceAuditError(issues);

        return {
          status: 'pass',
          questionCount,
          materialCount,
          sourceCount,
          sourceOccurrenceCount,
          mediaCount,
          verifiedQuestionCount: questionCount,
          verifiedChoiceAnswerCount: dataset.questions.filter(
            (question) => 'correctChoiceIndexes' in question
          ).length,
          verifiedExplanationCount: dataset.questions.filter(
            (question) =>
              Boolean(question.explanation.answer) &&
              Boolean(question.explanation.question_intent) &&
              Boolean(question.explanation.reasoning) &&
              Boolean(question.explanation.key_points) &&
              Boolean(question.explanation.references)
          ).length,
          verifiedSourceOccurrenceCount: sourceOccurrenceCount
        };
      }
    );
  }
}

function normalizeMetadata(
  metadata: Partial<DatasetPersistenceMetadata>
): DatasetPersistenceMetadata {
  return {
    explanationTemplateVersion: metadata.explanationTemplateVersion ?? '1.0',
    formalDataSpecVersion: metadata.formalDataSpecVersion ?? '1.1'
  };
}

async function replaceStoredContent(
  dataset: Dataset,
  metadata: DatasetPersistenceMetadata
): Promise<void> {
  await Promise.all([
    db.questions.clear(),
    db.materials.clear(),
    db.sources.clear(),
    db.sourceOccurrences.clear(),
    db.media.clear(),
    db.mediaBlobs.clear()
  ]);
  await db.questions.bulkPut(dataset.questions as Question[]);
  await db.materials.bulkPut(dataset.materials);
  await db.sources.bulkPut(dataset.sources as SourceRecord[]);
  await db.sourceOccurrences.bulkPut(dataset.sourceOccurrences as SourceOccurrence[]);
  await db.media.bulkPut(dataset.media as MediaRecord[]);
  await db.meta.put({ key: 'datasetVersion', value: dataset.datasetVersion });
  await db.meta.put({ key: 'schemaVersion', value: dataset.schemaVersion });
  await db.meta.put({
    key: 'explanationTemplateVersion',
    value: metadata.explanationTemplateVersion
  });
  await db.meta.put({
    key: 'formalDataSpecVersion',
    value: metadata.formalDataSpecVersion
  });
}

function compareCount(label: string, expected: number, actual: number, issues: string[]): void {
  if (expected !== actual) issues.push(`${label}: 件数不一致 expected=${expected} actual=${actual}`);
}

function compareMeta(
  label: string,
  expected: string,
  actual: string | undefined,
  issues: string[]
): void {
  if (expected !== actual) issues.push(`meta.${label}: expected=${expected} actual=${actual ?? 'missing'}`);
}

export const contentRepository = new DexieContentRepository();