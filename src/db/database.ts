import Dexie, { type EntityTable } from 'dexie';
import type {
  AppMeta,
  LearningHistory,
  Material,
  MaterialHistory,
  MediaBlobRecord,
  MediaRecord,
  Question,
  SourceOccurrence,
  SourceRecord
} from '../types/domain';

export class StudyDatabase extends Dexie {
  questions!: EntityTable<Question, 'id'>;
  materials!: EntityTable<Material, 'id'>;
  sources!: EntityTable<SourceRecord, 'source_id'>;
  sourceOccurrences!: EntityTable<SourceOccurrence, 'source_occurrence_id'>;
  media!: EntityTable<MediaRecord, 'media_id'>;
  mediaBlobs!: EntityTable<MediaBlobRecord, 'media_id'>;
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

    this.version(2).stores({
      questions: 'id, subject, unit, sourceType, questionFormat, importance, revision, *tags',
      materials: 'id, subject, unit, importance, revision, *tags',
      sources: 'source_id, source_group, answer_authority',
      sourceOccurrences:
        'source_occurrence_id, canonical_question_id, source_id, source_set_id, source_occurrence_order',
      media: 'media_id, canonical_question_id, media_type, placement_after, display_order, source_id',
      mediaBlobs: 'media_id',
      learningHistory: 'questionId, lastResult, lastAnsweredAt, favorite',
      materialHistory: 'materialId, lastViewedAt, favorite, viewed',
      meta: 'key'
    });
  }
}

export const db = new StudyDatabase();
