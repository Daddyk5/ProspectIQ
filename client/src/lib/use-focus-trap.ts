import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, video[controls], [tabindex]:not([tabindex="-1"])';

/** Keeps Tab / Shift+Tab inside `ref` and restores focus to the previous element on unmount. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, onEscape?: () => void) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && escapeRef.current) {
        e.preventDefault();
        escapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [ref]);
}
