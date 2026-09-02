declare module 'node:buffer' {
  export const Blob: typeof globalThis.Blob;
  export const Buffer: typeof import('buffer').Buffer;
}
