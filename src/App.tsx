import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { MaterialFilterPanel } from './components/MaterialFilterPanel';
import { PracticeMode } from './components/PracticeMode';
import { PracticeSetBuilder } from './components/PracticeSetBuilder';
import { QuestionFilterPanel } from './components/QuestionFilterPanel';
import {
  EmptyState,
  FormalExplanationView,
  MaterialCard,
  QuestionCard
} from './components/StudyContentCards';
import { sampleDataset } from './data/sampleDataset';
import { db } from './db/database';
import { contentRepository } from './repositories/contentRepository';
import { emptyHistory, learningRepository } from './repositories/learningRepository';
import { DatasetImportError, importDatasetFile } from './services/datasetImportService';
import type {
  LearningHistory,
  LearningResult,
  Material,
  MediaRecord,
  Question
} from './types/domain';
import {
  DEFAULT_MATERIAL_FILTERS,
  DEFAULT_QUESTION_FILTERS,
  filterMaterials,
  filterQuestions,
  type MaterialFilterState,
  type QuestionFilterState
} from './utils/contentFilters';
import { domTargetId } from './utils/domTargetId';
import {
  buildPracticeSet,
  summarizePracticePool,
  type PracticePreset,
  type PracticeSetOptions
} from './utils/practiceSets';

const APP_VERSION = '0.11.0';
type View = 'home' | 'questions' | 'practice-setup' | 'practice' | 'materials' | 'data';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [learningHistory, setLearningHistory] = useState<LearningHistory[]>([]);
  const [questionFilters, setQuestionFilters] = useState<QuestionFilterState>(
    DEFAULT_QUESTION_FILTERS
  );
  const [materialFilters, setMaterialFilters] = useState<MaterialFilterState>(
    DEFAULT_MATERIAL_FILTERS
  );
  const [practicePoolQuestions, setPracticePoolQuestions] = useState<Question[]>([]);
  const [practicePoolLabel, setPracticePoolLabel] = useState('全問題');
  const [practiceInitialPreset, setPracticeInitialPreset] = useState<PracticePreset>('all');
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [practiceSessionKey, setPracticeSessionKey] = useState(0);
  const [sourceOccurrenceCount, setSourceOccurrenceCount] = useState(0);
  const [datasetVersion, setDatasetVersion] = useState('未登録');
  const [schemaVersion, setSchemaVersion] = useState('未登録');
  const [message, setMessage] = useState('');
  const [importError, setImportError] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
  const [focusedMaterialId, setFocusedMaterialId] = useState<string | null>(null);

  const historyByQuestionId = useMemo(
    () => new Map(learningHistory.map((history) => [history.questionId, history])),
    [learningHistory]
  );
  const practiceSummary = useMemo(
    () => summarizePracticePool(questions, historyByQuestionId),
    [questions, historyByQuestionId]
  );
  const questionSubjects = useMemo(
    () => uniqueSorted(questions.map((question) => question.subject)),
    [questions]
  );
  const questionUnits = useMemo(
    () =>
      uniqueSorted(
        questions
          .filter(
            (question) => !questionFilters.subject || question.subject === questionFilters.subject
          )
          .map((question) => question.unit)
      ),
    [questions, questionFilters.subject]
  );
  const materialSubjects = useMemo(
    () => uniqueSorted(materials.map((material) => material.subject)),
    [materials]
  );
  const filteredQuestions = useMemo(
    () => filterQuestions(questions, historyByQuestionId, questionFilters),
    [questions, historyByQuestionId, questionFilters]
  );
  const filteredMaterials = useMemo(
    () => filterMaterials(materials, materialFilters),
    [materials, materialFilters]
  );
  const learnedCount = useMemo(
    () => questions.filter((question) => (historyByQuestionId.get(question.id)?.attempts ?? 0) > 0).length,
    [questions, historyByQuestionId]
  );

  const refresh = async () => {
    const [q, m, mediaRecords, occurrences, histories, datasetMeta, schemaMeta] = await Promise.all([
      contentRepository.getQuestions(),
      contentRepository.getMaterials(),
      contentRepository.getMedia(),
      contentRepository.getSourceOccurrences(),
      learningRepository.getAll(),
      db.meta.get('datasetVersion'),
      db.meta.get('schemaVersion')
    ]);
    setQuestions(q);
    setMaterials(m);
    setMedia(mediaRecords);
    setLearningHistory(histories);
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
      learningRepository.getAll(),
      db.meta.get('datasetVersion'),
      db.meta.get('schemaVersion')
    ]).then(([q, m, mediaRecords, occurrences, histories, datasetMeta, schemaMeta]) => {
      if (!active) return;
      setQuestions(q);
      setMaterials(m);
      setMedia(mediaRecords);
      setLearningHistory(histories);
      setSourceOccurrenceCount(occurrences.length);
      setDatasetVersion(datasetMeta?.value ?? '未登録');
      setSchemaVersion(schemaMeta?.value ?? '未登録');
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const targetId =
      view === 'questions' && focusedQuestionId
        ? domTargetId('question', focusedQuestionId)
        : view === 'materials' && focusedMaterialId
          ? domTargetId('material', focusedMaterialId)
          : null;
    if (!targetId) return;

    const timer = window.setTimeout(() => {
      const target = document.getElementById(targetId);
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      target?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [view, focusedQuestionId, focusedMaterialId]);

  const openQuestion = (questionId: string) => {
    setQuestionFilters(DEFAULT_QUESTION_FILTERS);
    setFocusedMaterialId(null);
    setFocusedQuestionId(questionId);
    setView('questions');
  };

  const openMaterial = (materialId: string) => {
    setMaterialFilters(DEFAULT_MATERIAL_FILTERS);
    setFocusedQuestionId(null);
    setFocusedMaterialId(materialId);
    setView('materials');
  };

  const openView = (nextView: 'home' | 'questions' | 'materials' | 'data') => {
    setFocusedQuestionId(null);
    setFocusedMaterialId(null);
    setView(nextView);
  };

  const openPracticeSetup = (
    pool: Question[],
    label: string,
    initialPreset: PracticePreset = 'all'
  ) => {
    setFocusedQuestionId(null);
    setFocusedMaterialId(null);
    setPracticePoolQuestions([...pool]);
    setPracticePoolLabel(label);
    setPracticeInitialPreset(initialPreset);
    setPracticeSessionKey((current) => current + 1);
    setView('practice-setup');
  };

  const startConfiguredPractice = (options: PracticeSetOptions) => {
    const nextQuestions = buildPracticeSet(practicePoolQuestions, historyByQuestionId, options);
    setPracticeQuestions(nextQuestions);
    setPracticeSessionKey((current) => current + 1);
    setView('practice');
  };

  const replaceHistory = (next: LearningHistory) => {
    setLearningHistory((current) => [
      ...current.filter((history) => history.questionId !== next.questionId),
      next
    ]);
  };

  const recordLearningResult = async (questionId: string, result: LearningResult) => {
    replaceHistory(await learningRepository.recordResult(questionId, result));
  };

  const toggleFavorite = async (questionId: string) => {
    replaceHistory(await learningRepository.toggleFavorite(questionId));
  };

  const toggleReview = async (questionId: string) => {
    replaceHistory(await learningRepository.toggleNeedsReview(questionId));
  };

  const resetProgress = async (questionId: string) => {
    replaceHistory(await learningRepository.resetProgress(questionId));
  };

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

  const practiceNavActive = view === 'practice-setup' || view === 'practice';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Study App</p>
          <h1>学習アプリ v{APP_VERSION}</h1>
          <p className="muted">Delivery Schema 0.5 / Practice Sets, Random & Review Mode</p>
        </div>
        <span className="status-badge">LOCAL ONLY</span>
      </header>

      <nav className="top-nav" aria-label="メインナビゲーション">
        <button type="button" className={view === 'home' ? 'active' : ''} onClick={() => openView('home')}>
          ホーム
        </button>
        <button type="button" className={view === 'questions' ? 'active' : ''} onClick={() => openView('questions')}>
          問題
        </button>
        <button
          type="button"
          className={practiceNavActive ? 'active' : ''}
          onClick={() => openPracticeSetup(questions, '全問題')}
        >
          演習
        </button>
        <button type="button" className={view === 'materials' ? 'active' : ''} onClick={() => openView('materials')}>
          資料
        </button>
        <button type="button" className={view === 'data' ? 'active' : ''} onClick={() => openView('data')}>
          データ管理
        </button>
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
                  <strong>{learnedCount}</strong>
                  <span>学習済み</span>
                </div>
                <div>
                  <strong>{practiceSummary.review}</strong>
                  <span>要復習</span>
                </div>
                <div>
                  <strong>{sourceOccurrenceCount}</strong>
                  <span>出題出現</span>
                </div>
              </div>
            </div>
            <div className="grid-two">
              <article className="panel">
                <h3>問題演習</h3>
                <p>対象・出題順・問題数を組み合わせて演習セットを作成できます。</p>
                <div className="home-actions">
                  <button type="button" onClick={() => openView('questions')}>問題一覧を見る</button>
                  <button
                    type="button"
                    disabled={questions.length === 0}
                    onClick={() => openPracticeSetup(questions, '全問題')}
                  >
                    演習セットを作成
                  </button>
                  <button
                    type="button"
                    disabled={practiceSummary.review === 0}
                    onClick={() => openPracticeSetup(questions, '全問題', 'review')}
                  >
                    要復習 {practiceSummary.review}問から作成
                  </button>
                </div>
              </article>
              <article className="panel">
                <h3>学習資料</h3>
                <p>114単元を科目・重要度・関連問題数で検索し、関連問題へ双方向に移動できます。</p>
                <button type="button" onClick={() => openView('materials')}>
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
              <span>{filteredQuestions.length} / {questions.length}件</span>
            </div>
            <QuestionFilterPanel
              filters={questionFilters}
              subjects={questionSubjects}
              units={questionUnits}
              resultCount={filteredQuestions.length}
              totalCount={questions.length}
              onChange={setQuestionFilters}
              onReset={() => setQuestionFilters(DEFAULT_QUESTION_FILTERS)}
            />
            {filteredQuestions.length > 0 && (
              <div className="panel practice-launch">
                <div>
                  <strong>現在の絞り込み結果から演習セットを作成</strong>
                  <span>{filteredQuestions.length}問を母集団にして、対象・順序・出題数を選べます。</span>
                </div>
                <button
                  type="button"
                  onClick={() => openPracticeSetup(filteredQuestions, '現在の絞り込み結果')}
                >
                  {filteredQuestions.length}問からセットを作成
                </button>
              </div>
            )}
            {questions.length === 0 ? (
              <EmptyState text="問題データはまだ登録されていません。" />
            ) : filteredQuestions.length === 0 ? (
              <EmptyState text="条件に一致する問題はありません。" />
            ) : (
              filteredQuestions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  materials={materials}
                  media={media.filter((record) => record.canonical_question_id === question.id)}
                  history={historyByQuestionId.get(question.id) ?? emptyHistory(question.id)}
                  targeted={focusedQuestionId === question.id}
                  onOpenMaterial={openMaterial}
                  onRecord={(result) => void recordLearningResult(question.id, result)}
                  onToggleFavorite={() => void toggleFavorite(question.id)}
                  onToggleReview={() => void toggleReview(question.id)}
                  onReset={() => void resetProgress(question.id)}
                />
              ))
            )}
          </section>
        )}

        {view === 'practice-setup' && (
          <PracticeSetBuilder
            key={practiceSessionKey}
            questions={practicePoolQuestions}
            historyByQuestionId={historyByQuestionId}
            sourceLabel={practicePoolLabel}
            initialPreset={practiceInitialPreset}
            onStart={startConfiguredPractice}
            onCancel={() => openView('questions')}
          />
        )}

        {view === 'practice' && (
          <PracticeMode
            key={practiceSessionKey}
            questions={practiceQuestions}
            historyByQuestionId={historyByQuestionId}
            onRecordResult={recordLearningResult}
            onToggleFavorite={toggleFavorite}
            onToggleReview={toggleReview}
            onExit={() => openView('questions')}
            renderExplanation={(question) => (
              <FormalExplanationView
                question={question}
                media={media.filter((record) => record.canonical_question_id === question.id)}
              />
            )}
          />
        )}

        {view === 'materials' && (
          <section className="stack">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Materials</p>
                <h2>学習資料</h2>
              </div>
              <span>{filteredMaterials.length} / {materials.length}件</span>
            </div>
            <MaterialFilterPanel
              filters={materialFilters}
              subjects={materialSubjects}
              resultCount={filteredMaterials.length}
              totalCount={materials.length}
              onChange={setMaterialFilters}
              onReset={() => setMaterialFilters(DEFAULT_MATERIAL_FILTERS)}
            />
            {materials.length === 0 ? (
              <EmptyState text="学習資料はまだ登録されていません。" />
            ) : filteredMaterials.length === 0 ? (
              <EmptyState text="条件に一致する資料はありません。" />
            ) : (
              filteredMaterials.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  questions={questions}
                  targeted={focusedMaterialId === material.id}
                  onOpenQuestion={openQuestion}
                />
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
                Excel正本（.xlsx）、Canonical Master JSON Export、またはDelivery Schema 0.5 JSONを選択します。Excel正本はCanonical QAとDelivery QAを連続実行し、全検証PASS後のみIndexedDBへ保存します。学習履歴は教材データとは独立して保持されます。
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

      <footer>
        App v{APP_VERSION} / Schema 0.5 / Formal Data Spec 1.2 compatible / Cloud disabled
      </footer>
    </div>
  );
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, 'ja-JP'));
}
