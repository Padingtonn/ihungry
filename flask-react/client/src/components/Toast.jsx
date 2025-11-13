import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ToastCtx = createContext(null);

function ToastItem({ t, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, t.duration ?? 2500);
    return () => clearTimeout(id);
  }, [t, onClose]);

  const icon =
    t.type === "success" ? "✅" :
    t.type === "error"   ? "⛔" :
    t.type === "warn"    ? "⚠️" :
                           "ℹ️";

  return (
    <div className={`toast ${t.type || "info"}`} onClick={onClose}>
      <span className="toastIcon">{icon}</span>
      <div className="toastBody">
        <div className="toastMsg">{t.msg}</div>
        {t.sub && <div className="toastSub">{t.sub}</div>}
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);

  const api = useMemo(() => ({
    push: (t) => setList((p) => [...p, { id: crypto.randomUUID?.() || Date.now(), ...t }]),
    success: (msg, sub) => setList((p) => [...p, { id: crypto.randomUUID?.() || Date.now(), type: "success", msg, sub }]),
    error: (msg, sub)   => setList((p) => [...p, { id: crypto.randomUUID?.() || Date.now(), type: "error", msg, sub }]),
    warn: (msg, sub)    => setList((p) => [...p, { id: crypto.randomUUID?.() || Date.now(), type: "warn", msg, sub }]),
    info: (msg, sub)    => setList((p) => [...p, { id: crypto.randomUUID?.() || Date.now(), type: "info", msg, sub }]),
  }), []);

  const remove = (id) => setList((p) => p.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toastWrap">
        {list.map((t) => (
          <ToastItem key={t.id} t={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
