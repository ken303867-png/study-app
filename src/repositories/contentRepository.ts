import { db } from '../db/database';
import { datasetSchema, type DatasetInput } from '../schemas/contentSchemas';
import type { Material, Question } from '../types/domain';

export interface ContentRepository {
  getQuestions(): Promise<Question[]>;
  getMaterials(): Promise<Material[]>;
  replaceDataset(input: DatasetInput): Promise<void>;
}

export class DexieContentRepository implements ContentRepository {
  async getQuestions(): Promise<Question[]> {
    return db.questions.toArray();
  }

  async getMaterials(): Promise<Material[]> {
    return db.materials.toArray();
  }

  async replaceDataset(input: DatasetInput): Promise<void> {
    const dataset = datasetSchema.parse(input);
    await db.transaction('rw', db.questions, db.materials, db.meta, async () => {
      await db.questions.clear();
      await db.materials.clear();
      await db.questions.bulkPut(dataset.questions as Question[]);
      await db.materials.bulkPut(dataset.materials as Material[]);
      await db.meta.put({ key: 'datasetVersion', value: dataset.datasetVersion });
      await db.meta.put({ key: 'schemaVersion', value: dataset.schemaVersion });
    });
  }
}

export const contentRepository = new DexieContentRepository();
