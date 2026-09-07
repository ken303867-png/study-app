import { useEffect, useState, type ReactNode } from 'react';
import {
  shouldAutoSyncPublicDataset,
  syncPublicDatasetOnce,
  type PublicDatasetSyncProgress,
  type PublicDatasetSyncStage
} from '../services/publicDatasetSyncService';

interface GateState {
  status: 'checking' | 'ready' | 'error';
  progress: PublicDatasetSyncProgress;
  error?: string;
  warning?: string;
}

const INITIAL_PROGRESS: PublicDatasetSyncProgress = {
  stage: 'checking',
  message: '公開問題データの最新版を確認しています。'
};

const PREPARATION_STAGES: Array<{
  stage: Exclude<PublicDatasetSyncStage, 'ready'>;
  label: string;
}> = [
  { stage: 'checking', label: '最新版を確認' },
  { stage: 'downloading', label: '問題データを取得' },
  { stage: 'importing', label: '端末へ保存' },
  { stage: 'verifying', label: '最終確認' }
];

export function PublicDatasetGate({ children }: { children: ReactNode }) {
  const autoSync = shouldAutoSyncPublicDataset(window.location);
  const [state, setState] = useState<GateState>(() =>
    autoSync
      ? { status: 'checking', progress: INITIAL_PROGRESS }
      : { status: 'ready', progress: { stage: 'ready', message: '自動同期は無効です。' } }
  );
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!autoSync) return undefined;
    let active = true;

    void syncPublicDatasetOnce({
      onProgress: (progress) => {
        if (active) setState((current) => ({ ...current, progress }));
      }
    })
      .then((result) => {
        if (!active) return;
        const nextState: GateState = {
          status: 'ready',
          progress: { stage: 'ready', message: '問題データの準備が完了しました。' }
        };
        if (result.warning) nextState.warning = result.warning;
        setState(nextState);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: 'error',
          progress: INITIAL_PROGRESS,
          error: error instanceof Error ? error.message : '問題データの準備中にエラーが発生しました。'
        });
      });

    return () => {
      active = false;
    };
  }, [autoSync, retryKey]);

  const retry = () => {
    setState({ status: 'checking', progress: INITIAL_PROGRESS });
    setRetryKey((current) => current + 1);
  };

  if (state.status === 'ready') {
    return (
      <>
        {state.warning && (
          <div className="public-sync-warning" role="status">
            {state.warning}
          </div>
        )}
        {children}
      </>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="public-sync-screen" aria-label="問題データ準備エラー">
        <section className="public-sync-card">
          <p className="eyebrow">Study App</p>
          <h1>問題データを準備できませんでした</h1>
          <p>{state.error}</p>
          <button type="button" onClick={retry}>
            再試行
          </button>
        </section>
      </main>
    );
  }

  const currentStageIndex = Math.max(
    0,
    PREPARATION_STAGES.findIndex((item) => item.stage === state.progress.stage)
  );
  const percent = Math.round(((currentStageIndex + 1) / PREPARATION_STAGES.length) * 100);

  return (
    <main className="public-sync-screen" aria-label="問題データ準備中">
      <section className="public-sync-card" role="status">
        <p className="eyebrow">Study App</p>
        <h1>問題データを準備しています</h1>
        <p>{state.progress.message}</p>
        <div className="public-sync-progress" aria-label={`準備ステップ ${currentStageIndex + 1} / ${PREPARATION_STAGES.length}`}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <strong>ステップ {currentStageIndex + 1} / {PREPARATION_STAGES.length}</strong>
        <ol className="public-sync-steps" aria-label="問題データ準備手順">
          {PREPARATION_STAGES.map((item, index) => (
            <li
              key={item.stage}
              className={index < currentStageIndex ? 'done' : index === currentStageIndex ? 'current' : ''}
            >
              {item.label}
            </li>
          ))}
        </ol>
        <p className="muted">初回のみ自動取得します。2回目以降は端末に保存したデータを使用します。</p>
      </section>
    </main>
  );
}
