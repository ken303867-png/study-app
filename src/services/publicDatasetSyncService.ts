import { z } from 'zod';
import { db } from '../db/database';
import { contentRepository } from '../repositories/contentRepository';
import { importDatasetJsonText } from './datasetImportService';
import { countQuestionKinds, QUESTION_KINDS, type QuestionKind } from '../utils/questionCategories';

const PUBLIC_DATASET_META_KEY = 'publicDatasetReleaseVersion';
const PUBLIC_DATASET_MANIFEST_PATH = 'public-data/manifest.json';

const expectedKindsSchema = z.object({
  'common-jna': z.number().int().nonnegative(),
  'common-cloze': z.number().int().nonnegative(),
  'common-predicted': z.number().int().nonnegative(),
  'specialty-past': z.number().int().nonnegative(),
  'specialty-predicted': z.number().int().nonnegative(),
  'specialty-predicted-case': z.number().int().nonnegative()
});

const publicDatasetManifestSchema = z.object({
  schemaVersion: z.literal(1),
  releaseVersion: z.string().min(1),
  appMinVersion: z.string().min(1),
  expected: z.object({
    questionsTotal: z.number().int().positive(),
    materials: z.number().int().nonnegative(),
    sourceOccurrences: z.number().int().nonnegative(),
    kinds: expectedKindsSchema
  }),
  files: z
    .array(
      z.object({
        order: z.number().int().positive(),
        role: z.string().min(1),
        path: z.string().min(1),
        compression: z.enum(['gzip', 'none']),
        sha256: z.string().regex(/^[0-9a-f]{64}$/),
        originalSha256: z.string().regex(/^[0-9a-f]{64}$/),
        questionCount: z.number().int().nonnegative()
      })
    )
    .min(1)
});

export type PublicDatasetManifest = z.infer<typeof publicDatasetManifestSchema>;

export type PublicDatasetSyncStage =
  | 'checking'
  | 'downloading'
  | 'importing'
  | 'verifying'
  | 'ready';

export interface PublicDatasetSyncProgress {
  stage: PublicDatasetSyncStage;
  message: string;
  current?: number;
  total?: number;
}

export interface PublicDatasetSyncResult {
  status: 'updated' | 'up-to-date' | 'offline-existing';
  releaseVersion?: string;
  warning?: string;
}

export interface PublicDatasetSyncOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  onProgress?: (progress: PublicDatasetSyncProgress) => void;
}

let activeSync: Promise<PublicDatasetSyncResult> | null = null;

export function shouldAutoSyncPublicDataset(locationLike: Pick<Location, 'hostname' | 'search'>): boolean {
  const params = new URLSearchParams(locationLike.search);
  if (params.get('publicSync') === '1') return true;
  if (params.get('publicSync') === '0') return false;
  return locationLike.hostname !== 'localhost' && locationLike.hostname !== '127.0.0.1';
}

export function syncPublicDatasetOnce(
  options: PublicDatasetSyncOptions = {}
): Promise<PublicDatasetSyncResult> {
  if (!activeSync) {
    activeSync = syncPublicDataset(options).finally(() => {
      activeSync = null;
    });
  }
  return activeSync;
}

export async function syncPublicDataset(
  options: PublicDatasetSyncOptions = {}
): Promise<PublicDatasetSyncResult> {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? import.meta.env.BASE_URL);
  const fetchImpl = options.fetchImpl ?? fetch;
  const report = options.onProgress ?? (() => undefined);

  report({ stage: 'checking', message: '公開問題データの最新版を確認しています。' });

  let manifest: PublicDatasetManifest;
  try {
    const response = await fetchImpl(`${baseUrl}${PUBLIC_DATASET_MANIFEST_PATH}`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`manifest HTTP ${response.status}`);
    }
    manifest = publicDatasetManifestSchema.parse(await response.json());
  } catch (error) {
    if (await hasUsableStoredContent()) {
      return {
        status: 'offline-existing',
        warning: '最新版の確認ができないため、この端末に保存済みの問題データで起動しました。'
      };
    }
    throw new Error('公開問題データのmanifestを取得できません。通信状態を確認してください。', {
      cause: error
    });
  }

  const storedRelease = await db.meta.get(PUBLIC_DATASET_META_KEY);
  if (
    storedRelease?.value === manifest.releaseVersion &&
    (await storedStateMatchesManifest(manifest))
  ) {
    report({ stage: 'ready', message: '問題データは最新版です。' });
    return { status: 'up-to-date', releaseVersion: manifest.releaseVersion };
  }

  const orderedFiles = [...manifest.files].sort((a, b) => a.order - b.order);
  const downloaded: Array<{ file: (typeof orderedFiles)[number]; text: string }> = [];

  for (const [index, file] of orderedFiles.entries()) {
    report({
      stage: 'downloading',
      message: `問題データを取得しています（${index + 1}/${orderedFiles.length}）。`,
      current: index + 1,
      total: orderedFiles.length
    });
    const response = await fetchImpl(`${baseUrl}public-data/${file.path}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`問題データ「${file.role}」を取得できませんでした（HTTP ${response.status}）。`);
    }
    const payload = await response.arrayBuffer();
    const compressedHash = await sha256Hex(payload);
    if (compressedHash !== file.sha256) {
      throw new Error(`問題データ「${file.role}」のSHA-256が一致しません。`);
    }
    const text = await decodePayload(payload, file.compression);
    const originalHash = await sha256Hex(new TextEncoder().encode(text));
    if (originalHash !== file.originalSha256) {
      throw new Error(`問題データ「${file.role}」の展開後SHA-256が一致しません。`);
    }
    downloaded.push({ file, text });
  }

  for (const [index, item] of downloaded.entries()) {
    report({
      stage: 'importing',
      message: `問題データを端末へ保存しています（${index + 1}/${downloaded.length}）。`,
      current: index + 1,
      total: downloaded.length
    });
    await importDatasetJsonText(item.text);
  }

  report({ stage: 'verifying', message: '保存された問題データを最終確認しています。' });
  if (!(await storedStateMatchesManifest(manifest))) {
    throw new Error('公開問題データの保存後QAで件数または分類の不一致を検出しました。');
  }

  await db.meta.put({ key: PUBLIC_DATASET_META_KEY, value: manifest.releaseVersion });
  report({ stage: 'ready', message: '問題データの準備が完了しました。' });
  return { status: 'updated', releaseVersion: manifest.releaseVersion };
}

async function storedStateMatchesManifest(manifest: PublicDatasetManifest): Promise<boolean> {
  const [questions, materials, occurrences, schemaMeta] = await Promise.all([
    contentRepository.getQuestions(),
    contentRepository.getMaterials(),
    contentRepository.getSourceOccurrences(),
    db.meta.get('schemaVersion')
  ]);

  if (schemaMeta?.value !== '0.5') return false;
  if (questions.length !== manifest.expected.questionsTotal) return false;
  if (materials.length !== manifest.expected.materials) return false;
  if (occurrences.length !== manifest.expected.sourceOccurrences) return false;

  const counts = countQuestionKinds(questions);
  return QUESTION_KINDS.every(
    (kind) => counts[kind] === manifest.expected.kinds[kind as QuestionKind]
  );
}

async function hasUsableStoredContent(): Promise<boolean> {
  const [questionCount, schemaMeta] = await Promise.all([
    db.questions.count(),
    db.meta.get('schemaVersion')
  ]);
  return questionCount > 0 && schemaMeta?.value === '0.5';
}

async function decodePayload(payload: ArrayBuffer, compression: 'gzip' | 'none'): Promise<string> {
  if (compression === 'none') return new TextDecoder().decode(payload);
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('このブラウザはgzip展開に対応していません。最新版のブラウザを使用してください。');
  }
  const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

async function sha256Hex(data: ArrayBuffer | ArrayBufferView): Promise<string> {
  const bytes = data instanceof ArrayBuffer
    ? data
    : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}
