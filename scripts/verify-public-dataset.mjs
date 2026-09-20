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
assert(manifest.expected.questionsTotal === 3551, 'expected total must be 3551');
assert(manifest.expected.materials === 114, 'expected materials must be 114');
assert(manifest.expected.sourceOccurrences === 3551, 'expected sourceOccurrences must be 3551');
assert(manifest.expected.kinds['common-final'] === 300, 'common-final expected count must be 300');

const descriptors = [manifest.bundle, ...(manifest.overlays ?? [])];
assert(descriptors.length === 3, `expected 3 bundles, got ${descriptors.length}`);

const packed = new Map();
for (const descriptor of descriptors) {
  const bundle = await readBundle(descriptor);
  assert(sha256(bundle) === descriptor.sha256, 'bundle SHA-256 mismatch');
  mergePack(bundle, packed);
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
assert(base && commonCloze && specialtyPast && specialtyPredicted && specialtyPredictedCase && commonFinal, 'required roles missing');

assert(base.formalDataSpecVersion === '1.2', 'common-base Formal Data Spec mismatch');
assert(base.sheets.QUESTIONS.length === 726, 'common-base question count mismatch');
assert(base.sheets.MATERIALS.length === 114, 'common-base material count mismatch');
assert(base.sheets.SOURCE_OCCURRENCES.length === 726, 'common-base occurrence count mismatch');

const supplementals = [
  ['common-cloze', commonCloze, 2014, 'common-cloze'],
  ['specialty-past', specialtyPast, 126, 'specialty-past'],
  ['specialty-predicted', specialtyPredicted, 116, 'specialty-predicted'],
  ['specialty-predicted-case', specialtyPredictedCase, 269, 'specialty-predicted-case'],
  ['common-final-2026', commonFinal, 300, 'common-final-2026']
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

const allQuestions = [
  ...base.sheets.QUESTIONS.map((q) => q.canonical_question_id),
  ...commonCloze.questions.map((q) => q.id),
  ...specialtyPast.questions.map((q) => q.id),
  ...specialtyPredicted.questions.map((q) => q.id),
  ...specialtyPredictedCase.questions.map((q) => q.id),
  ...commonFinal.questions.map((q) => q.id)
];
const allOccurrences = [
  ...base.sheets.SOURCE_OCCURRENCES.map((o) => o.source_occurrence_id),
  ...commonCloze.sourceOccurrences.map((o) => o.source_occurrence_id),
  ...specialtyPast.sourceOccurrences.map((o) => o.source_occurrence_id),
  ...specialtyPredicted.sourceOccurrences.map((o) => o.source_occurrence_id),
  ...specialtyPredictedCase.sourceOccurrences.map((o) => o.source_occurrence_id),
  ...commonFinal.sourceOccurrences.map((o) => o.source_occurrence_id)
];
assert(allQuestions.length === 3551, `total question mismatch: ${allQuestions.length}`);
assert(allOccurrences.length === 3551, `total occurrence mismatch: ${allOccurrences.length}`);
assert(new Set(allQuestions).size === allQuestions.length, 'duplicate question IDs detected');
assert(new Set(allOccurrences).size === allOccurrences.length, 'duplicate SourceOccurrence IDs detected');

for (const [role, item] of packed) {
  const issues = scanStrings(item.data);
  assert(issues.length === 0, `${role}: forbidden text control issue: ${issues[0]}`);
}

console.log('Public Dataset QA PASS');
console.log(`release=${manifest.releaseVersion}`);
console.log('questions=3551 materials=114 occurrences=3551');
console.log('categories=536/2014/190/300/126/116/269');
