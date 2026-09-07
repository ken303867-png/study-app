import { z } from 'zod';
import { db } from '../db/database';
import type { ExamSession, LearningHistory, MaterialHistory } from '../types/domain';

export const LEARNING_STATE_BACKUP_FORMAT = 'study-app-learning-state-backup';
export const LEARNING_STATE_BACKUP_VERSION = 1;

const learningResultSchema = z.enum(['correct', 'incorrect', 'uncertain']);

const learningHistorySchema = z
  .object({
    questionId: z.string().min(1),
    attempts: z.number().int().nonnegative(),
    correctCount: z.number().int().nonnegative(),
    incorrectCount: z.number().int().nonnegative(),
    uncertainCount: z.number().int().nonnegative(),
    consecutiveCorrect: z.number().int().nonnegative(),
    lastResult: learningResultSchema.nullable(),
    lastAnsweredAt: z.string().datetime().nullable(),
    favorite: z.boolean(),
    needsReview: z.boolean().default(false)
  })
  .strict()
  .superRefine((value, ctx) => {
    const counted = value.correctCount + value.incorrectCount + value.uncertainCount;
    if (counted !== value.attempts) {
      ctx.addIssue({
        code: 'custom',
        message: '回答回数と正解・不正解・不確実の合計が一致しません。'
      });
    }
    if (value.consecutiveCorrect > value.correctCount) {
      ctx.addIssue({ code: 'custom', message: '連続正解数が正解数を超えています。' });
    }
    if ((value.attempts === 0) !== (value.lastResult === null)) {
      ctx.addIssue({
        code: 'custom',
        message: '回答回数と直近回答結果の状態が一致しません。'
      });
    }
  });

const materialHistorySchema = z
  .object({
    materialId: z.string().min(1),
    favorite: z.boolean(),
    viewed: z.boolean(),
    lastViewedAt: z.string().datetime().nullable(),
    scrollPosition: z.number().finite().nonnegative()
  })
  .strict();

const examSubjectResultSchema = z
  .object({
    subject: z.string(),
    totalQuestions: z.number().int().nonnegative(),
    answeredCount: z.number().int().nonnegative(),
    correctCount: z.number().int().nonnegative(),
    incorrectCount: z.number().int().nonnegative(),
    unansweredCount: z.number().int().nonnegative(),
    accuracy: z.number().finite().min(0).max(100)
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.answeredCount + value.unansweredCount !== value.totalQuestions) {
      ctx.addIssue({ code: 'custom', message: '科目別の回答数集計が一致しません。' });
    }
    if (value.correctCount + value.incorrectCount !== value.answeredCount) {
      ctx.addIssue({ code: 'custom', message: '科目別の正誤数集計が一致しません。' });
    }
  });

const examSessionSchema = z
  .object({
    id: z.string().min(1),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    timerMinutes: z.number().finite().nonnegative().nullable(),
    elapsedSeconds: z.number().finite().nonnegative(),
    questionIds: z.array(z.string().min(1)),
    totalQuestions: z.number().int().nonnegative(),
    answeredCount: z.number().int().nonnegative(),
    correctCount: z.number().int().nonnegative(),
    incorrectCount: z.number().int().nonnegative(),
    unansweredCount: z.number().int().nonnegative(),
    accuracy: z.number().finite().min(0).max(100),
    subjectResults: z.array(examSubjectResultSchema),
    incorrectQuestionIds: z.array(z.string().min(1)),
    unansweredQuestionIds: z.array(z.string().min(1)),
    completionReason: z.enum(['submitted', 'timeout'])
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.questionIds.length !== value.totalQuestions) {
      ctx.addIssue({ code: 'custom', message: '試験問題ID数と総問題数が一致しません。' });
    }
    if (new Set(value.questionIds).size !== value.questionIds.length) {
      ctx.addIssue({ code: 'custom', message: '試験問題IDが重複しています。' });
    }
    if (value.answeredCount + value.unansweredCount !== value.totalQuestions) {
      ctx.addIssue({ code: 'custom', message: '試験の回答数集計が一致しません。' });
    }
    if (value.correctCount + value.incorrectCount !== value.answeredCount) {
      ctx.addIssue({ code: 'custom', message: '試験の正誤数集計が一致しません。' });
    }
    if (value.incorrectQuestionIds.length !== value.incorrectCount) {
      ctx.addIssue({ code: 'custom', message: '不正解問題ID数が不正解数と一致しません。' });
    }
    if (value.unansweredQuestionIds.length !== value.unansweredCount) {
      ctx.addIssue({ code: 'custom', message: '未回答問題ID数が未回答数と一致しません。' });
    }
    const questionIds = new Set(value.questionIds);
    if (
      value.incorrectQuestionIds.some((id) => !questionIds.has(id)) ||
      value.unansweredQuestionIds.some((id) => !questionIds.has(id))
    ) {
      ctx.addIssue({ code: 'custom', message: '試験結果に問題セット外のIDが含まれています。' });
    }
    const incorrectIds = new Set(value.incorrectQuestionIds);
    if (value.unansweredQuestionIds.some((id) => incorrectIds.has(id))) {
      ctx.addIssue({ code: 'custom', message: '不正解と未回答の問題IDが重複しています。' });
    }
  });

const backupSchema = z
  .object({
    format: z.literal(LEARNING_STATE_BACKUP_FORMAT),
    formatVersion: z.literal(LEARNING_STATE_BACKUP_VERSION),
    exportedAt: z.string().datetime(),
    source: z
      .object({
        deliverySchemaVersion: z.string().nullable(),
        publicDatasetReleaseVersion: z.string().nullable(),
        questionCount: z.number().int().nonnegative(),
        materialCount: z.number().int().nonnegative()
      })
      .strict(),
    counts: z
      .object({
        learningHistory: z.number().int().nonnegative(),
        materialHistory: z.number().int().nonnegative(),
        examSessions: z.number().int().nonnegative()
      })
      .strict(),
    learningHistory: z.array(learningHistorySchema),
    materialHistory: z.array(materialHistorySchema),
    examSessions: z.array(examSessionSchema)
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.counts.learningHistory !== value.learningHistory.length) {
      ctx.addIssue({ code: 'custom', message: '学習履歴の件数メタデータが一致しません。' });
    }
    if (value.counts.materialHistory !== value.materialHistory.length) {
      ctx.addIssue({ code: 'custom', message: '資料履歴の件数メタデータが一致しません。' });
    }
    if (value.counts.examSessions !== value.examSessions.length) {
      ctx.addIssue({ code: 'custom', message: '試験履歴の件数メタデータが一致しません。' });
    }
    ensureUniqueIds(value.learningHistory, (row) => row.questionId, '学習履歴', ctx);
    ensureUniqueIds(value.materialHistory, (row) => row.materialId, '資料履歴', ctx);
    ensureUniqueIds(value.examSessions, (row) => row.id, '試験履歴', ctx);
  });

export type LearningStateBackup = z.infer<typeof backupSchema>;

export interface LearningStateBackupCounts {
  learningHistory: number;
  materialHistory: number;
  examSessions: number;
}

export interface LearningStateExportResult {
  json: string;
  filename: string;
  counts: LearningStateBackupCounts;
}

export interface LearningStateRestoreResult {
  restored: LearningStateBackupCounts;
  skipped: LearningStateBackupCounts;
  exportedAt: string;
  sourceDatasetReleaseVersion: string | null;
}

export class LearningStateBackupError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'LearningStateBackupError';
    this.issues = issues;
  }
}

export async function createLearningStateBackup(): Promise<LearningStateExportResult> {
  await db.open();
  const [learningHistory, materialHistory, examSessions, schemaMeta, releaseMeta, questionCount, materialCount] =
    await Promise.all([
      db.learningHistory.toArray(),
      db.materialHistory.toArray(),
      db.examSessions.toArray(),
      db.meta.get('schemaVersion'),
      db.meta.get('publicDatasetReleaseVersion'),
      db.questions.count(),
      db.materials.count()
    ]);

  const exportedAt = new Date().toISOString();
  const backup = backupSchema.parse({
    format: LEARNING_STATE_BACKUP_FORMAT,
    formatVersion: LEARNING_STATE_BACKUP_VERSION,
    exportedAt,
    source: {
      deliverySchemaVersion: schemaMeta?.value ?? null,
      publicDatasetReleaseVersion: releaseMeta?.value ?? null,
      questionCount,
      materialCount
    },
    counts: {
      learningHistory: learningHistory.length,
      materialHistory: materialHistory.length,
      examSessions: examSessions.length
    },
    learningHistory,
    materialHistory,
    examSessions
  });

  const date = exportedAt.slice(0, 10).replaceAll('-', '');
  return {
    json: `${JSON.stringify(backup, null, 2)}\n`,
    filename: `study-app-learning-state-${date}.json`,
    counts: backup.counts
  };
}

export function parseLearningStateBackup(jsonText: string): LearningStateBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new LearningStateBackupError('バックアップJSONを読み取れません。');
  }

  const result = backupSchema.safeParse(parsed);
  if (!result.success) {
    throw new LearningStateBackupError(
      'Study Appの学習データバックアップとして検証できませんでした。',
      result.error.issues.map((issue) => `${formatIssuePath(issue.path)}${issue.message}`)
    );
  }
  return result.data;
}

export async function restoreLearningStateBackup(jsonText: string): Promise<LearningStateRestoreResult> {
  const backup = parseLearningStateBackup(jsonText);
  await db.open();

  const [schemaMeta, questions, materials] = await Promise.all([
    db.meta.get('schemaVersion'),
    db.questions.toArray(),
    db.materials.toArray()
  ]);
  if (schemaMeta?.value !== '0.5' || questions.length === 0) {
    throw new LearningStateBackupError(
      '現在の問題データが準備できていないため、学習履歴を復元できません。先に問題データを準備してください。'
    );
  }

  const questionIds = new Set(questions.map((question) => question.id));
  const materialIds = new Set(materials.map((material) => material.id));

  const learningHistory = backup.learningHistory.filter((row) => questionIds.has(row.questionId));
  const materialHistory = backup.materialHistory.filter((row) => materialIds.has(row.materialId));
  const examSessions = backup.examSessions.filter((session) =>
    [...session.questionIds, ...session.incorrectQuestionIds, ...session.unansweredQuestionIds].every((id) =>
      questionIds.has(id)
    )
  );

  await db.transaction('rw', db.learningHistory, db.materialHistory, db.examSessions, async () => {
    await Promise.all([
      db.learningHistory.clear(),
      db.materialHistory.clear(),
      db.examSessions.clear()
    ]);
    if (learningHistory.length > 0) await db.learningHistory.bulkPut(learningHistory as LearningHistory[]);
    if (materialHistory.length > 0) await db.materialHistory.bulkPut(materialHistory as MaterialHistory[]);
    if (examSessions.length > 0) await db.examSessions.bulkPut(examSessions as ExamSession[]);
  });

  return {
    restored: {
      learningHistory: learningHistory.length,
      materialHistory: materialHistory.length,
      examSessions: examSessions.length
    },
    skipped: {
      learningHistory: backup.learningHistory.length - learningHistory.length,
      materialHistory: backup.materialHistory.length - materialHistory.length,
      examSessions: backup.examSessions.length - examSessions.length
    },
    exportedAt: backup.exportedAt,
    sourceDatasetReleaseVersion: backup.source.publicDatasetReleaseVersion
  };
}

function ensureUniqueIds<T>(
  rows: T[],
  getId: (row: T) => string,
  label: string,
  ctx: z.RefinementCtx
) {
  const seen = new Set<string>();
  for (const row of rows) {
    const id = getId(row);
    if (seen.has(id)) {
      ctx.addIssue({ code: 'custom', message: `${label}に重複ID「${id}」があります。` });
      return;
    }
    seen.add(id);
  }
}

function formatIssuePath(path: PropertyKey[]) {
  if (path.length === 0) return '';
  return `${path.map(String).join('.')}：`;
}
