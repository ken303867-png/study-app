import { Blob as NodeBlob } from 'node:buffer';
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// fake-indexeddb delegates value cloning to Node's structured clone implementation.
// jsdom's Blob is not a native structured-clone Blob, so use Node's Web-compatible
// Blob in unit tests to match browser IndexedDB Blob round-tripping semantics.
Object.defineProperty(globalThis, 'Blob', {
  configurable: true,
  writable: true,
  value: NodeBlob
});
