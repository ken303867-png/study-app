import type { ExamSubjectResult, Question } from '../types/domain';
import {
  canSubmitPracticeAnswer,
  evaluatePracticeAnswer,
  type PracticeAnswer,
  type PracticeEvaluation
} from './practiceEngine';

export type ExamOutcomeStatus = 'correct' | 'incorrect' | 'unanswered';

export interface ExamQuestionOutcome {
  question: Question;
  answer?: PracticeAnswer;
  evaluation?: PracticeEvaluation;
  status: ExamOutcomeStatus;
}

export interface ExamResultSummary {
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number;
  subjectResults: ExamSubjectResult[];
  outcomes: ExamQuestionOutcome[];
  incorrectQuestionIds: string[];
  unansweredQuestionIds: string[];
}

export function summarizeExamResult(
  questions: readonly Question[],
  answers: ReadonlyMap<string, PracticeAnswer>
): ExamResultSummary {
  const outcomes = questions.map((question): ExamQuestionOutcome => {
    const answer = answers.get(question.id);
    if (!answer || !canSubmitPracticeAnswer(question, answer)) {
      return { question, status: 'unanswered' };
    }
    const evaluation = evaluatePracticeAnswer(question, answer);
    return {
      question,
      answer,
      evaluation,
      status: evaluation.correct ? 'correct' : 'incorrect'
    };
  });

  const correctCount = outcomes.filter((outcome) => outcome.status === 'correct').length;
  const incorrectCount = outcomes.filter((outcome) => outcome.status === 'incorrect').length;
  const unansweredCount = outcomes.filter((outcome) => outcome.status === 'unanswered').length;
  const answeredCount = correctCount + incorrectCount;
  const totalQuestions = outcomes.length;
  const accuracy = totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100);

  return {
    totalQuestions,
    answeredCount,
    correctCount,
    incorrectCount,
    unansweredCount,
    accuracy,
    subjectResults: summarizeSubjects(outcomes),
    outcomes,
    incorrectQuestionIds: outcomes
      .filter((outcome) => outcome.status === 'incorrect')
      .map((outcome) => outcome.question.id),
    unansweredQuestionIds: outcomes
      .filter((outcome) => outcome.status === 'unanswered')
      .map((outcome) => outcome.question.id)
  };
}

function summarizeSubjects(outcomes: readonly ExamQuestionOutcome[]): ExamSubjectResult[] {
  const bySubject = new Map<string, ExamQuestionOutcome[]>();
  for (const outcome of outcomes) {
    const current = bySubject.get(outcome.question.subject) ?? [];
    current.push(outcome);
    bySubject.set(outcome.question.subject, current);
  }

  return [...bySubject.entries()]
    .map(([subject, subjectOutcomes]) => {
      const correctCount = subjectOutcomes.filter((outcome) => outcome.status === 'correct').length;
      const incorrectCount = subjectOutcomes.filter((outcome) => outcome.status === 'incorrect').length;
      const unansweredCount = subjectOutcomes.filter((outcome) => outcome.status === 'unanswered').length;
      const totalQuestions = subjectOutcomes.length;
      return {
        subject,
        totalQuestions,
        answeredCount: correctCount + incorrectCount,
        correctCount,
        incorrectCount,
        unansweredCount,
        accuracy: totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100)
      };
    })
    .sort((left, right) => left.subject.localeCompare(right.subject, 'ja'));
}

export function formatExamTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}
