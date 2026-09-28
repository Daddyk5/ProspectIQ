import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

// jsdom does not implement media playback.
Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: () => Promise.resolve() });
Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: () => {} });
Object.defineProperty(HTMLMediaElement.prototype, 'load', { configurable: true, value: () => {} });
