import { useEffect, useState, type ReactNode } from 'react';
import {
  shouldAutoSyncPublicDataset,
  syncPublicDatasetOnce,
  type PublicDatasetSyncProgress
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

export function PublicDatasetGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({
    status: 'checking',
    progress: INITIAL_PROGRESS
  });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    if (!shouldAutoSyncPublicDataset(window.location)) {
      setState({ status: 'ready', progress: { stage: 'ready', message: '自動同期は無効です。' } });
      return () => {
        active = false;
      };
    }

    setState({ status: 'checking', progress: INITIAL_PROGRESS });
    void syncPublicDatasetOnce({
      onProgress: (progress) => {
        if (active) setState((current) => ({ ...current, progress }));
      }
    })
      .then((result) => {
        if (!active) return;
        setState({
          status: 'ready',
          progress: { stage: 'ready', message: '問題データの準備が完了しました。' },
          warning: result.warning
        });
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
  }, [retryKey]);

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
          <button type="button" onClick={() => setRetryKey((current) => current + 1)}>
            再試行
          </button>
        </section>
      </main>
    );
  }

  const percent = state.progress.total && state.progress.current
    ? Math.round((state.progress.current / state.progress.total) * 100)
    : null;

  return (
    <main className="public-sync-screen" aria-label="問題データ準備中">
      <section className="public-sync-card" role="status">
        <p className="eyebrow">Study App</p>
        <h1>問題データを準備しています</h1>
        <p>{state.progress.message}</p>
        {percent !== null && (
          <>
            <div className="public-sync-progress" aria-label={`進捗 ${percent}%`}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <strong>{percent}%</strong>
          </>
        )}
        <p className="muted">初回のみ自動取得します。2回目以降は端末に保存したデータを使用します。</p>
      </section>
    </main>
  );
}
