import { db } from '../db/database';
import type { LearningHistory, LearningResult } from '../types/domain';

export interface LearningRepositoryContract {
  getAll(): Promise<LearningHistory[]>;
  get(questionId: string): Promise<LearningHistory>;
  recordResult(questionId: string, result: LearningResult): Promise<LearningHistory>;
  toggleFavorite(questionId: string): Promise<LearningHistory>;
  toggleNeedsReview(questionId: string): Promise<LearningHistory>;
  resetProgress(questionId: string): Promise<LearningHistory>;
}

export class LearningRepository implements LearningRepositoryContract {
  async getAll(): Promise<LearningHistory[]> {
    return (await db.learningHistory.toArray()).map(normalizeHistory);
  }

  async get(questionId: string): Promise<LearningHistory> {
    return normalizeHistory((await db.learningHistory.get(questionId)) ?? emptyHistory(questionId));
  }

  async recordResult(questionId: string, result: LearningResult): Promise<LearningHistory> {
    return db.transaction('rw', db.learningHistory, async () => {
      const current = await this.get(questionId);
      const next: LearningHistory = {
        ...current,
        attempts: current.attempts + 1,
        correctCount: current.correctCount + (result === 'correct' ? 1 : 0),
        incorrectCount: current.incorrectCount + (result === 'incorrect' ? 1 : 0),
        uncertainCount: current.uncertainCount + (result === 'uncertain' ? 1 : 0),
        consecutiveCorrect: result === 'correct' ? current.consecutiveCorrect + 1 : 0,
        lastResult: result,
        lastAnsweredAt: new Date().toISOString(),
        needsReview: result === 'correct' ? (current.needsReview ?? false) : true
      };
      await db.learningHistory.put(next);
      return next;
    });
  }

  async toggleFavorite(questionId: string): Promise<LearningHistory> {
    return db.transaction('rw', db.learningHistory, async () => {
      const current = await this.get(questionId);
      const next: LearningHistory = { ...current, favorite: !current.favorite };
      await db.learningHistory.put(next);
      return next;
    });
  }

  async toggleNeedsReview(questionId: string): Promise<LearningHistory> {
    return db.transaction('rw', db.learningHistory, async () => {
      const current = await this.get(questionId);
      const next: LearningHistory = {
        ...current,
        needsReview: !(current.needsReview ?? false)
      };
      await db.learningHistory.put(next);
      return next;
    });
  }

  async resetProgress(questionId: string): Promise<LearningHistory> {
    return db.transaction('rw', db.learningHistory, async () => {
      const current = await this.get(questionId);
      const next: LearningHistory = {
        ...emptyHistory(questionId),
        favorite: current.favorite,
        needsReview: current.needsReview ?? false
      };
      await db.learningHistory.put(next);
      return next;
    });
  }

  async record(questionId: string, result: LearningResult): Promise<LearningHistory> {
    return this.recordResult(questionId, result);
  }
}

export function emptyHistory(questionId: string): LearningHistory {
  return {
    questionId,
    attempts: 0,
    correctCount: 0,
    incorrectCount: 0,
    uncertainCount: 0,
    consecutiveCorrect: 0,
    lastResult: null,
    lastAnsweredAt: null,
    favorite: false,
    needsReview: false
  };
}

function normalizeHistory(history: LearningHistory): LearningHistory {
  return {
    ...history,
    needsReview: history.needsReview ?? false
  };
}

export const learningRepository = new LearningRepository();
