export function domTargetId(type: 'question' | 'material', id: string): string {
  return `${type}-${encodeURIComponent(id)}`;
}
