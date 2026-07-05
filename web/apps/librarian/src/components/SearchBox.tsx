import { useEffect, useState } from 'react';

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Lightly debounced text input so FTS re-queries don't fire on every
 * keystroke. Debounce is local UI state only -- the source of truth (App's
 * filter state) is still the single controlled `value`. */
export function SearchBox({ value, onChange, placeholder }: SearchBoxProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <input
      type="search"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder ?? 'Search samples & substances…'}
      aria-label="Search samples and substances"
    />
  );
}
