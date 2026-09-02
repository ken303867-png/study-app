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

export interface ContentRepository {
  getQuestions(): Promise<Question[]>;
  getMaterials(): Promise<Material[]>;
  getSources(): Promise<SourceRecord[]>;
  getSourceOccurrences(): Promise<SourceOccurrence[]>;
  getMedia(): Promise<MediaRecord[]>;
  getMediaBlob(mediaId: string): Promise<Blob | undefined>;
  putMediaBlob(record: MediaBlobRecord): Promise<void>;
  replaceDataset(input: DatasetInput): Promise<void>;
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

  async replaceDataset(input: DatasetInput): Promise<void> {
    const dataset = datasetSchema.parse(input);
    await db.transaction(
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
        await db.meta.put({ key: 'explanationTemplateVersion', value: '1.0' });
        await db.meta.put({ key: 'formalDataSpecVersion', value: '1.1' });
      }
    );
  }
}

export const contentRepository = new DexieContentRepository();
