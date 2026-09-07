import { useState, type ChangeEvent } from 'react';
import {
  createLearningStateBackup,
  LearningStateBackupError,
  restoreLearningStateBackup
} from '../services/learningStateBackupService';

const MAX_BACKUP_FILE_BYTES = 5 * 1024 * 1024;
const RESTORE_NOTICE_KEY = 'studyAppLearningStateRestoreNotice';

export function LearningStateBackupControls() {
  const [open, setOpen] = useState(() => Boolean(sessionStorage.getItem(RESTORE_NOTICE_KEY)));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(() => {
    const notice = sessionStorage.getItem(RESTORE_NOTICE_KEY) ?? '';
    if (notice) sessionStorage.removeItem(RESTORE_NOTICE_KEY);
    return notice;
  });
  const [errors, setErrors] = useState<string[]>([]);

  const exportBackup = async () => {
    setBusy(true);
    setStatus('');
    setErrors([]);
    try {
      const result = await createLearningStateBackup();
      const blob = new Blob([result.json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus(
        `学習データを保存しました。問題履歴 ${result.counts.learningHistory}件 / 資料履歴 ${result.counts.materialHistory}件 / 試験履歴 ${result.counts.examSessions}件`
      );
    } catch (error) {
      setErrors(formatBackupError(error, '学習データの保存中にエラーが発生しました。'));
    } finally {
      setBusy(false);
    }
  };

  const restoreBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setStatus('');
    setErrors([]);
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      setErrors(['バックアップファイルが大きすぎます。5MB以下のJSONファイルを選択してください。']);
      input.value = '';
      return;
    }

    const confirmed = window.confirm(
      '現在の学習履歴・資料履歴・試験履歴を、選択したバックアップ内容で置き換えます。復元を実行しますか？'
    );
    if (!confirmed) {
      input.value = '';
      return;
    }

    setBusy(true);
    try {
      const result = await restoreLearningStateBackup(await file.text());
      const skippedTotal =
        result.skipped.learningHistory + result.skipped.materialHistory + result.skipped.examSessions;
      const message =
        `学習データを復元しました。問題履歴 ${result.restored.learningHistory}件 / ` +
        `資料履歴 ${result.restored.materialHistory}件 / 試験履歴 ${result.restored.examSessions}件` +
        (skippedTotal > 0
          ? `。現在の問題・資料に存在しないIDを ${skippedTotal}件スキップしました。`
          : '。');
      sessionStorage.setItem(RESTORE_NOTICE_KEY, message);
      window.location.reload();
    } catch (error) {
      setErrors(formatBackupError(error, '学習データを復元できませんでした。'));
      setBusy(false);
      input.value = '';
    }
  };

  return (
    <section className="learning-state-backup-shell" aria-label="学習データのバックアップと復元">
      <button
        type="button"
        className="learning-state-backup-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        学習データ
      </button>

      {open && (
        <div className="learning-state-backup-panel">
          <div>
            <h2>学習履歴のバックアップ／復元</h2>
            <p>
              学習履歴・要復習・資料履歴・試験履歴だけを保存します。問題文・選択肢・正答・解説・教材本文はバックアップに含みません。
            </p>
          </div>
          <div className="learning-state-backup-actions">
            <button type="button" disabled={busy} onClick={() => void exportBackup()}>
              {busy ? '処理中' : 'バックアップを保存'}
            </button>
            <label className="learning-state-restore-input">
              <span>{busy ? '処理中' : 'バックアップから復元'}</span>
              <input
                type="file"
                accept=".json,application/json"
                aria-label="学習データバックアップJSONファイル"
                disabled={busy}
                onChange={(event) => void restoreBackup(event)}
              />
            </label>
          </div>
          <p className="learning-state-backup-caution">
            復元すると、この端末の現在の学習状態をバックアップ内容で置き換えます。不正なファイルは検証段階で拒否され、現在の履歴は変更されません。
          </p>
          {status && (
            <p className="success-message" role="status">
              {status}
            </p>
          )}
          {errors.length > 0 && (
            <div className="import-error" role="alert">
              <strong>処理を中止しました</strong>
              <ul>
                {errors.map((error, index) => (
                  <li key={`${error}-${index}`}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function formatBackupError(error: unknown, fallback: string) {
  if (error instanceof LearningStateBackupError) {
    return [error.message, ...error.issues];
  }
  if (error instanceof Error) return [error.message];
  return [fallback];
}
