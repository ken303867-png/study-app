import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { integratePhase3Materials } from '../../src/migrations/phase3MaterialMasterIntegration';
import { canonicalMasterExportSchema } from '../../src/schemas/masterDataSchemas';
import { buildCanonicalMasterXlsx } from '../helpers/buildCanonicalMasterXlsx';

test('imports Formal 1.2 material master xlsx and persists bidirectional material data', async ({
  page
}) => {
  const baseText = await readFile(
    new URL('../fixtures/canonical-master-sample.json', import.meta.url),
    'utf8'
  );
  const base = canonicalMasterExportSchema.parse(JSON.parse(baseText) as unknown);
  const integrated = integratePhase3Materials(base, phase3Fixture, {
    masterDataVersion: 'e2e-material-master-1.0',
    deliveryDatasetVersion: 'e2e-material-delivery-1.0'
  });
  const xlsx = await buildCanonicalMasterXlsx(integrated.master);

  await page.goto('/');
  await page.getByRole('button', { name: 'データ管理' }).click();
  await page.getByLabel('正式データExcelまたはJSONファイル').setInputFiles({
    name: 'formal-1.2-material-pilot.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(xlsx)
  });

  await expect(page.getByRole('status')).toContainText('Excel正本 → Canonical Masterを読み込みました');
  await expect(page.getByRole('status')).toContainText('1問 / 1出題出現 / Schema 0.5');

  await page.getByRole('button', { name: '資料' }).click();
  await expect(page.getByRole('heading', { name: 'Material連携QA' })).toBeVisible();
  await expect(page.getByText('正本を先に確定する。')).toBeVisible();

  const persisted = await page.evaluate(async () => {
    const request = indexedDB.open('study-app');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    const transaction = database.transaction(['materials', 'meta'], 'readonly');
    const materialCountRequest = transaction.objectStore('materials').count();
    const metaRequest = transaction.objectStore('meta').get('formalDataSpecVersion');
    const materialCount = await requestValue(materialCountRequest);
    const meta = (await requestValue(metaRequest)) as { key: string; value: string } | undefined;
    database.close();
    return { materialCount, formalDataSpecVersion: meta?.value };

    function requestValue<T>(idbRequest: IDBRequest<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        idbRequest.onsuccess = () => resolve(idbRequest.result);
        idbRequest.onerror = () =>
          reject(idbRequest.error ?? new Error('IndexedDB request failed'));
      });
    }
  });

  expect(persisted).toEqual({ materialCount: 1, formalDataSpecVersion: '1.2' });
});

const phase3Fixture = {
  schemaVersion: '1.0',
  subjectCount: 1,
  unitCount: 1,
  subjects: [
    {
      subjectId: '01',
      subjectOrder: 1,
      subject: 'サンプル科目',
      source: {
        fileName: '01_material_e2e_fixture.docx',
        fileSha256: 'nonformal-e2e-sha',
        format: 'docx',
        role: '非正式E2E fixture'
      },
      unitCount: 1,
      units: [
        {
          unitId: 'SCORE-E2E-01',
          unitNumber: 1,
          subjectId: '01',
          subject: 'サンプル科目',
          title: 'Material連携QA',
          importance: 'S',
          sourceHeading: 'Material連携QA S',
          sourceRelatedProblemRaw: 'FIX-Q-001',
          relatedOfficialProblemIds: ['FIX-Q-001'],
          sections: [
            {
              key: 'firstToLearn',
              heading: '① 最初に覚えること',
              blocks: [{ type: 'paragraph', text: '正本を先に確定する。' }]
            }
          ]
        }
      ]
    }
  ]
};
