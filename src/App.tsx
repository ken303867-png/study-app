import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { sampleDataset } from './data/sampleDataset';
import { db } from './db/database';
import { contentRepository } from './repositories/contentRepository';
import { DatasetImportError, importDatasetFile } from './services/datasetImportService';
import type {
  ExplanationPlacement,
  FormalExplanation,
  Material,
  MediaRecord,
  Question
} from './types/domain';

type View = 'home' | 'questions' | 'materials' | 'data';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [sourceOccurrenceCount, setSourceOccurrenceCount] = useState(0);
  const [datasetVersion, setDatasetVersion] = useState('未登録');
  const [schemaVersion, setSchemaVersion] = useState('未登録');
  const [message, setMessage] = useState('');
  const [importError, setImportError] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const refresh = async () => {
    const [q, m, mediaRecords, occurrences, datasetMeta, schemaMeta] = await Promise.all([
      contentRepository.getQuestions(),
      contentRepository.getMaterials(),
      contentRepository.getMedia(),
      contentRepository.getSourceOccurrences(),
      db.meta.get('datasetVersion'),
      db.meta.get('schemaVersion')
    ]);
    setQuestions(q);
    setMaterials(m);
    setMedia(mediaRecords);
    setSourceOccurrenceCount(occurrences.length);
    setDatasetVersion(datasetMeta?.value ?? '未登録');
    setSchemaVersion(schemaMeta?.value ?? '未登録');
  };

  useEffect(() => {
    let active = true;
    void Promise.all([
      contentRepository.getQuestions(),
      contentRepository.getMaterials(),
      contentRepository.getMedia(),
      contentRepository.getSourceOccurrences(),
      db.meta.get('datasetVersion'),
      db.meta.get('schemaVersion')
    ]).then(([q, m, mediaRecords, occurrences, datasetMeta, schemaMeta]) => {
      if (!active) return;
      setQuestions(q);
      setMaterials(m);
      setMedia(mediaRecords);
      setSourceOccurrenceCount(occurrences.length);
      setDatasetVersion(datasetMeta?.value ?? '未登録');
      setSchemaVersion(schemaMeta?.value ?? '未登録');
    });

    return () => {
      active = false;
    };
  }, []);

  const loadSample = async () => {
    setImportError([]);
    await contentRepository.replaceDataset(sampleDataset);
    await refresh();
    setMessage('Schema 0.5対応の画面確認用サンプルを読み込みました。正式問題データではありません。');
  };

  const importDataFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage('');
    setImportError([]);
    try {
      const result = await importDatasetFile(file);
      await refresh();
      const kindLabel = result.kind === 'canonical-master' ? 'Canonical Master' : 'Delivery';
      const formatLabel = result.sourceFormat === 'xlsx' ? 'Excel正本' : 'JSON';
      setMessage(
        `${formatLabel} → ${kindLabel}を読み込みました: ${result.questionCount}問 / ${result.sourceOccurrenceCount}出題出現 / Schema ${result.schemaVersion}`
      );
    } catch (error) {
      if (error instanceof DatasetImportError) {
        setImportError([error.message, ...error.issues]);
      } else {
        setImportError(['データImport中に予期しないエラーが発生しました。']);
      }
    } finally {
      setImporting(false);
      input.value = '';
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Study App</p>
          <h1>学習アプリ v0.7.1</h1>
          <p className="muted">Delivery Schema 0.5 / Excel Master Adapter Pilot v1</p>
        </div>
        <span className="status-badge">LOCAL ONLY</span>
      </header>

      <nav className="top-nav" aria-label="メインナビゲーション">
        {(
          [
            ['home', 'ホーム'],
            ['questions', '問題'],
            ['materials', '資料'],
            ['data', 'データ管理']
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={view === key ? 'active' : ''}
            onClick={() => setView(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main>
        {view === 'home' && (
          <section className="stack">
            <div className="hero-card">
              <div>
                <p className="eyebrow">現在のデータ</p>
                <h2>{datasetVersion}</h2>
                <p className="muted">Schema {schemaVersion}</p>
              </div>
              <div className="metric-grid">
                <div>
                  <strong>{questions.length}</strong>
                  <span>問題</span>
                </div>
                <div>
                  <strong>{materials.length}</strong>
                  <span>資料</span>
                </div>
                <div>
                  <strong>{sourceOccurrenceCount}</strong>
                  <span>出題出現</span>
                </div>
                <div>
                  <strong>{media.length}</strong>
                  <span>MEDIA</span>
                </div>
              </div>
            </div>
            <div className="grid-two">
              <article className="panel">
                <h3>問題演習</h3>
                <p>正式な解答解説テンプレート順で、必須・任意ブロックを分離して表示します。</p>
                <button type="button" onClick={() => setView('questions')}>
                  問題を見る
                </button>
              </article>
              <article className="panel">
                <h3>学習資料</h3>
                <p>資料と問題の双方向リンクは、正式データとは独立した学習履歴とともに保持します。</p>
                <button type="button" onClick={() => setView('materials')}>
                  資料を見る
                </button>
              </article>
            </div>
          </section>
        )}

        {view === 'questions' && (
          <section className="stack">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Questions</p>
                <h2>問題</h2>
              </div>
              <span>{questions.length}件</span>
            </div>
            {questions.length === 0 ? (
              <EmptyState text="問題データはまだ登録されていません。" />
            ) : (
              questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  media={media.filter((record) => record.canonical_question_id === question.id)}
                />
              ))
            )}
          </section>
        )}

        {view === 'materials' && (
          <section className="stack">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Materials</p>
                <h2>学習資料</h2>
              </div>
              <span>{materials.length}件</span>
            </div>
            {materials.length === 0 ? (
              <EmptyState text="学習資料はまだ登録されていません。" />
            ) : (
              materials.map((material) => (
                <article className="panel" key={material.id}>
                  <div className="meta-row">
                    <span>{material.subject}</span>
                    <span>{material.importance}</span>
                  </div>
                  <h3>{material.title}</h3>
                  <p>{material.body}</p>
                </article>
              ))
            )}
          </section>
        )}

        {view === 'data' && (
          <section className="stack">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Data Management</p>
                <h2>データ管理</h2>
              </div>
            </div>
            <article className="panel warning-panel">
              <h3>正式問題データはGitHubに保存しません</h3>
              <p>正本Excel・Canonical Master JSON・正式Delivery JSONはローカルデータ領域で管理します。</p>
            </article>
            {schemaVersion !== '未登録' && schemaVersion !== '0.5' && (
              <article className="panel warning-panel" role="alert">
                <h3>旧Schemaデータを検出しました</h3>
                <p>
                  現在の保存データはSchema {schemaVersion}です。正式Schema 0.5へ変換したDeliveryデータを再投入してください。
                  学習履歴は教材データとは別テーブルで保持されます。
                </p>
              </article>
            )}
            <article className="panel">
              <h3>正式データImport</h3>
              <p>
                Excel正本（.xlsx）、Canonical Master JSON Export、またはDelivery Schema 0.5 JSONを選択します。Excel正本はCanonical QAとDelivery QAを連続実行し、全検証PASS後のみIndexedDBへ保存します。
              </p>
              <label className="file-import">
                <span>{importing ? '検証・変換中' : 'Excel / JSONファイルを選択'}</span>
                <input
                  aria-label="正式データExcelまたはJSONファイル"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.json,application/json"
                  disabled={importing}
                  onChange={(event) => void importDataFile(event)}
                />
              </label>
              {message && (
                <p className="success-message" role="status">
                  {message}
                </p>
              )}
              {importError.length > 0 && (
                <div className="import-error" role="alert">
                  <strong>Importを中止しました</strong>
                  <ul>
                    {importError.map((issue, index) => (
                      <li key={`${issue}-${index}`}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
            <article className="panel">
              <h3>サンプルデータ</h3>
              <p>正式解説・Source occurrence・MEDIA・IndexedDB保存を確認するための非正式ダミーデータです。</p>
              <button type="button" onClick={() => void loadSample()}>
                サンプルを読み込む
              </button>
            </article>
          </section>
        )}
      </main>

      <footer>App v0.7.1 / Schema 0.5 / Explanation Template 1.0 / Cloud disabled</footer>
    </div>
  );
}

function QuestionCard({ question, media }: { question: Question; media: MediaRecord[] }) {
  return (
    <article className="panel question-card">
      <div className="meta-row">
        <span>{question.sourceLabel}</span>
        <span>{question.importance}</span>
      </div>
      <h3>{question.prompt}</h3>
      <p className="muted">
        {question.subject} / {question.unit} / {question.questionFormat}
      </p>
      {'choices' in question && (
        <ol className="choice-list" type="A">
          {question.choices.map((choice) => (
            <li key={choice}>{choice}</li>
          ))}
        </ol>
      )}
      <details className="explanation-details">
        <summary>解答解説を表示</summary>
        <FormalExplanationView question={question} media={media} />
      </details>
    </article>
  );
}

function FormalExplanationView({ question, media }: { question: Question; media: MediaRecord[] }) {
  if (typeof question.explanation === 'string') {
    return (
      <div className="explanation-stack">
        <div className="explanation-block warning-panel" role="alert">
          <h4>旧Schemaの解答解説</h4>
          <p>この問題は正式Explanation Template v1.0へ未変換です。Schema 0.5 Deliveryデータを再投入してください。</p>
        </div>
      </div>
    );
  }

  const explanation: FormalExplanation = question.explanation;
  const sortedChoiceExplanations = [...explanation.choice_explanations].sort(
    (a, b) => a.display_order - b.display_order
  );

  return (
    <div className="explanation-stack">
      <ExplanationTextBlock
        title="解答"
        value={explanation.answer}
        placement="answer"
        media={media}
      />
      <ExplanationTextBlock
        title="この問題で問われていること"
        value={explanation.question_intent}
        placement="question_intent"
        media={media}
      />
      <ExplanationTextBlock
        title="正解に至る考え方"
        value={explanation.reasoning}
        placement="reasoning"
        media={media}
      />

      <section className="explanation-block">
        <h4>各選択肢解説</h4>
        <div className="choice-explanation-list">
          {sortedChoiceExplanations.map((choice) => (
            <article className="choice-explanation" key={choice.target_key}>
              <div className="choice-explanation-heading">
                <strong>{choice.target_key}</strong>
                <span className={`judgement ${choice.judgement}`}>
                  {choice.judgement === 'correct' ? '正答' : '誤答'}
                </span>
              </div>
              <dl>
                <div>
                  <dt>正誤理由</dt>
                  <dd>{choice.reason}</dd>
                </div>
                <div>
                  <dt>誤答選択肢が正しくなる条件</dt>
                  <dd>{choice.correction_condition}</dd>
                </div>
                {choice.corrected_statement && (
                  <div>
                    <dt>正しい文への修正</dt>
                    <dd>{choice.corrected_statement}</dd>
                  </div>
                )}
                {choice.differential_notes && (
                  <div>
                    <dt>鑑別・混同しやすい点</dt>
                    <dd>{choice.differential_notes}</dd>
                  </div>
                )}
                {choice.clinical_caution && (
                  <div>
                    <dt>臨床上の注意点</dt>
                    <dd>{choice.clinical_caution}</dd>
                  </div>
                )}
              </dl>
            </article>
          ))}
        </div>
      </section>
      <MediaAfter placement="choice_explanations" media={media} />

      <ExplanationTextBlock
        title="関連する周辺知識"
        value={explanation.surrounding_knowledge}
        placement="surrounding_knowledge"
        media={media}
      />
      <ExplanationTextBlock
        title="臨床現場での注意点"
        value={explanation.clinical_notes}
        placement="clinical_notes"
        media={media}
      />
      <ExplanationTextBlock
        title="関連法規・ガイドライン"
        value={explanation.laws_guidelines}
        placement="laws_guidelines"
        media={media}
      />
      <ExplanationTextBlock
        title="試験で覚える要点"
        value={explanation.key_points}
        placement="key_points"
        media={media}
      />
      <ExplanationTextBlock
        title="覚え方"
        value={explanation.mnemonic}
        placement="mnemonic"
        media={media}
      />
      <ExplanationTextBlock
        title="参考文献・根拠"
        value={explanation.references}
        placement="references"
        media={media}
      />
    </div>
  );
}

function ExplanationTextBlock({
  title,
  value,
  placement,
  media
}: {
  title: string;
  value: string | undefined;
  placement: ExplanationPlacement;
  media: MediaRecord[];
}) {
  if (!value) return null;
  return (
    <>
      <section className="explanation-block">
        <h4>{title}</h4>
        <p>{value}</p>
      </section>
      <MediaAfter placement={placement} media={media} />
    </>
  );
}

function MediaAfter({ placement, media }: { placement: ExplanationPlacement; media: MediaRecord[] }) {
  const records = useMemo(
    () =>
      media
        .filter((record) => record.placement_after === placement)
        .sort((a, b) => a.display_order - b.display_order),
    [media, placement]
  );

  if (records.length === 0) return null;
  return (
    <div className="media-list" aria-label={`${placement}の関連MEDIA`}>
      {records.map((record) => (
        <MediaItem key={record.media_id} media={record} />
      ))}
    </div>
  );
}

function MediaItem({ media }: { media: MediaRecord }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    void contentRepository.getMediaBlob(media.media_id).then((blob) => {
      if (!active || !blob) return;
      createdUrl = URL.createObjectURL(blob);
      setObjectUrl(createdUrl);
    });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [media.media_id]);

  return (
    <figure className="media-card">
      {objectUrl && media.media_type !== 'table' ? (
        <img src={objectUrl} alt={media.alt_text} />
      ) : (
        <div className="media-placeholder" role="img" aria-label={media.alt_text}>
          <strong>{media.media_type.toUpperCase()}</strong>
          <span>{media.alt_text}</span>
        </div>
      )}
      <figcaption>
        {media.caption ?? media.alt_text}
        <small>{media.file_name_or_blob_ref}</small>
      </figcaption>
    </figure>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <p>{text}</p>
    </div>
  );
}
