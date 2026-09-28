import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api';
import { streamOptimizeSequence, type OptimizeSequenceRequest } from './optimize-sequence';

export interface OptimizeState {
  status: 'idle' | 'connecting' | 'streaming' | 'done' | 'error' | 'stopped';
  text: string;
  model: string | null;
  usedFallbackModel: boolean;
  durationMs: number | null;
  error: { code: string; message: string; hint?: string; retryable: boolean } | null;
}

const INITIAL: OptimizeState = { status: 'idle', text: '', model: null, usedFallbackModel: false, durationMs: null, error: null };

/** React binding for the streaming optimizer: start, stop, and render tokens as they arrive. */
export function useOptimizeSequence() {
  const [state, setState] = useState<OptimizeState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback(async (payload: OptimizeSequenceRequest) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ ...INITIAL, status: 'connecting' });

    try {
      for await (const ev of streamOptimizeSequence(payload, ctrl.signal)) {
        if (ctrl.signal.aborted) return;
        switch (ev.type) {
          case 'meta':
            setState((s) => ({ ...s, status: 'streaming', model: ev.model, usedFallbackModel: ev.fallback }));
            break;
          case 'token':
            setState((s) => ({ ...s, status: 'streaming', text: s.text + ev.text }));
            break;
          case 'done':
            setState((s) => ({ ...s, status: 'done', durationMs: ev.totalDurationMs }));
            break;
          case 'error':
            setState((s) => ({ ...s, status: 'error', error: { code: ev.code, message: ev.message, retryable: ev.retryable } }));
            break;
        }
      }
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const err =
        e instanceof ApiError
          ? { code: e.code, message: e.message, hint: e.hint, retryable: e.retryable }
          : { code: 'CLIENT_ERROR', message: e instanceof Error ? e.message : 'Unexpected error', retryable: true };
      setState((s) => ({ ...s, status: 'error', error: err }));
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => (s.status === 'connecting' || s.status === 'streaming' ? { ...s, status: 'stopped' } : s));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL);
  }, []);

  return { ...state, start, stop, reset };
}
