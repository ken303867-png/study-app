/**
 * The 510-question predicted30 Delivery v1.7 stores four originally distinct
 * educational fields in one surrounding_knowledge string. Preserve all text,
 * but render each field under its own Japanese heading rather than displaying
 * internal property names to learners.
 */
export interface Predicted30KnowledgeSection {
  key: 'surroundingKnowledge' | 'comparisonText' | 'commonMistakes' | 'correctionConditions';
  title: string;
  text: string;
}

const sectionTitles: Record<Predicted30KnowledgeSection['key'], string> = {
  surroundingKnowledge: '関連する周辺知識',
  comparisonText: '比較・鑑別',
  commonMistakes: '試験で間違いやすいポイント',
  correctionConditions: '正しくなる条件・適用条件'
};

const sectionOrder: Predicted30KnowledgeSection['key'][] = [
  'surroundingKnowledge',
  'comparisonText',
  'commonMistakes',
  'correctionConditions'
];

export function splitPredicted30Knowledge(
  value: string | undefined
): Predicted30KnowledgeSection[] | null {
  if (!value) return null;
  const matches = [...value.matchAll(/^(surroundingKnowledge|comparisonText|commonMistakes|correctionConditions):[ \t]*/gm)];
  if (
    matches.length !== sectionOrder.length ||
    matches.some((match, index) => match[1] !== sectionOrder[index]) ||
    matches[0]?.index !== 0
  ) {
    return null;
  }

  return matches.map((match, index) => {
    const key = match[1] as Predicted30KnowledgeSection['key'];
    const begin = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? value.length;
    return { key, title: sectionTitles[key], text: value.slice(begin, end).trim() };
  });
}
