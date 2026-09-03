import { db } from '../db/database';
import type { ExamSession } from '../types/domain';

export interface ExamSessionRepositoryContract {
  save(session: ExamSession): Promise<ExamSession>;
  getAll(): Promise<ExamSession[]>;
}

export class ExamSessionRepository implements ExamSessionRepositoryContract {
  async save(session: ExamSession): Promise<ExamSession> {
    await db.examSessions.put(session);
    return session;
  }

  async getAll(): Promise<ExamSession[]> {
    return db.examSessions.orderBy('completedAt').reverse().toArray();
  }
}

export const examSessionRepository = new ExamSessionRepository();
