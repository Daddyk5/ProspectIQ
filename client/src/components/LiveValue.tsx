import { useEffect, useRef, useState } from 'react';

/** Renders a value and briefly highlights it whenever a live update changes it. */
export function LiveValue({ value, format = String, className = '' }: { value: number; format?: (n: number) => string; className?: string }) {
  const [flashKey, setFlashKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlashKey((k) => k + 1);
    }
  }, [value]);
  return (
    <span key={flashKey} className={`tabular-nums ${flashKey ? 'value-flash' : ''} ${className}`}>
      {format(value)}
    </span>
  );
}
