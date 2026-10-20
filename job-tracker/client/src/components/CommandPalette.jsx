import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Modal from './Modal.jsx';

const PAGES = [['Dashboard', '/'], ['Board', '/board'], ['Applications', '/applications'], ['Interview prep and CV match', '/prep'], ['Settings', '/settings']];

// Ctrl/Cmd+K: jump to a page, start a new application, or open any application by name.
export default function CommandPalette({ onClose, onNew, onOpen }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [apps, setApps] = useState([]);
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api('/api/applications?limit=200', { signal: ctrl.signal }).then((d) => setApps(d.data)).catch(() => {});
    return () => ctrl.abort();
  }, []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all = [
      { key: 'new', label: 'New application', hint: 'Action', run: onNew },
      ...PAGES.map(([label, path]) => ({ key: path, label: `Go to ${label}`, hint: 'Page', run: () => navigate(path) })),
      ...apps.map((a) => ({ key: `a${a.id}`, label: `${a.company} - ${a.role}`, hint: a.status, run: () => onOpen(a.id) })),
    ];
    return (needle ? all.filter((r) => r.label.toLowerCase().includes(needle)) : all).slice(0, 12);
  }, [q, apps, navigate, onNew, onOpen]);

  useEffect(() => setIndex(0), [q]);
  useEffect(() => listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' }), [index]);

  const choose = (r) => {
    onClose();
    r.run();
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[index]) { e.preventDefault(); choose(results[index]); }
  };

  return (
    <Modal onClose={onClose} label="Command palette" className="palette">
      <div className="sheet">
        <input
          className="palette-input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
          placeholder="Search applications, jump to a page…" role="combobox" aria-expanded="true" aria-controls="palette-list"
          aria-activedescendant={results[index] ? `opt-${results[index].key}` : undefined} aria-label="Command palette"
        />
        <ul id="palette-list" role="listbox" ref={listRef} className="palette-list">
          {results.map((r, i) => (
            <li key={r.key} id={`opt-${r.key}`} role="option" aria-selected={i === index} className={i === index ? 'active' : ''} onMouseEnter={() => setIndex(i)} onClick={() => choose(r)}>
              <span>{r.label}</span><span className="muted small">{r.hint}</span>
            </li>
          ))}
          {results.length === 0 && <li className="muted" role="presentation">No matches</li>}
        </ul>
      </div>
    </Modal>
  );
}
