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
import { nextVisibleCount, visibleCountForTarget } from './utils/progressiveRendering';
import './dashboard.css';

const APP_VERSION = '0.16.1';
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
  const [status, setStatus] = useState('');
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [practicePool, setPracticePool] = useState<Question[]>([]);
  const [practiceSourceLabel, setPracticeSourceLabel] = useState('全問題');
  const [practiceInitialPreset, setPracticeInitialPreset] = useState<PracticePreset>('all');
  const [practiceQueue, setPracticeQueue] = useState<Question[]>([]);
  const [practiceMode, setPracticeMode] = useState<PracticeSessionMode>('practice');
  const [practiceTimerMinutes, setPracticeTimerMinutes] = useState<ExamTimerMinutes>(0);

  const historyByQuestionId = useMemo(
    () => new Map(learningHistory.map((history) => [history.questionId, history])),
    [learningHistory]
  );
  const filteredQuestions = useMemo(
    () => filterQuestions(questions, questionFilters, historyByQuestionId),
    [questions, questionFilters, historyByQuestionId]
  );
  const filteredMaterials = useMemo(
    () => filterMaterials(materials, materialFilters),
    [materials, materialFilters]
  );
  const visibleQuestions = filteredQuestions.slice(0, questionVisibleCount);
  const visibleMaterials = filteredMaterials.slice(0, materialVisibleCount);
  const practiceSummary = useMemo(
    () => summarizePracticePool(questions, historyByQuestionId),
    [questions, historyByQuestionId]
  );
  const supplementalQuestionCount = useMemo(
    () => questions.filter((question) => hasSupplementalTag(question.tags)).length,
    [questions]
  );
  const commonClozeCount = useMemo(
    () => questions.filter((question) => question.tags.includes(COMMON_CLOZE_TAG)).length,
    [questions]
  );
  const formalQuestionCount = Math.max(0, questions.length - supplementalQuestionCount);

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    setQuestionVisibleCount(QUESTION_RENDER_BATCH);
  }, [questionFilters]);

  useEffect(() => {
    setMaterialVisibleCount(MATERIAL_RENDER_BATCH);
  }, [materialFilters]);

  async function loadAll() {
    setIsLoading(true);
    try {
      await db.open();
      const [storedQuestions, storedMaterials, storedMedia, storedHistory] = await Promise.all([
        contentRepository.getQuestions(),
        contentRepository.getMaterials(),
        contentRepository.getMedia(),
        learningRepository.getAll()
      ]);
      setQuestions(storedQuestions);
      setMaterials(storedMaterials);
      setMedia(storedMedia);
      setLearningHistory(storedHistory);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSeedSample() {
    setStatus('');
    setImportIssues([]);
    await contentRepository.replaceDataset(sampleDataset);
    await loadAll();
    setStatus('非正式サンプルデータをIndexedDBへ保存しました。');
  }

  async function handleClearContent() {
    setStatus('');
    setImportIssues([]);
    await contentRepository.clearContent();
    await loadAll();
    setStatus('教材データだけを削除しました。学習履歴は保持しています。');
  }

  async function handleClearLearningState() {
    setStatus('');
    setImportIssues([]);
    await Promise.all([
      learningRepository.clearAll(),
      examSessionRepository.clearAll(),
      db.materialHistory.clear()
    ]);
    await loadAll();
    setStatus('学習履歴・試験履歴・資料学習状態を削除しました。教材データは保持しています。');
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setIsImporting(true);
    setStatus('');
    setImportIssues([]);
    try {
      const result = await importDatasetFile(file);
      await loadAll();
      const readBack = result.persistenceAudit;
      const readBackSummary = `read-back ${readBack.questionCount}問 / ${readBack.materialCount}資料 / ${readBack.sourceCount} sources / ${readBack.sourceOccurrenceCount} occurrences / ${readBack.mediaCount} media`;
      if (result.kind === 'supplemental-delivery') {
        setStatus(
          `追加データ「${result.supplementalKey}」をImportしました。追加${result.supplementalQuestionCount ?? 0}問 / 置換${result.replacedSupplementalQuestionCount ?? 0}問 / 全体${result.questionCount}問 / Schema ${result.schemaVersion} / ${readBackSummary}`
        );
      } else {
        setStatus(
          `${result.kind === 'canonical-master' ? 'Canonical Master' : 'Delivery'}をImportしました。${result.questionCount}問 / ${result.materialCount}資料 / Schema ${result.schemaVersion} / Formal ${result.formalDataSpecVersion} / ${readBackSummary}`
        );
      }
    } catch (error) {
      if (error instanceof DatasetImportError) {
        setStatus(error.message);
        setImportIssues(error.issues);
      } else {
        setStatus('Import中に予期しないエラーが発生しました。');
      }
    } finally {
      setIsImporting(false);
    }
  }

  function startPracticeSetup(
    pool: Question[],
    sourceLabel: string,
    initialPreset: PracticePreset = 'all'
  ) {
    setPracticePool(pool);
    setPracticeSourceLabel(sourceLabel);
    setPracticeInitialPreset(initialPreset);
    setView('practice-setup');
  }

  function startPractice(options: PracticeSetOptions) {
    const queue = buildPracticeSet(practicePool, historyByQuestionId, options);
    if (queue.length === 0) return;
    setPracticeQueue(queue);
    setPracticeMode(options.mode);
    setPracticeTimerMinutes(options.timerMinutes);
    setView('practice');
  }

  async function recordLearningResult(questionId: string, result: LearningResult) {
    await learningRepository.recordResult(questionId, result);
    const history = await learningRepository.getAll();
    setLearningHistory(history);
  }

  async function toggleFavorite(questionId: string) {
    const current = historyByQuestionId.get(questionId) ?? emptyHistory(questionId);
    await learningRepository.setFavorite(questionId, !current.favorite);
    const history = await learningRepository.getAll();
    setLearningHistory(history);
  }

  async function toggleNeedsReview(questionId: string) {
    const current = historyByQuestionId.get(questionId) ?? emptyHistory(questionId);
    await learningRepository.setNeedsReview(questionId, !current.needsReview);
    const history = await learningRepository.getAll();
    setLearningHistory(history);
  }

  async function saveExamSession(session: ExamSession) {
    await examSessionRepository.save(session);
  }

  function showQuestion(questionId: string) {
    const questionIndex = questions.findIndex((question) => question.id === questionId);
    if (questionIndex < 0) return;
    setQuestionFilters(DEFAULT_QUESTION_FILTERS);
    setQuestionVisibleCount(visibleCountForTarget(questionIndex, QUESTION_RENDER_BATCH));
    setView('questions');
    queueMicrotask(() => {
      document.getElementById(domTargetId('question', questionId))?.scrollIntoView({
        block: 'start'
      });
    });
  }

  function openPracticeFromDashboard(params: { subject?: string; unit?: string }) {
    const pool = questions.filter((question) => {
      if (params.subject && question.subject !== params.subject) return false;
      if (params.unit && question.unit !== params.unit) return false;
      return true;
    });
    const label = params.unit
      ? `${params.subject ?? '全科目'} / ${params.unit}`
      : params.subject ?? '全問題';
    startPracticeSetup(pool, label, 'review');
  }

  return (
    <main>
      <header className="app-header">
        <div>
          <p className="eyebrow">Study App</p>
          <h1>認定審査試験 学習アプリ</h1>
          <p className="muted">App v{APP_VERSION} / Delivery Schema v0.5 / Local-first PWA</p>
        </div>
        <nav aria-label="メインナビゲーション">
          <button type="button" className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>
            ホーム
          </button>
          <button
            type="button"
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => setView('dashboard')}
          >
            分析
          </button>
          <button
            type="button"
            className={view === 'questions' ? 'active' : ''}
            onClick={() => setView('questions')}
          >
            問題
          </button>
          <button
            type="button"
            className={view === 'practice-setup' || view === 'practice' ? 'active' : ''}
            onClick={() => startPracticeSetup(questions, '全問題')}
          >
            演習
          </button>
          <button
            type="button"
            className={view === 'materials' ? 'active' : ''}
            onClick={() => setView('materials')}
          >
            資料
          </button>
          <button
            type="button"
            className={view === 'data' ? 'active' : ''}
            onClick={() => setView('data')}
          >
            データ管理
          </button>
        </nav>
      </header>

      {view === 'home' && (
        <section className="stack">
          <div className="panel hero-panel">
            <p className="eyebrow">Overview</p>
            <h2>ローカル保存で学習を継続できます</h2>
            <p>
              問題・資料・学習履歴はブラウザのIndexedDBへ保存されます。正式データはデータ管理画面からImportしてください。
            </p>
          </div>

          <div className="stats-grid">
            <article className="stat-card">
              <span>問題</span>
              <strong>{questions.length}</strong>
              <small>
                正式 {formalQuestionCount} / 追加 {supplementalQuestionCount}
              </small>
            </article>
            <article className="stat-card">
              <span>資料</span>
              <strong>{materials.length}</strong>
              <small>目標 {MATERIAL_TARGET}</small>
            </article>
            <article className="stat-card">
              <span>要復習</span>
              <strong>{practiceSummary.review}</strong>
              <small>ローカル学習履歴</small>
            </article>
            <article className="stat-card">
              <span>共通穴抜き</span>
              <strong>{commonClozeCount}</strong>
              <small>目標 {COMMON_CLOZE_TARGET}</small>
            </article>
          </div>

          <div className="action-grid">
            <button type="button" className="action-card" onClick={() => startPracticeSetup(questions, '全問題')}>
              <strong>演習を始める</strong>
              <span>問題種類・学習状態・出題数を選択</span>
            </button>
            <button
              type="button"
              className="action-card"
              onClick={() => startPracticeSetup(questions, '全問題', 'review')}
            >
              <strong>要復習を解く</strong>
              <span>{practiceSummary.review}問</span>
            </button>
            <button type="button" className="action-card" onClick={() => setView('dashboard')}>
              <strong>学習分析を見る</strong>
              <span>正答率・弱点・直近不正解を確認</span>
            </button>
            <button type="button" className="action-card" onClick={() => setView('data')}>
              <strong>正式データをImport</strong>
              <span>Excel / JSON</span>
            </button>
          </div>
        </section>
      )}

      {view === 'dashboard' && (
        <LearningDashboard
          questions={questions}
          histories={learningHistory}
          onPracticeSubject={(subject) => openPracticeFromDashboard({ subject })}
          onPracticeUnit={(subject, unit) => openPracticeFromDashboard({ subject, unit })}
          onShowQuestion={showQuestion}
        />
      )}

      {view === 'questions' && (
        <section className="stack">
          <QuestionFilterPanel
            questions={questions}
            historyByQuestionId={historyByQuestionId}
            filters={questionFilters}
            onChange={setQuestionFilters}
          />
          <div className="panel section-heading">
            <div>
              <p className="eyebrow">Questions</p>
              <h2>問題一覧</h2>
            </div>
            <button
              type="button"
              disabled={filteredQuestions.length === 0}
              onClick={() => startPracticeSetup(filteredQuestions, `問題一覧の絞り込み ${filteredQuestions.length}問`)}
            >
              この条件で演習
            </button>
          </div>
          {visibleQuestions.length === 0 ? (
            <EmptyState title="条件に一致する問題がありません" />
          ) : (
            <div className="card-list">
              {visibleQuestions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  history={historyByQuestionId.get(question.id)}
                  media={media.filter((record) => record.canonical_question_id === question.id)}
                  onToggleFavorite={() => void toggleFavorite(question.id)}
                  onToggleNeedsReview={() => void toggleNeedsReview(question.id)}
                />
              ))}
            </div>
          )}
          {questionVisibleCount < filteredQuestions.length && (
            <button
              type="button"
              className="load-more"
              onClick={() =>
                setQuestionVisibleCount((current) =>
                  nextVisibleCount(current, filteredQuestions.length, QUESTION_RENDER_BATCH)
                )
              }
            >
              続きを表示
            </button>
          )}
        </section>
      )}

      {view === 'practice-setup' && (
        <PracticeSetBuilder
          questions={practicePool}
          historyByQuestionId={historyByQuestionId}
          sourceLabel={practiceSourceLabel}
          initialPreset={practiceInitialPreset}
          onStart={startPractice}
          onCancel={() => setView('home')}
        />
      )}

      {view === 'practice' && (
        <PracticeMode
          questions={practiceQueue}
          histories={historyByQuestionId}
          mode={practiceMode}
          timerMinutes={practiceTimerMinutes}
          onRecordResult={recordLearningResult}
          onToggleFavorite={toggleFavorite}
          onToggleNeedsReview={toggleNeedsReview}
          onSaveExamSession={saveExamSession}
          onClose={() => setView('home')}
        />
      )}

      {view === 'materials' && (
        <section className="stack">
          <MaterialFilterPanel materials={materials} filters={materialFilters} onChange={setMaterialFilters} />
          <div className="panel section-heading">
            <div>
              <p className="eyebrow">Materials</p>
              <h2>学習資料</h2>
            </div>
            <p className="muted">
              {filteredMaterials.length} / {materials.length}資料
            </p>
          </div>
          {visibleMaterials.length === 0 ? (
            <EmptyState title="条件に一致する資料がありません" />
          ) : (
            <div className="card-list">
              {visibleMaterials.map((material) => (
                <MaterialCard key={material.id} material={material} />
              ))}
            </div>
          )}
          {materialVisibleCount < filteredMaterials.length && (
            <button
              type="button"
              className="load-more"
              onClick={() =>
                setMaterialVisibleCount((current) =>
                  nextVisibleCount(current, filteredMaterials.length, MATERIAL_RENDER_BATCH)
                )
              }
            >
              続きを表示
            </button>
          )}
        </section>
      )}

      {view === 'data' && (
        <section className="stack">
          <div className="panel">
            <p className="eyebrow">Data Management</p>
            <h2>正式データImport</h2>
            <p>
              Canonical Master Excel / JSON Export、またはDelivery Schema 0.5 JSONをImportできます。追加Deliveryは`importMode=supplemental-replace`で既存正式データを維持したまま差し替えます。
            </p>
            <label className="file-input">
              <span>{isImporting ? 'Import中…' : '正式データExcelまたはJSONファイル'}</span>
              <input
                type="file"
                accept=".xlsx,.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={isImporting}
                onChange={(event) => void handleImport(event)}
              />
            </label>
            {status && <p role="status">{status}</p>}
            {importIssues.length > 0 && (
              <div className="warning-panel" role="alert">
                <strong>Import QA issues</strong>
                <ul>
                  {importIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="panel">
            <h3>現在のローカルデータ</h3>
            <dl className="data-summary">
              <div>
                <dt>正式問題</dt>
                <dd>
                  {formalQuestionCount} / {FORMAL_QUESTION_TARGET}
                </dd>
              </div>
              <div>
                <dt>追加問題</dt>
                <dd>{supplementalQuestionCount}</dd>
              </div>
              <div>
                <dt>共通穴抜き</dt>
                <dd>
                  {commonClozeCount} / {COMMON_CLOZE_TARGET}
                </dd>
              </div>
              <div>
                <dt>資料</dt>
                <dd>
                  {materials.length} / {MATERIAL_TARGET}
                </dd>
              </div>
            </dl>
          </div>

          <div className="panel danger-zone">
            <h3>開発・初期化操作</h3>
            <p className="muted">正式教材や学習履歴を意図せず消さないよう、用途別に分離しています。</p>
            <div className="button-row">
              <button type="button" onClick={() => void handleSeedSample()}>
                非正式サンプルを投入
              </button>
              <button type="button" onClick={() => void handleClearContent()}>
                教材データだけ削除
              </button>
              <button type="button" onClick={() => void handleClearLearningState()}>
                学習状態だけ初期化
              </button>
            </div>
          </div>
        </section>
      )}

      {isLoading && <div className="loading-overlay">読み込み中…</div>}
    </main>
  );
}

function hasSupplementalTag(tags: readonly string[]): boolean {
  return tags.some((tag) => tag.startsWith(SUPPLEMENTAL_TAG_PREFIX));
}
