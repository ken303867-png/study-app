import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const ROOT = new URL('../', import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL('public/public-data/manifest.json', ROOT), 'utf8')
);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function assert(condition, message) {
  if (!condition) throw new Error(`[public-data QA] ${message}`);
}

function scanStrings(value, path = '$', issues = []) {
  if (typeof value === 'string') {
    if (value.includes('\uFFFD')) issues.push(`${path}: U+FFFD`);
    if (value.includes('\u0000')) issues.push(`${path}: NUL`);
    if (value.includes('\u000c')) issues.push(`${path}: U+000C form feed`);
    return issues;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanStrings(item, `${path}[${index}]`, issues));
    return issues;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) scanStrings(item, `${path}.${key}`, issues);
  }
  return issues;
}

async function readBundle(descriptor) {
  if (descriptor.encoding === 'utf8') {
    assert(descriptor.compression === 'none', 'UTF-8 bundle must be uncompressed');
    const parts = await Promise.all(descriptor.chunks.map((path) =>
      readFile(new URL(`public/public-data/${path}`, ROOT))
    ));
    const combined = Buffer.concat(parts);
    assert(combined.length === descriptor.bytes, `UTF-8 bundle size mismatch: ${combined.length} !== ${descriptor.bytes}`);
    return combined;
  }
  if ('path' in descriptor) {
    return readFile(new URL(`public/public-data/${descriptor.path}`, ROOT));
  }

  assert(Array.isArray(descriptor.chunks) && descriptor.chunks.length > 0, 'chunked bundle has no chunks');
  assert(descriptor.encoding === 'base64', 'chunked bundle encoding must be base64');
  const parts = await Promise.all(
    descriptor.chunks.map((chunkPath) =>
      readFile(new URL(`public/public-data/${chunkPath}`, ROOT), 'utf8')
    )
  );
  const base64Text = parts.join('');
  assert(
    base64Text.length === descriptor.base64Length,
    `chunked base64 length mismatch: ${base64Text.length} !== ${descriptor.base64Length}`
  );
  const bundle = Buffer.from(base64Text, 'base64');
  assert(
    bundle.length === descriptor.compressedBytes,
    `chunked bundle size mismatch: ${bundle.length} !== ${descriptor.compressedBytes}`
  );
  return bundle;
}

function mergePack(bundle, packed) {
  const text = gunzipSync(bundle).toString('utf8');
  const seen = new Set();
  for (const line of text.split('\n').filter(Boolean)) {
    const separator = line.indexOf('\t');
    assert(separator > 0, 'invalid pack line');
    const role = line.slice(0, separator);
    const jsonText = line.slice(separator + 1);
    assert(!seen.has(role), `duplicate role inside one bundle: ${role}`);
    seen.add(role);
    packed.set(role, { jsonText, data: JSON.parse(jsonText) });
  }
}

assert(manifest.schemaVersion === 1, 'manifest schemaVersion must be 1');
assert(manifest.appMinVersion === '0.17.0', 'appMinVersion mismatch');
assert(manifest.expected.questionsTotal === 4061, 'expected total must be 4061');
assert(manifest.expected.materials === 114, 'expected materials must be 114');
assert(manifest.expected.sourceOccurrences === 4061, 'expected sourceOccurrences must be 4061');
assert(manifest.expected.kinds['common-predicted30'] === 510, 'predicted30 expected count must be 510');
assert(manifest.expected.kinds['common-final'] === 300, 'common-final expected count must be 300');

const descriptors = [manifest.bundle, ...(manifest.overlays ?? [])];
assert(descriptors.length === 4, `expected 4 bundles, got ${descriptors.length}`);

const packed = new Map();
for (const descriptor of descriptors) {
  const bundle = await readBundle(descriptor);
  assert(sha256(bundle) === descriptor.sha256, 'bundle SHA-256 mismatch');
  if (descriptor.encoding === 'utf8') {
    assert(descriptor.role === 'common-predicted30', 'unexpected plain UTF-8 dataset role');
    assert(!packed.has(descriptor.role), 'duplicate UTF-8 dataset role');
    const jsonText = bundle.toString('utf8');
    packed.set(descriptor.role, { jsonText, data: JSON.parse(jsonText) });
  } else {
    mergePack(bundle, packed);
  }
}

const ordered = [...manifest.datasets].sort((a, b) => a.order - b.order);
assert(packed.size === ordered.length, `dataset role count mismatch: ${packed.size}`);
for (const descriptor of ordered) {
  const item = packed.get(descriptor.role);
  assert(item, `missing dataset role: ${descriptor.role}`);
  assert(
    sha256(Buffer.from(item.jsonText, 'utf8')) === descriptor.originalSha256,
    `${descriptor.role}: original SHA-256 mismatch`
  );
}

const base = packed.get('common-base')?.data;
const commonCloze = packed.get('common-cloze')?.data;
const specialtyPast = packed.get('specialty-past')?.data;
const specialtyPredicted = packed.get('specialty-predicted')?.data;
const specialtyPredictedCase = packed.get('specialty-predicted-case')?.data;
const commonFinal = packed.get('common-final-2026')?.data;
const predicted30 = packed.get('common-predicted30')?.data;
assert(base && commonCloze && specialtyPast && specialtyPredicted && specialtyPredictedCase && commonFinal && predicted30, 'required roles missing');

assert(base.formalDataSpecVersion === '1.2', 'common-base Formal Data Spec mismatch');
assert(base.sheets.QUESTIONS.length === 726, 'common-base question count mismatch');
assert(base.sheets.MATERIALS.length === 114, 'common-base material count mismatch');
assert(base.sheets.SOURCE_OCCURRENCES.length === 726, 'common-base occurrence count mismatch');

const supplementals = [
  ['common-cloze', commonCloze, 2014, 'common-cloze'],
  ['specialty-past', specialtyPast, 126, 'specialty-past'],
  ['specialty-predicted', specialtyPredicted, 116, 'specialty-predicted'],
  ['specialty-predicted-case', specialtyPredictedCase, 269, 'specialty-predicted-case'],
  ['common-final-2026', commonFinal, 300, 'common-final-2026'],
  ['common-predicted30', predicted30, 510, 'common-predicted30']
];
for (const [role, data, expectedCount, key] of supplementals) {
  assert(data.schemaVersion === '0.5', `${role}: schemaVersion mismatch`);
  assert(data.importMode === 'supplemental-replace', `${role}: importMode mismatch`);
  assert(data.supplementalKey === key, `${role}: supplementalKey mismatch`);
  assert(data.questions.length === expectedCount, `${role}: question count mismatch`);
  assert(data.materials.length === 0, `${role}: supplemental materials must be 0`);
  assert(data.sourceOccurrences.length === expectedCount, `${role}: occurrence count mismatch`);
}

const finalTag = 'supplemental:common-final-2026';
assert(commonFinal.questions.every((q) => q.tags.includes(finalTag)), 'common-final supplemental tag missing');
assert(commonFinal.questions.every((q) => q.tags.includes('learning-area:common')), 'common-final common-area tag missing');
assert(commonFinal.questions.filter((q) => q.tags.includes('question-kind:common-final')).length === 200, 'common-final choice split mismatch');
assert(commonFinal.questions.filter((q) => q.tags.includes('question-kind:common-cloze')).length === 100, 'common-final self-assessment split mismatch');

assert(predicted30.questions.every((q) => q.tags.includes('supplemental:common-predicted30')), 'predicted30 supplemental tag missing');
assert(predicted30.questions.every((q) => q.tags.includes('question-kind:common-predicted30')), 'predicted30 category tag missing');
assert(predicted30.questions.every((q) => q.tags.includes('learning-area:common')), 'predicted30 common-area tag missing');
assert(predicted30.questions.every((q) => q.choices?.length === 4 && q.correctChoiceIndexes?.length === 1 && q.explanation?.choice_explanations?.length === 4), 'predicted30 four-choice/answer/explanation QA failed');
// All 510 predicted30 questions must remain renderable under the v1.7
// five-section explanation UI. Run this check on the actual shipped payload,
// in addition to fixture-based React tests, to catch partial-content regressions.
const predicted30Ids = new Set();
const knowledgeKeys = [
  'surroundingKnowledge',
  'comparisonText',
  'commonMistakes',
  'correctionConditions'
];
const knowledgeHeadings = /^(surroundingKnowledge|comparisonText|commonMistakes|correctionConditions):[ \\t]*/gm;
for (const question of predicted30.questions) {
  const id = question.id;
  assert(typeof id === 'string' && id.trim(), 'predicted30: missing question ID');
  assert(!predicted30Ids.has(id), `predicted30: duplicate question ID ${id}`);
  predicted30Ids.add(id);
  assert(question.questionFormat === 'single-choice', `${id}: not single-choice`);
  assert(typeof question.prompt === 'string' && question.prompt.trim(), `${id}: empty prompt`);
  assert(
    Array.isArray(question.choices) &&
      question.choices.length === 4 &&
      question.choices.every((choice) => typeof choice === 'string' && choice.trim()),
    `${id}: a choice is missing or blank`
  );
  const correct = question.correctChoiceIndexes;
  assert(
    Array.isArray(correct) &&
      correct.length === 1 &&
      Number.isInteger(correct[0]) &&
      correct[0] >= 0 &&
      correct[0] < 4,
    `${id}: expected exactly one valid correctChoiceIndex`
  );

  const explanation = question.explanation;
  assert(explanation && typeof explanation === 'object', `${id}: missing formal explanation`);
  for (const field of ['answer', 'question_intent', 'reasoning', 'source_explanation_raw', 'key_points']) {
    assert(
      typeof explanation[field] === 'string' && explanation[field].trim(),
      `${id}: missing explanation.${field}`
    );
  }
  assert(
    explanation.answer.trim().startsWith('ABCD'[correct[0]] + '.'),
    `${id}: answer text does not match correctChoiceIndexes`
  );
  const reasons = explanation.choice_explanations;
  assert(Array.isArray(reasons) && reasons.length === 4, `${id}: expected four choice explanations`);
  reasons.forEach((reason, index) => {
    assert(reason.target_key === 'ABCD'[index], `${id}: choice explanation key mismatch at ${index}`);
    assert(reason.display_order === index + 1, `${id}: choice explanation order mismatch at ${index}`);
    assert(
      reason.judgement === (index === correct[0] ? 'correct' : 'incorrect'),
      `${id}: choice explanation judgement mismatch at ${index}`
    );
    assert(typeof reason.reason === 'string' && reason.reason.trim(), `${id}: missing choice rationale at ${index}`);
  });

  const knowledge = explanation.surrounding_knowledge;
  assert(typeof knowledge === 'string', `${id}: missing surrounding_knowledge`);
  const headings = [...knowledge.matchAll(knowledgeHeadings)];
  assert(
    headings.length === 4 &&
      headings[0].index === 0 &&
      headings.every((match, index) => match[1] === knowledgeKeys[index]),
    `${id}: predicted30: malformed knowledge section order`
  );
  headings.forEach((heading, index) => {
    const start = heading.index + heading[0].length;
    const end = headings[index + 1]?.index ?? knowledge.length;
    assert(knowledge.slice(start, end).trim(), `${id}: empty ${knowledgeKeys[index]} section`);
  });
}
assert(
  predicted30.sourceOccurrences.every((item) => predicted30Ids.has(item.canonical_question_id)),
  'predicted30: a source occurrence references a missing question'
);

const predictedSubjectCounts = new Map();
for (const question of predicted30.questions) {
  predictedSubjectCounts.set(question.subject, (predictedSubjectCounts.get(question.subject) ?? 0) + 1);
}
assert(predictedSubjectCounts.size === 17 && [...predictedSubjectCounts.values()].every((n) => n === 30), 'predicted30 must have exactly 30 questions in each of 17 subjects');

const allQuestions = [
  ...base.sheets.QUESTIONS.map((q) => q.canonical_question_id),
  ...commonCloze.questions.map((q) => q.id),
  ...specialtyPast.questions.map((q) => q.id),
  ...specialtyPredicted.questions.map((q) => q.id),
  ...specialtyPredictedCase.questions.map((q) => q.id),
  ...commonFinal.questions.map((q) => q.id),
  ...predicted30.questions.map((q) => q.id)
];
const allOccurrences = [
  ...base.sheets.SOURCE_OCCURRENCES.map((o) => o.source_occurrence_id),
  ...commonCloze.sourceOccurrences.map((o) => o.source_occurrence_id),
  ...specialtyPast.sourceOccurrences.map((o) => o.source_occurrence_id),
  ...specialtyPredicted.sourceOccurrences.map((o) => o.source_occurrence_id),
  ...specialtyPredictedCase.sourceOccurrences.map((o) => o.source_occurrence_id),
  ...commonFinal.sourceOccurrences.map((o) => o.source_occurrence_id),
  ...predicted30.sourceOccurrences.map((o) => o.source_occurrence_id)
];
assert(allQuestions.length === 4061, `total question mismatch: ${allQuestions.length}`);
assert(allOccurrences.length === 4061, `total occurrence mismatch: ${allOccurrences.length}`);
assert(new Set(allQuestions).size === allQuestions.length, 'duplicate question IDs detected');
assert(new Set(allOccurrences).size === allOccurrences.length, 'duplicate SourceOccurrence IDs detected');

for (const [role, item] of packed) {
  const issues = scanStrings(item.data);
  assert(issues.length === 0, `${role}: forbidden text control issue: ${issues[0]}`);
}

console.log('Public Dataset QA PASS');
console.log(`release=${manifest.releaseVersion}`);
console.log('questions=4061 materials=114 occurrences=4061');
console.log('categories=536/2014/190/510/300/126/116/269');
