import Dexie, { type EntityTable } from 'dexie';
import type { AppMeta, LearningHistory, Material, MaterialHistory, Question } from '../types/domain';

export class StudyDatabase extends Dexie {
  questions!: EntityTable<Question, 'id'>;
  materials!: EntityTable<Material, 'id'>;
  learningHistory!: EntityTable<LearningHistory, 'questionId'>;
  materialHistory!: EntityTable<MaterialHistory, 'materialId'>;
  meta!: EntityTable<AppMeta, 'key'>;

  constructor() {
    super('study-app');
    this.version(1).stores({
      questions: 'id, subject, unit, sourceType, questionFormat, importance, revision, *tags',
      materials: 'id, subject, unit, importance, revision, *tags',
      learningHistory: 'questionId, lastResult, lastAnsweredAt, favorite',
      materialHistory: 'materialId, lastViewedAt, favorite, viewed',
      meta: 'key'
    });
  }
}

export const db = new StudyDatabase();
