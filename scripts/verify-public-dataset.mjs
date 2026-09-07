import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const ROOT = new URL('../', import.meta.url);
const manifestUrl = new URL('public/public-data/manifest.json', ROOT);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
const bundleUrl = new URL(`public/public-data/${manifest.bundle.path}`, ROOT);
const bundle = await readFile(bundleUrl);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function fail(message) {
  throw new Error(`[public-data QA] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
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
    for (const [key, item] of Object.entries(value)) {
      scanStrings(item, `${path}.${key}`, issues);
    }
  }
  return issues;
}

assert(manifest.schemaVersion === 1, 'manifest schemaVersion must be 1');
assert(manifest.appMinVersion === '0.17.0', 'appMinVersion must be 0.17.0');
assert(manifest.expected.questionsTotal === 3154, 'expected total must be 3154');
assert(manifest.expected.materials === 114, 'expected materials must be 114');
assert(manifest.expected.sourceOccurrences === 3154, 'expected sourceOccurrences must be 3154');
assert(bundle.length === 1708205, `bundle size mismatch: ${bundle.length}`);
assert(sha256(bundle) === manifest.bundle.sha256, 'bundle SHA-256 mismatch');

const packText = gunzipSync(bundle).toString('utf8');
const lines = packText.split('\n').filter(Boolean);
const packed = new Map();

for (const line of lines) {
  const separator = line.indexOf('\t');
  assert(separator > 0, 'invalid pack line');
  const role = line.slice(0, separator);
  const jsonText = line.slice(separator + 1);
  assert(!packed.has(role), `duplicate role: ${role}`);
  packed.set(role, { jsonText, data: JSON.parse(jsonText) });
}

const ordered = [...manifest.datasets].sort((left, right) => left.order - right.order);
assert(packed.size === ordered.length, `pack role count mismatch: ${packed.size}`);

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
assert(base && commonCloze && specialtyPast && specialtyPredicted && specialtyPredictedCase, 'required roles missing');

assert(base.formalDataSpecVersion === '1.2', 'common-base Formal Data Spec mismatch');
assert(base.sheets.QUESTIONS.length === 726, 'common-base question count mismatch');
assert(base.sheets.MATERIALS.length === 114, 'common-base material count mismatch');
assert(base.sheets.SOURCE_OCCURRENCES.length === 726, 'common-base occurrence count mismatch');

const jnaCount = base.sheets.QUESTIONS.filter(
  (question) => question.source_group === '日本看護協会 eラーニング'
).length;
const commonPredictedCount = base.sheets.QUESTIONS.filter(
  (question) => question.source_group === '予想問題'
).length;
assert(jnaCount === 536, `common-jna count mismatch: ${jnaCount}`);
assert(commonPredictedCount === 190, `common-predicted count mismatch: ${commonPredictedCount}`);

const supplementals = [
  ['common-cloze', commonCloze, 1917, 'common-cloze'],
  ['specialty-past', specialtyPast, 126, 'specialty-past'],
  ['specialty-predicted', specialtyPredicted, 116, 'specialty-predicted'],
  ['specialty-predicted-case', specialtyPredictedCase, 269, 'specialty-predicted-case']
];

for (const [role, data, expectedCount, key] of supplementals) {
  assert(data.schemaVersion === '0.5', `${role}: schemaVersion mismatch`);
  assert(data.importMode === 'supplemental-replace', `${role}: importMode mismatch`);
  assert(data.supplementalKey === key, `${role}: supplementalKey mismatch`);
  assert(data.questions.length === expectedCount, `${role}: question count mismatch`);
  assert(data.materials.length === 0, `${role}: supplemental materials must be 0`);
  assert(data.sourceOccurrences.length === expectedCount, `${role}: occurrence count mismatch`);
}

const totalQuestions =
  base.sheets.QUESTIONS.length +
  commonCloze.questions.length +
  specialtyPast.questions.length +
  specialtyPredicted.questions.length +
  specialtyPredictedCase.questions.length;
const totalOccurrences =
  base.sheets.SOURCE_OCCURRENCES.length +
  commonCloze.sourceOccurrences.length +
  specialtyPast.sourceOccurrences.length +
  specialtyPredicted.sourceOccurrences.length +
  specialtyPredictedCase.sourceOccurrences.length;
assert(totalQuestions === manifest.expected.questionsTotal, `total question mismatch: ${totalQuestions}`);
assert(totalOccurrences === manifest.expected.sourceOccurrences, `total occurrence mismatch: ${totalOccurrences}`);

const questionIds = [
  ...base.sheets.QUESTIONS.map((question) => question.canonical_question_id),
  ...commonCloze.questions.map((question) => question.id),
  ...specialtyPast.questions.map((question) => question.id),
  ...specialtyPredicted.questions.map((question) => question.id),
  ...specialtyPredictedCase.questions.map((question) => question.id)
];
assert(new Set(questionIds).size === questionIds.length, 'duplicate question IDs detected');

const occurrenceIds = [
  ...base.sheets.SOURCE_OCCURRENCES.map((occurrence) => occurrence.source_occurrence_id),
  ...commonCloze.sourceOccurrences.map((occurrence) => occurrence.source_occurrence_id),
  ...specialtyPast.sourceOccurrences.map((occurrence) => occurrence.source_occurrence_id),
  ...specialtyPredicted.sourceOccurrences.map((occurrence) => occurrence.source_occurrence_id),
  ...specialtyPredictedCase.sourceOccurrences.map((occurrence) => occurrence.source_occurrence_id)
];
assert(new Set(occurrenceIds).size === occurrenceIds.length, 'duplicate SourceOccurrence IDs detected');

for (const [role, item] of packed) {
  const stringIssues = scanStrings(item.data);
  assert(stringIssues.length === 0, `${role}: forbidden text control issue: ${stringIssues[0]}`);
}

const expectedKinds = manifest.expected.kinds;
assert(expectedKinds['common-jna'] === 536, 'manifest common-jna mismatch');
assert(expectedKinds['common-cloze'] === commonCloze.questions.length, 'manifest common-cloze mismatch');
assert(expectedKinds['common-predicted'] === 190, 'manifest common-predicted mismatch');
assert(expectedKinds['specialty-past'] === specialtyPast.questions.length, 'manifest specialty-past mismatch');
assert(expectedKinds['specialty-predicted'] === specialtyPredicted.questions.length, 'manifest specialty-predicted mismatch');
assert(
  expectedKinds['specialty-predicted-case'] === specialtyPredictedCase.questions.length,
  'manifest specialty-predicted-case mismatch'
);

console.log('Public Dataset QA PASS');
console.log(`release=${manifest.releaseVersion}`);
console.log(`bundleBytes=${bundle.length}`);
console.log(`bundleSha256=${sha256(bundle)}`);
console.log(`questions=${totalQuestions} materials=${base.sheets.MATERIALS.length} occurrences=${totalOccurrences}`);
console.log('categories=536/1917/190/126/116/269');
