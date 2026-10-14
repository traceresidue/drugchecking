import { NavLink } from 'react-router-dom';
import { CATEGORY_ORDER, vizByCategory } from '../registry';

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const grouped = vizByCategory();

  return (
    <aside className={`app-sidebar${open ? '' : ' is-closed'}`} aria-label="Visualization navigation">
      <div className="app-sidebar-brand">
        <NavLink to="/" onClick={onClose}>
          Visualization Lab
          <span>Drug checking · curated viz2 set</span>
        </NavLink>
      </div>
      <nav className="app-nav">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat) ?? [];
          if (!items.length) return null;
          return (
            <div key={cat} className="app-nav-group">
              <div className="app-nav-group-title">{cat}</div>
              {items.map((entry) => (
                <NavLink
                  key={entry.id}
                  to={`/viz/${entry.id}`}
                  className={({ isActive }) => `app-nav-link${isActive ? ' is-active' : ''}`}
                  onClick={onClose}
                >
                  Nº {String(entry.n).padStart(2, '0')} · {entry.title}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
