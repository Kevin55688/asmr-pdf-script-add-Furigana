import '@testing-library/jest-dom';
import { vi } from 'vitest';

// @testing-library/dom 的 jestFakeTimersAreEnabled() 只支援 jest 全域，
// 在 Vitest 環境下需要手動提供 jest 相容層，讓 waitFor 能正確處理 fake timers
(globalThis as any).jest = {
  advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
};
