import type { SpectrumRole, SubstanceRow, Technique } from '../lib/types';
import { SearchBox } from './SearchBox';

export type ViewMode = 'samples' | 'spectra';

export interface FacetOptions {
  programs: string[];
  states: string[];
  classes: string[];
  substances: SubstanceRow[];
}

export interface FilterState {
  view: ViewMode;
  q: string;
  technique: Technique[];
  substanceId: number | null;
  classes: string[];
  program: string | null;
  state: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  role: SpectrumRole | null;
}

export function initialFilterState(): FilterState {
  return {
    view: 'samples',
    q: '',
    technique: [],
    substanceId: null,
    classes: [],
    program: null,
    state: null,
    dateFrom: null,
    dateTo: null,
    role: null,
  };
}

const TECHNIQUES: Technique[] = ['GCMS', 'MS', 'FTIR'];

export interface FiltersProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  facets: FacetOptions;
}

export function Filters({ value, onChange, facets }: FiltersProps) {
  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) => onChange({ ...value, [key]: v });

  const toggleTechnique = (t: Technique) => {
    const has = value.technique.includes(t);
    set('technique', has ? value.technique.filter((x) => x !== t) : [...value.technique, t]);
  };
  const toggleClass = (c: string) => {
    const has = value.classes.includes(c);
    set('classes', has ? value.classes.filter((x) => x !== c) : [...value.classes, c]);
  };

  return (
    <div className="filters">
      <div className="view-tabs" role="tablist" aria-label="Index view">
        <button type="button" role="tab" aria-pressed={value.view === 'samples'} onClick={() => set('view', 'samples')}>
          Samples
        </button>
        <button type="button" role="tab" aria-pressed={value.view === 'spectra'} onClick={() => set('view', 'spectra')}>
          Spectra
        </button>
      </div>

      <div className="filter-group">
        <label htmlFor="f-search">Search (FTS)</label>
        <SearchBox value={value.q} onChange={(q) => set('q', q)} />
      </div>

      <div className="filter-group">
        <label>Technique</label>
        <div className="checkbox-row">
          {TECHNIQUES.map((t) => (
            <label key={t}>
              <input type="checkbox" checked={value.technique.includes(t)} onChange={() => toggleTechnique(t)} />
              {t}
            </label>
          ))}
        </div>
      </div>

      {value.view === 'spectra' && (
        <div className="filter-group">
          <label htmlFor="f-role">Role</label>
          <select id="f-role" value={value.role ?? ''} onChange={(e) => set('role', (e.target.value || null) as SpectrumRole | null)}>
            <option value="">All roles</option>
            <option value="sample">Sample</option>
            <option value="reference">Reference</option>
          </select>
        </div>
      )}

      <div className="filter-group">
        <label htmlFor="f-substance">Substance</label>
        <select
          id="f-substance"
          value={value.substanceId ?? ''}
          onChange={(e) => set('substanceId', e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">All substances</option>
          {facets.substances.map((s) => (
            <option key={s.substance_id} value={s.substance_id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Drug class</label>
        <div className="checkbox-row">
          {facets.classes.map((c) => (
            <label key={c}>
              <input type="checkbox" checked={value.classes.includes(c)} onChange={() => toggleClass(c)} />
              {c.replace(/_/g, ' ')}
            </label>
          ))}
          {facets.classes.length === 0 && <span className="viewer-empty">none</span>}
        </div>
      </div>

      <div className="filter-group">
        <label htmlFor="f-program">Program</label>
        <select id="f-program" value={value.program ?? ''} onChange={(e) => set('program', e.target.value || null)}>
          <option value="">All programs</option>
          {facets.programs.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="f-state">State</label>
        <select id="f-state" value={value.state ?? ''} onChange={(e) => set('state', e.target.value || null)}>
          <option value="">All states</option>
          {facets.states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Date collected</label>
        <div className="date-range">
          <input
            type="date"
            aria-label="From date"
            value={value.dateFrom ?? ''}
            onChange={(e) => set('dateFrom', e.target.value || null)}
          />
          <span>–</span>
          <input
            type="date"
            aria-label="To date"
            value={value.dateTo ?? ''}
            onChange={(e) => set('dateTo', e.target.value || null)}
          />
        </div>
      </div>

      <button type="button" onClick={() => onChange(initialFilterState())}>
        Reset filters
      </button>
    </div>
  );
}
