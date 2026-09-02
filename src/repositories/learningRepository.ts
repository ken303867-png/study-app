import { db } from '../db/database';
import type { LearningHistory, LearningResult } from '../types/domain';

const emptyHistory = (questionId: string): LearningHistory => ({
  questionId,
  attempts: 0,
  correctCount: 0,
  incorrectCount: 0,
  uncertainCount: 0,
  consecutiveCorrect: 0,
  lastResult: null,
  lastAnsweredAt: null,
  favorite: false
});

export class LearningRepository {
  async get(questionId: string): Promise<LearningHistory> {
    return (await db.learningHistory.get(questionId)) ?? emptyHistory(questionId);
  }

  async record(questionId: string, result: LearningResult): Promise<LearningHistory> {
    const current = await this.get(questionId);
    const next: LearningHistory = {
      ...current,
      attempts: current.attempts + 1,
      correctCount: current.correctCount + (result === 'correct' ? 1 : 0),
      incorrectCount: current.incorrectCount + (result === 'incorrect' ? 1 : 0),
      uncertainCount: current.uncertainCount + (result === 'uncertain' ? 1 : 0),
      consecutiveCorrect: result === 'correct' ? current.consecutiveCorrect + 1 : 0,
      lastResult: result,
      lastAnsweredAt: new Date().toISOString()
    };
    await db.learningHistory.put(next);
    return next;
  }
}

export const learningRepository = new LearningRepository();
