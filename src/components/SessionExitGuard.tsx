import { useEffect, type ReactNode } from 'react';

export function SessionExitGuard({ children }: { children: ReactNode }) {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const exitButton = target.closest<HTMLButtonElement>('.practice-navigation button:last-child');
      if (!exitButton || exitButton.disabled) return;

      const isExam = exitButton.textContent?.includes('試験') === true;
      const confirmed = window.confirm(
        isExam
          ? '試験を中断しますか？ 中断した試験は採点・保存されません。'
          : '演習を終了しますか？ この演習セットの途中位置は保存されません。'
      );

      if (!confirmed) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return children;
}
