import { datasetSchema, type Dataset } from '../schemas/contentSchemas';
import {
  canonicalMasterExportSchema,
  type CanonicalMasterExportInput
} from '../schemas/masterDataSchemas';
import type {
  ChoiceExplanation,
  MediaRecord,
  Question,
  SourceOccurrence,
  SourceRecord,
  SourceType
} from '../types/domain';

export class MasterConversionError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Canonical Master → Delivery変換に失敗しました。\n${issues.join('\n')}`);
    this.name = 'MasterConversionError';
    this.issues = issues;
  }
}

export function convertMasterToDelivery(input: CanonicalMasterExportInput): Dataset {
  const master = canonicalMasterExportSchema.parse(input);
  const issues: string[] = [];

  assertUnique(
    master.sheets.QUESTIONS.map((row) => row.canonical_question_id),
    'QUESTIONS.canonical_question_id',
    issues
  );
  assertUnique(
    master.sheets.SOURCES.map((row) => row.source_id),
    'SOURCES.source_id',
    issues
  );
  assertUnique(
    master.sheets.SOURCE_OCCURRENCES.map((row) => row.source_occurrence_id),
    'SOURCE_OCCURRENCES.source_occurrence_id',
    issues
  );
  assertUnique(
    master.sheets.MEDIA.map((row) => row.media_id),
    'MEDIA.media_id',
    issues
  );

  const sourceMap = new Map(master.sheets.SOURCES.map((source) => [source.source_id, source]));
  const qaRowsByQuestion = groupBy(master.sheets.QA_LEDGER, (row) => row.canonical_question_id);
  const explanationRowsByQuestion = groupBy(
    master.sheets.EXPLANATIONS,
    (row) => row.canonical_question_id
  );
  const choicesByQuestion = groupBy(master.sheets.CHOICES, (row) => row.canonical_question_id);
  const choiceExplanationsByQuestion = groupBy(
    master.sheets.CHOICE_EXPLANATIONS,
    (row) => row.canonical_question_id
  );
  const occurrencesByQuestion = groupBy(
    master.sheets.SOURCE_OCCURRENCES,
    (row) => row.canonical_question_id
  );
  const taxonomyKeys = new Set(
    master.sheets.TAXONOMY.map((row) => taxonomyKey(row.subject, row.unit, row.topic))
  );

  const adoptedQuestions = master.sheets.QUESTIONS.filter((row) => row.record_status === 'adopted');
  if (adoptedQuestions.length === 0) {
    issues.push('QUESTIONSにrecord_status=adoptedの問題が1件もありません。');
  }

  const deliveryQuestions: Question[] = [];

  for (const row of adoptedQuestions) {
    const questionId = row.canonical_question_id;
    const qaRows = qaRowsByQuestion.get(questionId) ?? [];
    if (qaRows.length !== 1) {
      issues.push(`${questionId}: QA_LEDGERは1行必要です。現在${qaRows.length}行です。`);
    } else if (qaRows[0]?.final_qa !== 'pass') {
      issues.push(`${questionId}: adopted問題はfinal_qa=passでなければDeliveryへ出力できません。`);
    }

    if (!taxonomyKeys.has(taxonomyKey(row.subject, row.unit, row.topic))) {
      issues.push(`${questionId}: TAXONOMYに subject/unit/topic の完全一致行がありません。`);
    }

    const primarySource = sourceMap.get(row.source_id);
    if (!primarySource) {
      issues.push(`${questionId}: source_id=${row.source_id} がSOURCESに存在しません。`);
      continue;
    }

    const occurrences = occurrencesByQuestion.get(questionId) ?? [];
    if (occurrences.length === 0) {
      issues.push(`${questionId}: SOURCE_OCCURRENCESが1件もありません。`);
    }
    for (const occurrence of occurrences) {
      if (!sourceMap.has(occurrence.source_id)) {
        issues.push(`${questionId}: occurrence ${occurrence.source_occurrence_id} のsource_idがSOURCESに存在しません。`);
      }
    }

    const explanationRows = explanationRowsByQuestion.get(questionId) ?? [];
    if (explanationRows.length !== 1) {
      issues.push(`${questionId}: EXPLANATIONSは1行必要です。現在${explanationRows.length}行です。`);
      continue;
    }
    const explanationRow = explanationRows[0];
    if (!explanationRow) continue;

    if (row.related_material_ids.length > 0) {
      issues.push(
        `${questionId}: related_material_idsは資料Master変換工程が未接続のため、現工程では空配列にしてください。`
      );
    }

    const masterChoices = [...(choicesByQuestion.get(questionId) ?? [])].sort(
      (a, b) => a.choice_order - b.choice_order
    );
    const masterChoiceExplanations = [...(choiceExplanationsByQuestion.get(questionId) ?? [])].sort(
      (a, b) => a.display_order - b.display_order
    );

    const choiceExplanations: ChoiceExplanation[] = masterChoiceExplanations.map((choice) => ({
      target_key: choice.choice_key,
      display_order: choice.display_order,
      judgement: choice.final_judgement,
      reason: choice.reason,
      correction_condition: choice.correction_condition,
      mapping_provenance: choice.mapping_provenance,
      ...(choice.corrected_statement === undefined
        ? {}
        : { corrected_statement: choice.corrected_statement }),
      ...(choice.differential_notes === undefined
        ? {}
        : { differential_notes: choice.differential_notes }),
      ...(choice.clinical_caution === undefined
        ? {}
        : { clinical_caution: choice.clinical_caution })
    }));

    const formalExplanation = {
      answer: explanationRow.answer_summary,
      question_intent: explanationRow.question_intent,
      reasoning: explanationRow.reasoning,
      choice_explanations: choiceExplanations,
      key_points: explanationRow.key_points,
      references: explanationRow.references,
      ...(explanationRow.surrounding_knowledge === undefined
        ? {}
        : { surrounding_knowledge: explanationRow.surrounding_knowledge }),
      ...(explanationRow.clinical_notes === undefined
        ? {}
        : { clinical_notes: explanationRow.clinical_notes }),
      ...(explanationRow.laws_guidelines === undefined
        ? {}
        : { laws_guidelines: explanationRow.laws_guidelines }),
      ...(explanationRow.mnemonic === undefined ? {} : { mnemonic: explanationRow.mnemonic }),
      ...(explanationRow.source_explanation_raw === undefined
        ? {}
        : { source_explanation_raw: explanationRow.source_explanation_raw })
    };

    const baseQuestion = {
      id: questionId,
      subject: row.subject,
      unit: row.unit,
      topic: row.topic,
      sourceType: mapSourceGroupToType(primarySource.source_group),
      sourceLabel: primarySource.title,
      importance: row.importance,
      prompt: row.canonical_prompt,
      explanation: formalExplanation,
      relatedMaterialIds: [],
      tags: row.tags,
      revision: row.revision
    };

    if (['single-choice', 'multiple-choice', 'true-false'].includes(row.question_format)) {
      if (masterChoices.length < 2) {
        issues.push(`${questionId}: 選択式問題にはCHOICESが2件以上必要です。`);
      }
      validateChoiceRows(questionId, masterChoices, masterChoiceExplanations, issues);

      const correctChoiceIndexes = masterChoices
        .map((choice, index) => (choice.is_final_correct ? index : -1))
        .filter((index) => index >= 0);

      deliveryQuestions.push({
        ...baseQuestion,
        questionFormat: row.question_format as 'single-choice' | 'multiple-choice' | 'true-false',
        choices: masterChoices.map((choice) => choice.canonical_choice_text),
        correctChoiceIndexes
      });
    } else {
      if (masterChoices.length > 0 || masterChoiceExplanations.length > 0) {
        issues.push(`${questionId}: fill-blank/short-answerにはCHOICES/CHOICE_EXPLANATIONSを登録しません。`);
      }
      const acceptedAnswers = row.accepted_answers?.length
        ? row.accepted_answers
        : [row.final_answer];
      deliveryQuestions.push({
        ...baseQuestion,
        questionFormat: row.question_format as 'fill-blank' | 'short-answer',
        acceptedAnswers
      });
    }
  }

  const adoptedIds = new Set(adoptedQuestions.map((row) => row.canonical_question_id));
  const deliveryOccurrences: SourceOccurrence[] = master.sheets.SOURCE_OCCURRENCES.filter((row) =>
    adoptedIds.has(row.canonical_question_id)
  ).map((row) => ({
    source_occurrence_id: row.source_occurrence_id,
    canonical_question_id: row.canonical_question_id,
    source_id: row.source_id,
    source_occurrence_order: row.source_occurrence_order,
    ...(row.source_set_id === undefined ? {} : { source_set_id: row.source_set_id }),
    ...(row.source_set_label === undefined ? {} : { source_set_label: row.source_set_label }),
    ...(row.source_set_order === undefined ? {} : { source_set_order: row.source_set_order }),
    ...(row.source_question_no === undefined ? {} : { source_question_no: row.source_question_no }),
    ...(row.source_question_label === undefined
      ? {}
      : { source_question_label: row.source_question_label }),
    ...(row.section_type === undefined ? {} : { section_type: row.section_type }),
    ...(row.exam_label === undefined ? {} : { exam_label: row.exam_label }),
    ...(row.source_year === undefined ? {} : { source_year: row.source_year }),
    ...(row.source_page_start === undefined ? {} : { source_page_start: row.source_page_start }),
    ...(row.source_page_end === undefined ? {} : { source_page_end: row.source_page_end }),
    ...(row.source_location === undefined ? {} : { source_location: row.source_location }),
    ...(row.source_answer === undefined ? {} : { source_answer: row.source_answer }),
    ...(row.source_prompt_snapshot === undefined
      ? {}
      : { source_prompt_snapshot: row.source_prompt_snapshot }),
    ...(row.notes === undefined ? {} : { notes: row.notes })
  }));

  const deliveryMedia: MediaRecord[] = master.sheets.MEDIA.filter((row) =>
    adoptedIds.has(row.canonical_question_id)
  ).map((row) => ({
    media_id: row.media_id,
    canonical_question_id: row.canonical_question_id,
    media_type: row.media_type,
    placement_after: row.placement_after,
    display_order: row.display_order,
    file_name_or_blob_ref: row.file_name_or_blob_ref,
    alt_text: row.alt_text,
    revision: row.revision,
    ...(row.target_key === undefined ? {} : { target_key: row.target_key }),
    ...(row.caption === undefined ? {} : { caption: row.caption }),
    ...(row.source_id === undefined ? {} : { source_id: row.source_id }),
    ...(row.source_page === undefined ? {} : { source_page: row.source_page })
  }));

  const referencedSourceIds = new Set<string>();
  adoptedQuestions.forEach((row) => referencedSourceIds.add(row.source_id));
  deliveryOccurrences.forEach((row) => referencedSourceIds.add(row.source_id));
  deliveryMedia.forEach((row) => {
    if (row.source_id) referencedSourceIds.add(row.source_id);
  });

  const deliverySources: SourceRecord[] = master.sheets.SOURCES.filter((row) =>
    referencedSourceIds.has(row.source_id)
  ).map((row) => ({
    source_id: row.source_id,
    source_group: row.source_group,
    title: row.title,
    answer_authority: row.answer_authority,
    ...(row.edition_year === undefined ? {} : { edition_year: row.edition_year }),
    ...(row.publisher_org === undefined ? {} : { publisher_org: row.publisher_org }),
    ...(row.source_location === undefined ? {} : { source_location: row.source_location }),
    ...(row.notes === undefined ? {} : { notes: row.notes })
  }));

  if (issues.length > 0) throw new MasterConversionError(issues);

  return datasetSchema.parse({
    datasetVersion: master.deliveryDatasetVersion,
    schemaVersion: '0.5',
    questions: deliveryQuestions,
    materials: [],
    sources: deliverySources,
    sourceOccurrences: deliveryOccurrences,
    media: deliveryMedia
  });
}

function validateChoiceRows(
  questionId: string,
  choices: Array<{
    choice_key: string;
    choice_order: number;
    is_final_correct: boolean;
  }>,
  explanations: Array<{
    choice_key: string;
    display_order: number;
    final_judgement: 'correct' | 'incorrect';
  }>,
  issues: string[]
) {
  assertUnique(
    choices.map((choice) => choice.choice_key),
    `${questionId} CHOICES.choice_key`,
    issues
  );
  assertUnique(
    choices.map((choice) => String(choice.choice_order)),
    `${questionId} CHOICES.choice_order`,
    issues
  );

  if (choices.length !== explanations.length) {
    issues.push(
      `${questionId}: CHOICES(${choices.length})とCHOICE_EXPLANATIONS(${explanations.length})の件数が一致しません。`
    );
  }

  const explanationMap = new Map(explanations.map((row) => [row.choice_key, row]));
  choices.forEach((choice, index) => {
    if (choice.choice_order !== index + 1) {
      issues.push(`${questionId}: choice_orderは1から連続させてください。`);
    }
    const explanation = explanationMap.get(choice.choice_key);
    if (!explanation) {
      issues.push(`${questionId}: choice_key=${choice.choice_key} の選択肢解説がありません。`);
      return;
    }
    if (explanation.display_order !== choice.choice_order) {
      issues.push(`${questionId}: choice_key=${choice.choice_key} の表示順がCHOICESと一致しません。`);
    }
    const expectedJudgement = choice.is_final_correct ? 'correct' : 'incorrect';
    if (explanation.final_judgement !== expectedJudgement) {
      issues.push(`${questionId}: choice_key=${choice.choice_key} の最終正誤と解説判定が不一致です。`);
    }
  });
}

function assertUnique(values: string[], label: string, issues: string[]) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) issues.push(`${label} が重複しています: ${value}`);
    seen.add(value);
  }
}

function groupBy<T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const values = map.get(key) ?? [];
    values.push(row);
    map.set(key, values);
  }
  return map;
}

function taxonomyKey(subject: string, unit: string, topic: string) {
  return `${subject}\u0000${unit}\u0000${topic}`;
}

export function mapSourceGroupToType(sourceGroup: string): SourceType {
  const normalized = sourceGroup.trim().toLowerCase();
  if (normalized.includes('日本看護協会') || normalized.includes('jna')) {
    return 'japan-nursing-association';
  }
  if (normalized.includes('s-que') || normalized.includes('sque')) return 's-que';
  if (normalized.includes('学研') || normalized.includes('gakken')) return 'gakken';
  if (
    normalized.includes('過去問') ||
    normalized.includes('認定審査') ||
    normalized.includes('exam')
  ) {
    return 'past-exam';
  }
  if (normalized.includes('予想') || normalized.includes('predicted')) return 'predicted';
  if (normalized.includes('ガイドライン') || normalized.includes('guideline')) return 'guideline';
  if (normalized.includes('テキスト') || normalized.includes('textbook')) return 'textbook';
  return 'other';
}
