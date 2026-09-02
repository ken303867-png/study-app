import { useEffect, useState } from 'react';
import { sampleDataset } from './data/sampleDataset';
import { db } from './db/database';
import { contentRepository } from './repositories/contentRepository';
import type { Material, Question } from './types/domain';

type View = 'home' | 'questions' | 'materials' | 'data';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [datasetVersion, setDatasetVersion] = useState('未登録');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    const [q, m, meta] = await Promise.all([
      contentRepository.getQuestions(),
      contentRepository.getMaterials(),
      db.meta.get('datasetVersion')
    ]);
    setQuestions(q);
    setMaterials(m);
    setDatasetVersion(meta?.value ?? '未登録');
  };

  useEffect(() => {
    let active = true;
    void Promise.all([
      contentRepository.getQuestions(),
      contentRepository.getMaterials(),
      db.meta.get('datasetVersion')
    ]).then(([q, m, meta]) => {
      if (!active) return;
      setQuestions(q);
      setMaterials(m);
      setDatasetVersion(meta?.value ?? '未登録');
    });

    return () => {
      active = false;
    };
  }, []);

  const loadSample = async () => {
    await contentRepository.replaceDataset(sampleDataset);
    await refresh();
    setMessage('画面確認用サンプルを読み込みました。正式問題データではありません。');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Study App</p>
          <h1>学習アプリ v0.7.0</h1>
          <p className="muted">React + TypeScript 正式アーキテクチャ移行版</p>
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
              </div>
            </div>
            <div className="grid-two">
              <article className="panel">
                <h3>問題演習</h3>
                <p>v0.6までの演習仕様をReactへ段階移植します。</p>
                <button type="button" onClick={() => setView('questions')}>
                  問題を見る
                </button>
              </article>
              <article className="panel">
                <h3>学習資料</h3>
                <p>資料と問題の双方向リンクを正式構成へ移します。</p>
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
              questions.map((q) => (
                <article className="panel" key={q.id}>
                  <div className="meta-row">
                    <span>{q.sourceLabel}</span>
                    <span>{q.importance}</span>
                  </div>
                  <h3>{q.prompt}</h3>
                  <p className="muted">
                    {q.subject} / {q.unit} / {q.questionFormat}
                  </p>
                </article>
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
              materials.map((m) => (
                <article className="panel" key={m.id}>
                  <div className="meta-row">
                    <span>{m.subject}</span>
                    <span>{m.importance}</span>
                  </div>
                  <h3>{m.title}</h3>
                  <p>{m.body}</p>
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
              <p>Private repositoryでも、正式問題本文・教材本文はローカルデータ領域で管理します。</p>
            </article>
            <article className="panel">
              <h3>サンプルデータ</h3>
              <p>画面・IndexedDB・Zod検証を確認するための非正式ダミーデータです。</p>
              <button type="button" onClick={() => void loadSample()}>
                サンプルを読み込む
              </button>
              {message && (
                <p className="success-message" role="status">
                  {message}
                </p>
              )}
            </article>
          </section>
        )}
      </main>

      <footer>App v0.7.0 / Schema 0.3 / Cloud disabled</footer>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <p>{text}</p>
    </div>
  );
}
