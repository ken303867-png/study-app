import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { LearningDashboard } from './components/LearningDashboard';
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
import { examSessionRepository } from './repositories/examSessionRepository';
import { emptyHistory, learningRepository } from './repositories/learningRepository';
import { DatasetImportError, importDatasetFile } from './services/datasetImportService';
import type {
  ExamSession,
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
  type ExamTimerMinutes,
  type PracticePreset,
  type PracticeSessionMode,
  type PracticeSetOptions
} from './utils/practiceSets';
import {
  nextVisibleCount,
  visibleCountForTarget
} from './utils/progressiveRendering';
import './dashboard.css';

const APP_VERSION = '0.16.0';
const QUESTION_RENDER_BATCH = 30;
const MATERIAL_RENDER_BATCH = 20;
const FORMAL_QUESTION_TARGET = 726;
const MATERIAL_TARGET = 114;
const COMMON_CLOZE_TARGET = 1917;
const SUPPLEMENTAL_TAG_PREFIX = 'supplemental:';
const COMMON_CLOZE_TAG = 'supplemental:common-cloze';

type View =
  | 'home'
  | 'dashboard'
  | 'questions'
  | 'practice-setup'
  | 'practice'
  | 'materials'
  | 'data';

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
  const [questionVisibleCount, setQuestionVisibleCount] = useState(QUESTION_RENDER_BATCH);
  const [materialVisibleCount, setMaterialVisibleCount] = useState(MATERIAL_RENDER_BATCH);
  const [practicePoolQuestions, setPracticePoolQuestions] = useState<Question[]>([]);
  const [practicePoolLabel, setPracticePoolLabel] = useState('全問題');
  const [practiceInitialPreset, setPracticeInitialPreset] = useState<PracticePreset>('all');
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [practiceSessionMode, setPracticeSessionMode] = useState<PracticeSessionMode>('practice');
  const [practiceTimerMinutes, setPracticeTimerMinutes] = useState<ExamTimerMinutes>(0);
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
  const mediaByQuestionId = useMemo(() => {
    const grouped = new Map<string, MediaRecord[]>();
    for (const record of media) {
      const current = grouped.get(record.canonical_question_id) ?? [];
      current.push(record);
      grouped.set(record.canonical_question_id, current);
    }
    return grouped;
  }, [media]);
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
  const visibleQuestions = useMemo(
    () => filteredQuestions.slice(0, questionVisibleCount),
    [filteredQuestions, questionVisibleCount]
  );
  const visibleMaterials = useMemo(
    () => filteredMaterials.slice(0, materialVisibleCount),
    [filteredMaterials, materialVisibleCount]
  );
  const learnedCount = useMemo(
    () => questions.filter((question) => (historyByQuestionId.get(question.id)?.attempts ?? 0) > 0).length,
    [questions, historyByQuestionId]
  );
  const supplementalQuestionCount = useMemo(
    () =>
      questions.filter((question) =>
        question.tags.some((tag) => tag.startsWith(SUPPLEMENTAL_TAG_PREFIX))
      ).length,
    [questions]
  );
  const commonClozeQuestionCount = useMemo(
    () => questions.filter((question) => question.tags.includes(COMMON_CLOZE_TAG)).length,
    [questions]
  );
  const formalQuestionCount = questions.length - supplementalQuestionCount;
  const formalBaseReady =
    datasetVersion.startsWith('common-726-') &&
    formalQuestionCount === FORMAL_QUESTION_TARGET &&
    materials.length === MATERIAL_TARGET;
  const commonClozeReady = commonClozeQuestionCount === COMMON_CLOZE_TARGET;

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
  }, [view, focusedQuestionId, focusedMaterialId, questionVisibleCount, materialVisibleCount]);

  const openQuestion = (questionId: string) => {
    const targetIndex = questions.findIndex((question) => question.id === questionId);
    setQuestionFilters(DEFAULT_QUESTION_FILTERS);
    setQuestionVisibleCount(
      visibleCountForTarget(targetIndex, questions.length, QUESTION_RENDER_BATCH)
    );
    setFocusedMaterialId(null);
    setFocusedQuestionId(questionId);
    setView('questions');
  };

  const openMaterial = (materialId: string) => {
    const targetIndex = materials.findIndex((material) => material.id === materialId);
    setMaterialFilters(DEFAULT_MATERIAL_FILTERS);
    setMaterialVisibleCount(
      visibleCountForTarget(targetIndex, materials.length, MATERIAL_RENDER_BATCH)
    );
    setFocusedQuestionId(null);
    setFocusedMaterialId(materialId);
    setView('materials');
  };

  const openView = (nextView: 'home' | 'dashboard' | 'questions' | 'materials' | 'data') => {
    setFocusedQuestionId(null);
    setFocusedMaterialId(null);
    setView(nextView);
  };

  const updateQuestionFilters = (nextFilters: QuestionFilterState) => {
    setQuestionFilters(nextFilters);
    setQuestionVisibleCount(QUESTION_RENDER_BATCH);
    setFocusedQuestionId(null);
  };

  const updateMaterialFilters = (nextFilters: MaterialFilterState) => {
    setMaterialFilters(nextFilters);
    setMaterialVisibleCount(MATERIAL_RENDER_BATCH);
    setFocusedMaterialId(null);
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
    const nextMode = options.mode ?? 'practice';
    setPracticeQuestions(nextQuestions);
    setPracticeSessionMode(nextMode);
    setPracticeTimerMinutes(nextMode === 'exam' ? (options.timerMinutes ?? 0) : 0);
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

  const saveExamSession = async (session: ExamSession) => {
    await examSessionRepository.save(session);
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
      const formatLabel = result.sourceFormat === 'xlsx' ? 'Excel正本' : 'JSON';
      if (result.kind === 'supplemental-delivery') {
        setMessage(
          `${formatLabel} → 追加データ「${result.supplementalKey}」を読み込みました: 追加${result.supplementalQuestionCount ?? 0}問 / 置換${result.replacedSupplementalQuestionCount ?? 0}問 / 現在${result.questionCount}問 / Schema ${result.schemaVersion}`
        );
      } else {
        const kindLabel = result.kind === 'canonical-master' ? 'Canonical Master' : 'Delivery';
        setMessage(
          `${formatLabel} → ${kindLabel}を読み込みました: ${result.questionCount}問 / ${result.sourceOccurrenceCount}出題出現 / Schema ${result.schemaVersion} / ${result.materialCount}資料`
        );
      }
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
          <p className="muted">Delivery Schema 0.5 / Offline PWA</p>
        </div>
        <span className="status-badge">LOCAL ONLY</span>
      </header>

      <nav className="top-nav" aria-label="メインナビゲーション">
        <button type="button" className={view === 'home' ? 'active' : ''} onClick={() => openView('home')}>
          ホーム
        </button>
        <button
          type="button"
          className={view === 'dashboard' ? 'active' : ''}
          onClick={() => openView('dashboard')}
        >
          分析
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
                <p className="muted">
                  正式Base {formalQuestionCount}問 / 追加 {supplementalQuestionCount}問
                </p>
              </div>
              <div className="metric-grid">
                <div>
                  <strong>{questions.length}</strong>
                  <span>全問題</span>
                </div>
                <div>
                  <strong>{formalQuestionCount}</strong>
                  <span>正式Base</span>
                </div>
                <div>
                  <strong>{supplementalQuestionCount}</strong>
                  <span>追加問題</span>
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
                <h3>問題演習・試験</h3>
                <p>対象・出題順・問題数を組み合わせ、通常演習または一括採点の試験モードを開始できます。</p>
                <div className="home-actions">
                  <button type="button" onClick={() => openView('questions')}>問題一覧を見る</button>
                  <button
                    type="button"
                    disabled={questions.length === 0}
                    onClick={() => openPracticeSetup(questions, '全問題')}
                  >
                    演習・試験セットを作成
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
                <h3>学習分析</h3>
                <p>正答率・要復習・科目別/単元別の復習優先範囲を学習履歴から確認できます。</p>
                <button type="button" onClick={() => openView('dashboard')}>
                  ダッシュボードを見る
                </button>
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

        {view === 'dashboard' && (
          <LearningDashboard
            questions={questions}
            historyByQuestionId={historyByQuestionId}
            onPractice={openPracticeSetup}
            onOpenQuestion={openQuestion}
          />
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
              onChange={updateQuestionFilters}
              onReset={() => updateQuestionFilters(DEFAULT_QUESTION_FILTERS)}
            />
            {filteredQuestions.length > 0 && (
              <div className="panel practice-launch">
                <div>
                  <strong>現在の絞り込み結果から演習・試験セットを作成</strong>
                  <span>{filteredQuestions.length}問を母集団にして、対象・順序・出題数・実施モードを選べます。</span>
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
              <>
                {visibleQuestions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    materials={materials}
                    media={mediaByQuestionId.get(question.id) ?? []}
                    history={historyByQuestionId.get(question.id) ?? emptyHistory(question.id)}
                    targeted={focusedQuestionId === question.id}
                    onOpenMaterial={openMaterial}
                    onRecord={(result) => void recordLearningResult(question.id, result)}
                    onToggleFavorite={() => void toggleFavorite(question.id)}
                    onToggleReview={() => void toggleReview(question.id)}
                    onReset={() => void resetProgress(question.id)}
                  />
                ))}
                {visibleQuestions.length < filteredQuestions.length && (
                  <div className="panel progressive-list-controls" aria-label="問題の追加表示">
                    <span>
                      {visibleQuestions.length} / {filteredQuestions.length}問を表示中
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuestionVisibleCount((current) =>
                          nextVisibleCount(current, filteredQuestions.length, QUESTION_RENDER_BATCH)
                        )
                      }
                    >
                      さらに{Math.min(
                        QUESTION_RENDER_BATCH,
                        filteredQuestions.length - visibleQuestions.length
                      )}問表示
                    </button>
                  </div>
                )}
              </>
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
            sessionMode={practiceSessionMode}
            timerMinutes={practiceTimerMinutes}
            onRecordResult={recordLearningResult}
            onSaveExamSession={saveExamSession}
            onToggleFavorite={toggleFavorite}
            onToggleReview={toggleReview}
            onExit={() => openView('questions')}
            renderExplanation={(question) => (
              <FormalExplanationView
                question={question}
                media={mediaByQuestionId.get(question.id) ?? []}
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
              onChange={updateMaterialFilters}
              onReset={() => updateMaterialFilters(DEFAULT_MATERIAL_FILTERS)}
            />
            {materials.length === 0 ? (
              <EmptyState text="学習資料はまだ登録されていません。" />
            ) : filteredMaterials.length === 0 ? (
              <EmptyState text="条件に一致する資料はありません。" />
            ) : (
              <>
                {visibleMaterials.map((material) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    questions={questions}
                    targeted={focusedMaterialId === material.id}
                    onOpenQuestion={openQuestion}
                  />
                ))}
                {visibleMaterials.length < filteredMaterials.length && (
                  <div className="panel progressive-list-controls" aria-label="資料の追加表示">
                    <span>
                      {visibleMaterials.length} / {filteredMaterials.length}件を表示中
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setMaterialVisibleCount((current) =>
                          nextVisibleCount(current, filteredMaterials.length, MATERIAL_RENDER_BATCH)
                        )
                      }
                    >
                      さらに{Math.min(
                        MATERIAL_RENDER_BATCH,
                        filteredMaterials.length - visibleMaterials.length
                      )}件表示
                    </button>
                  </div>
                )}
              </>
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
                  学習履歴・試験履歴は教材データとは別テーブルで保持されます。
                </p>
              </article>
            )}
            <article className="panel">
              <h3>現在の保存状態</h3>
              <div className="metric-grid">
                <div>
                  <strong>{formalQuestionCount}</strong>
                  <span>正式Base</span>
                </div>
                <div>
                  <strong>{commonClozeQuestionCount}</strong>
                  <span>共通穴抜き</span>
                </div>
                <div>
                  <strong>{questions.length}</strong>
                  <span>全問題</span>
                </div>
                <div>
                  <strong>{materials.length}</strong>
                  <span>資料</span>
                </div>
              </div>
              <p className="muted">
                正式Base: {formalBaseReady ? 'OK' : `要確認（目標 ${FORMAL_QUESTION_TARGET}問・${MATERIAL_TARGET}資料）`} / 共通穴抜き: {commonClozeReady ? 'OK' : `未完了（目標 ${COMMON_CLOZE_TARGET}問）`}
              </p>
              <p className="muted">Dataset: {datasetVersion} / Schema {schemaVersion}</p>
            </article>
            <article className="panel">
              <h3>Import順序</h3>
              <p>
                1. 正式BaseのCanonical Masterを先に読み込み、2. その後に共通穴抜きのsupplemental JSONを読み込みます。
                Canonical Masterを再投入するとBase Datasetが置換されるため、穴抜きデータを先に入れていた場合は最後にsupplemental JSONを再Importしてください。
              </p>
            </article>
            <article className="panel">
              <h3>正式データImport</h3>
              <p>
                Excel正本（.xlsx）、Canonical Master JSON Export、またはDelivery Schema 0.5 JSONを選択します。Excel正本はCanonical QAとDelivery QAを連続実行し、全検証PASS後のみIndexedDBへ保存します。学習履歴・試験履歴は教材データとは独立して保持されます。
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
