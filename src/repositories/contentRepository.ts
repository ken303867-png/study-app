import { db } from '../db/database';
import { datasetSchema, type DatasetInput } from '../schemas/contentSchemas';
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
    const dataset = datasetSchema.parse(input);
    const expectedMetadata: DatasetPersistenceMetadata = {
      explanationTemplateVersion: metadata.explanationTemplateVersion ?? '1.0',
      formalDataSpecVersion: metadata.formalDataSpecVersion ?? '1.1'
    };
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
          value: expectedMetadata.explanationTemplateVersion
        });
        await db.meta.put({
          key: 'formalDataSpecVersion',
          value: expectedMetadata.formalDataSpecVersion
        });

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
}

export const contentRepository = new DexieContentRepository();
