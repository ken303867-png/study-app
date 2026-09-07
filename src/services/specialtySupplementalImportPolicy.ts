import type { Dataset } from '../schemas/contentSchemas';
import type { Question } from '../types/domain';

const SPECIALTY_AREA_TAG = 'learning-area:specialty';
const COMMON_AREA_TAG = 'learning-area:common';
const QUESTION_KIND_PREFIX = 'question-kind:';

const SPECIALTY_SUPPLEMENTAL_POLICIES = {
  'specialty-past': {
    questionKind: 'specialty-past',
    sourceType: 'past-exam'
  },
  'specialty-predicted': {
    questionKind: 'specialty-predicted',
    sourceType: 'predicted'
  },
  'specialty-predicted-case': {
    questionKind: 'specialty-predicted-case',
    sourceType: 'predicted'
  }
} as const satisfies Record<
  string,
  {
    questionKind: string;
    sourceType: Question['sourceType'];
  }
>;

export type SpecialtySupplementalKey = keyof typeof SPECIALTY_SUPPLEMENTAL_POLICIES;

export function validateSpecialtySupplementalImport(
  dataset: Dataset,
  supplementalKey: string
): string[] {
  if (!isSpecialtySupplementalKey(supplementalKey)) return [];

  const policy = SPECIALTY_SUPPLEMENTAL_POLICIES[supplementalKey];
  const expectedKindTag = `${QUESTION_KIND_PREFIX}${policy.questionKind}`;
  const issues: string[] = [];

  for (const question of dataset.questions) {
    const kindTags = question.tags.filter((tag) => tag.startsWith(QUESTION_KIND_PREFIX));

    if (!question.tags.includes(SPECIALTY_AREA_TAG)) {
      issues.push(`${question.id}: tag「${SPECIALTY_AREA_TAG}」が必要です。`);
    }
    if (question.tags.includes(COMMON_AREA_TAG)) {
      issues.push(`${question.id}: 専門科目データにtag「${COMMON_AREA_TAG}」は指定できません。`);
    }
    if (kindTags.length !== 1 || kindTags[0] !== expectedKindTag) {
      const actual = kindTags.length > 0 ? kindTags.join(', ') : 'なし';
      issues.push(
        `${question.id}: 問題種類tagは「${expectedKindTag}」を1つだけ指定してください（現在: ${actual}）。`
      );
    }
    if (question.sourceType !== policy.sourceType) {
      issues.push(
        `${question.id}: sourceTypeは「${policy.sourceType}」である必要があります（現在: ${question.sourceType}）。`
      );
    }
  }

  return issues;
}

export function isSpecialtySupplementalKey(value: string): value is SpecialtySupplementalKey {
  return Object.prototype.hasOwnProperty.call(SPECIALTY_SUPPLEMENTAL_POLICIES, value);
}
