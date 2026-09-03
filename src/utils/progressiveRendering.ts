export function initialVisibleCount(total: number, batchSize: number) {
  return Math.min(total, Math.max(0, batchSize));
}

export function nextVisibleCount(current: number, total: number, batchSize: number) {
  return Math.min(total, Math.max(0, current) + Math.max(1, batchSize));
}

export function visibleCountForTarget(
  targetIndex: number,
  total: number,
  batchSize: number
) {
  if (targetIndex < 0) return initialVisibleCount(total, batchSize);
  const required = targetIndex + 1;
  const batches = Math.ceil(required / Math.max(1, batchSize));
  return Math.min(total, batches * Math.max(1, batchSize));
}
