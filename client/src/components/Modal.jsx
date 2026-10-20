import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,select,input,[tabindex]:not([tabindex="-1"])';
const stack = []; // open dialogs, so Escape and Tab only act on the topmost one

// Accessible dialog: traps focus, closes on Escape or backdrop click, restores focus, locks page scroll.
export default function Modal({ children, onClose, label, className = '' }) {
  const box = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose; // always call the latest handler without re-running the effect

  useEffect(() => {
    const node = box.current;
    const previous = document.activeElement;
    const token = Symbol('modal');
    stack.push(token);
    if (!node.contains(document.activeElement)) node.focus(); // respect autoFocus inside the dialog
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape') return closeRef.current();
      if (e.key !== 'Tab') return;
      const items = [...node.querySelectorAll(FOCUSABLE)];
      if (!items.length) return e.preventDefault();
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === node)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(token), 1);
      if (!stack.length) document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, []);

  return (
    <div className={`modal-backdrop ${className}`} onMouseDown={(e) => e.target === e.currentTarget && closeRef.current()}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={box}>
        {children}
      </div>
    </div>
  );
}
