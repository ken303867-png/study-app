import { beforeEach, describe, expect, it } from 'vitest';
import { sampleDataset } from '../../src/data/sampleDataset';
import { db } from '../../src/db/database';
import { contentRepository } from '../../src/repositories/contentRepository';

describe('contentRepository formal schema persistence', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([
      db.questions.clear(),
      db.materials.clear(),
      db.sources.clear(),
      db.sourceOccurrences.clear(),
      db.media.clear(),
      db.mediaBlobs.clear(),
      db.meta.clear()
    ]);
  });

  it('saves and restores the complete schema 0.5 delivery dataset', async () => {
    await contentRepository.replaceDataset(sampleDataset);

    const [questions, sources, occurrences, media, schemaMeta, templateMeta, dataSpecMeta] =
      await Promise.all([
        contentRepository.getQuestions(),
        contentRepository.getSources(),
        contentRepository.getSourceOccurrences(),
        contentRepository.getMedia(),
        db.meta.get('schemaVersion'),
        db.meta.get('explanationTemplateVersion'),
        db.meta.get('formalDataSpecVersion')
      ]);

    expect(questions[0]?.explanation.question_intent).toBeTruthy();
    expect(sources[0]?.source_id).toBe('SAMPLE-SOURCE-001');
    expect(occurrences[0]?.canonical_question_id).toBe('SAMPLE-Q-001');
    expect(media[0]?.placement_after).toBe('reasoning');
    expect(schemaMeta?.value).toBe('0.5');
    expect(templateMeta?.value).toBe('1.0');
    expect(dataSpecMeta?.value).toBe('1.1');
  });

  it('stores media blobs separately from metadata', async () => {
    await contentRepository.replaceDataset(sampleDataset);
    const blob = new Blob(['sample-media'], { type: 'image/svg+xml' });

    await contentRepository.putMediaBlob({ media_id: 'SAMPLE-MEDIA-001', blob });
    const restored = await contentRepository.getMediaBlob('SAMPLE-MEDIA-001');

    expect(restored?.size).toBe(blob.size);
    expect(restored?.type).toBe('image/svg+xml');
  });

  it('refuses a blob whose MEDIA metadata does not exist', async () => {
    await contentRepository.replaceDataset(sampleDataset);

    await expect(
      contentRepository.putMediaBlob({ media_id: 'MISSING-MEDIA', blob: new Blob(['x']) })
    ).rejects.toThrow('MEDIA metadataが存在しません');
  });
});
