import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const ROOT = new URL('../', import.meta.url);
const manifestUrl = new URL('public/public-data/manifest.json', ROOT);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));

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

function mergePack(bundle, packed) {
  const packText = gunzipSync(bundle).toString('utf8');
  const lines = packText.split('\n').filter(Boolean);
  const seenRoles = new Set();
  for (const line of lines) {
    const separator = line.indexOf('\t');
    assert(separator > 0, 'invalid pack line');
    const role = line.slice(0, separator);
    const jsonText = line.slice(separator + 1);
    assert(!seenRoles.has(role), `duplicate dataset role in bundle: ${role}`);
    seenRoles.add(role);
    packed.set(role, { jsonText, data: JSON.parse(jsonText) });
  }
}

async function readBundle(descriptor) {
  if (descriptor.path) {
    return readFile(new URL(`public/public-data/${descriptor.path}`, ROOT));
  }

  assert(Array.isArray(descriptor.chunks) && descriptor.chunks.length > 0, 'chunked bundle must have chunks');
  assert(descriptor.encoding === 'base64', 'chunked bundle encoding must be base64');
  const parts = await Promise.all(
    descriptor.chunks.map((chunkPath) => readFile(new URL(`public/public-data/${chunkPath}`, ROOT), 'utf8'))
  );
  const base64Text = parts.join('');
  assert(base64Text.length === descriptor.base64Length, `chunked base64 length mismatch: ${base64Text.length}`);
  const bundle = Buffer.from(base64Text, 'base64');
  assert(bundle.length === descriptor.compressedBytes, `chunked bundle size mismatch: ${bundle.length}`);
  return bundle;
}

assert(manifest.schemaVersion === 1, 'manifest schemaVersion must be 1');
assert(manifest.appMinVersion === '0.17.0', 'appMinVersion must be 0.17.0');
assert(manifest.expected.questionsTotal === 3451, 'expected total must be 3451');
assert(manifest.expected.materials === 114, 'expected materials must be 114');
assert(manifest.expected.sourceOccurrences === 3451, 'expected sourceOccurrences must be 3451');

const bundleDescriptors = [manifest.bundle, ...(manifest.overlays ?? [])];
assert(bundleDescriptors.length === 3, `expected base + two overlays, got ${bundleDescriptors.length}`);

const packed = new Map();
let totalBundleBytes = 0;
for (const descriptor of bundleDescriptors) {
  const bundle = await readBundle(descriptor);
  totalBundleBytes += bundle.length;
  const descriptorName = descriptor.path ?? `chunks:${descriptor.chunks.length}`;
  assert(sha256(bundle) === descriptor.sha256, `${descriptorName}: bundle SHA-256 mismatch`);

  if (descriptor.path === 'study-app-public-dataset-3154-20260907-v1.0.pack.gz') {
    assert(bundle.length === 1708205, `base bundle size mismatch: ${bundle.length}`);
  } else if (descriptor.sha256 === '9b2322c528caf098993f80db045c6f12495a8b6147f2b451ddecce849a75ce61') {
    assert(descriptor.chunks.length === 24, `common-cloze overlay chunk count mismatch: ${descriptor.chunks.length}`);
    assert(descriptor.base64Length === 327728, `common-cloze base64 length mismatch: ${descriptor.base64Length}`);
    assert(bundle.length === 245794, `common-cloze bundle size mismatch: ${bundle.length}`);
  } else if (descriptor.sha256 === 'a61a8ecada21d47066ded886e8fff20f5b7712e92c15edfea9cf074ba350303d') {
    assert(descriptor.chunks.length === 8, `common-final overlay chunk count mismatch: ${descriptor.chunks.length}`);
    assert(descriptor.base64Length === 69736, `common-final base64 length mismatch: ${descriptor.base64Length}`);
    assert(bundle.length === 52301, `common-final bundle size mismatch: ${bundle.length}`);
  } else {
    fail(`unexpected bundle descriptor: ${descriptorName}`);
  }

  mergePack(bundle, packed);
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
const commonFinal = packed.get('common-final-2026')?.data;
assert(
  base && commonCloze && specialtyPast && specialtyPredicted && specialtyPredictedCase && commonFinal,
  'required roles missing'
);

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
  ['common-cloze', commonCloze, 2014, 'common-cloze'],
  ['specialty-past', specialtyPast, 126, 'specialty-past'],
  ['specialty-predicted', specialtyPredicted, 116, 'specialty-predicted'],
  ['specialty-predicted-case', specialtyPredictedCase, 269, 'specialty-predicted-case'],
  ['common-final-2026', commonFinal, 200, 'common-final-2026']
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
assert(
  commonFinal.questions.every((question) => question.tags.includes(finalTag)),
  'common-final: supplemental tag missing'
);
assert(
  commonFinal.questions.every((question) => question.tags.includes('learning-area:common')),
  'common-final: learning-area:common tag missing'
);
const finalChoiceCount = commonFinal.questions.filter(
  (question) => question.tags.includes('question-kind:common-final')
).length;
const finalClozeCount = commonFinal.questions.filter(
  (question) => question.tags.includes('question-kind:common-cloze')
).length;
assert(finalChoiceCount === 100, `common-final choice count mismatch: ${finalChoiceCount}`);
assert(finalClozeCount === 100, `common-final cloze count mismatch: ${finalClozeCount}`);

const totalQuestions =
  base.sheets.QUESTIONS.length +
  commonCloze.questions.length +
  specialtyPast.questions.length +
  specialtyPredicted.questions.length +
  specialtyPredictedCase.questions.length +
  commonFinal.questions.length;
const totalOccurrences =
  base.sheets.SOURCE_OCCURRENCES.length +
  commonCloze.sourceOccurrences.length +
  specialtyPast.sourceOccurrences.length +
  specialtyPredicted.sourceOccurrences.length +
  specialtyPredictedCase.sourceOccurrences.length +
  commonFinal.sourceOccurrences.length;
assert(totalQuestions === manifest.expected.questionsTotal, `total question mismatch: ${totalQuestions}`);
assert(totalOccurrences === manifest.expected.sourceOccurrences, `total occurrence mismatch: ${totalOccurrences}`);

const questionIds = [
  ...base.sheets.QUESTIONS.map((question) => question.canonical_question_id),
  ...commonCloze.questions.map((question) => question.id),
  ...specialtyPast.questions.map((question) => question.id),
  ...specialtyPredicted.questions.map((question) => question.id),
  ...specialtyPredictedCase.questions.map((question) => question.id),
  ...commonFinal.questions.map((question) => question.id)
];
assert(new Set(questionIds).size === questionIds.length, 'duplicate question IDs detected');

const occurrenceIds = [
  ...base.sheets.SOURCE_OCCURRENCES.map((occurrence) => occurrence.source_occurrence_id),
  ...commonCloze.sourceOccurrences.map((occurrence) => occurrence.source_occurrence_id),
  ...specialtyPast.sourceOccurrences.map((occurrence) => occurrence.source_occurrence_id),
  ...specialtyPredicted.sourceOccurrences.map((occurrence) => occurrence.source_occurrence_id),
  ...specialtyPredictedCase.sourceOccurrences.map((occurrence) => occurrence.source_occurrence_id),
  ...commonFinal.sourceOccurrences.map((occurrence) => occurrence.source_occurrence_id)
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
assert(expectedKinds['common-final'] === commonFinal.questions.length, 'manifest common-final mismatch');
assert(expectedKinds['specialty-past'] === specialtyPast.questions.length, 'manifest specialty-past mismatch');
assert(expectedKinds['specialty-predicted'] === specialtyPredicted.questions.length, 'manifest specialty-predicted mismatch');
assert(
  expectedKinds['specialty-predicted-case'] === specialtyPredictedCase.questions.length,
  'manifest specialty-predicted-case mismatch'
);

console.log('Public Dataset QA PASS');
console.log(`release=${manifest.releaseVersion}`);
console.log(`bundleCount=${bundleDescriptors.length}`);
console.log(`bundleBytes=${totalBundleBytes}`);
console.log(`questions=${totalQuestions} materials=${base.sheets.MATERIALS.length} occurrences=${totalOccurrences}`);
console.log('categories=536/2014/190/200/126/116/269');
