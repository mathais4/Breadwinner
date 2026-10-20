import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ApplicationForm from './components/ApplicationForm.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import Drawer from './components/Drawer.jsx';

// Shared UI state for the signed-in app: which application is open, the editor, the palette, toasts.
// `version` bumps whenever data changes so pages know to reload.
const WorkspaceContext = createContext(null);
export const useWorkspace = () => useContext(WorkspaceContext);

const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

export function WorkspaceProvider({ children }) {
  const [version, setVersion] = useState(0);
  const [editor, setEditor] = useState(undefined); // undefined = closed, otherwise { application, preset }
  const [openId, setOpenId] = useState(null);
  const [palette, setPalette] = useState(false);
  const [toast, setToast] = useState('');
  const timer = useRef();

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const notify = useCallback((message) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 3000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const openEditor = useCallback((application = null, preset = null) => setEditor({ application, preset }), []);
  const openApplication = useCallback((id) => setOpenId(id), []);
  const openPalette = useCallback(() => setPalette(true), []);

  // Global shortcuts: Ctrl/Cmd+K for the palette, "n" for a new application.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(document.activeElement) && !document.querySelector('[role="dialog"]')) {
        e.preventDefault();
        setEditor({ application: null, preset: null });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo(() => ({ version, refresh, notify, openEditor, openApplication, openPalette }), [version, refresh, notify, openEditor, openApplication, openPalette]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
      {openId && (
        <Drawer
          id={openId} version={version} notify={notify}
          onClose={() => setOpenId(null)}
          onEdit={(app) => openEditor(app)}
          onChanged={refresh}
          onDeleted={() => { setOpenId(null); refresh(); notify('Application deleted'); }}
        />
      )}
      {editor !== undefined && (
        <ApplicationForm
          application={editor.application} preset={editor.preset}
          onCancel={() => setEditor(undefined)}
          onSaved={(saved, isNew) => { setEditor(undefined); refresh(); notify(isNew ? `Added ${saved.company}` : 'Saved'); }}
        />
      )}
      {palette && <CommandPalette onClose={() => setPalette(false)} onNew={() => openEditor()} onOpen={openApplication} />}
      <div className="toast" role="status" aria-live="polite">{toast}</div>
    </WorkspaceContext.Provider>
  );
}
