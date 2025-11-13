import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const SLOTS = [
  { key: "breakfast", label: "Завтрак", icon: "🍳" },
  { key: "lunch",     label: "Обед",     icon: "🍲" },
  { key: "dinner",    label: "Ужин",     icon: "🌙" },
];

const DAYS_RU = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];

// Понедельник выбранной недели в ISO (YYYY-MM-DD)
function mondayISO(d = new Date()) {
  const x = new Date(d);
  const diff = (x.getDay() + 6) % 7; // 0=>Пн, … 6=>Вс
  x.setHours(12,0,0,0);
  x.setDate(x.getDate() - diff);
  return x.toISOString().slice(0,10);
}
function addDays(iso, n) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}
function fmtHuman(iso) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const wd = DAYS_RU[d.getDay()];
  return `${wd} ${dd}.${mm}`;
}

export default function Planner() {
  const [start, setStart] = useState(() => mondayISO());
  const [weekRows, setWeekRows] = useState([]);       // с сервера
  const [loading, setLoading] = useState(false);

  // назначение блюда: модалка-поиск
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickDay, setPickDay] = useState("");
  const [pickSlot, setPickSlot] = useState("");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState([]);
  const [qLoading, setQLoading] = useState(false);

  const days = useMemo(() => Array.from({length:7}, (_,i)=>addDays(start, i)), [start]);

  const loadWeek = async () => {
    setLoading(true);
    try {
      const r = await axios.get("/api/plan/week", { params: { start } });
      setWeekRows(r.data || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadWeek(); }, [start]);

  // словарь {`${day}|${slot}`: row}
  const map = useMemo(() => {
    const m = new Map();
    weekRows.forEach(x => m.set(`${x.day}|${x.slot}`, x));
    return m;
  }, [weekRows]);

  const openPicker = (day, slot) => {
    setPickDay(day);
    setPickSlot(slot);
    setQuery("");
    setFound([]);
    setPickerOpen(true);
  };

  const search = async (q) => {
    setQuery(q);
    setQLoading(true);
    try {
      const r = await axios.get("/api/recipes", { params: { q } });
      setFound(r.data || []);
    } finally {
      setQLoading(false);
    }
  };

  const assign = async (recipe) => {
    await axios.post("/api/plan/set", {
      day: pickDay, slot: pickSlot, recipe_id: recipe.id
    });
    setPickerOpen(false);
    await loadWeek();
  };

  const clearSlot = async (day, slot) => {
    await axios.delete("/api/plan/set", { params: { day, slot } });
    await loadWeek();
  };

  const prevWeek = () => setStart(addDays(start, -7));
  const nextWeek = () => setStart(addDays(start, +7));

  return (
    <div className="pageWrap">
      {/* Шапка управления неделей */}
      <div className="week-controls">
        <button className="btnGhost" onClick={prevWeek}>← Неделя</button>

        <div className="week-title">
          {fmtHuman(days[0])} — {fmtHuman(days[6])}
        </div>

        <div className="week-actions">
          <input
            type="date"
            className="search"
            value={start}
            onChange={e => setStart(mondayISO(new Date(e.target.value)))}
            title="Дата понедельника"
          />
          <button className="btnGhost" onClick={nextWeek}>Неделя →</button>
        </div>
      </div>

      {/* Сетка 7 дней */}
      <div className="week-grid">
        {days.map((dayIso, idx) => {
          return (
            <div key={dayIso} className="card day-card">
              <div className="day-head">
                <div className="day-title">{fmtHuman(dayIso)}</div>
                {loading && <div className="day-spinner">…</div>}
              </div>

              <div className="slots">
                {SLOTS.map(s => {
                  const row = map.get(`${dayIso}|${s.key}`);
                  const title = row?.recipe?.title;
                  return (
                    <div key={s.key} className="slot">
                      <div className="slot-top">
                        <div className="slot-name">
                          <span className="slot-ico">{s.icon}</span>{s.label}
                        </div>
                        {row && (
                          <button
                            title="Очистить слот"
                            className="slot-clear"
                            onClick={() => clearSlot(dayIso, s.key)}
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {title
                        ? <div className="slot-filled">{title}</div>
                        : <div className="slot-empty">Пусто</div>
                      }

                      <div className="slot-actions">
                        <button
                          className="btnPrimary"
                          onClick={() => openPicker(dayIso, s.key)}
                        >
                          {title ? "Заменить" : "Назначить"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Пикер блюд */}
      {pickerOpen && (
        <div className="picker-backdrop" onClick={() => setPickerOpen(false)}>
          <div className="picker" onClick={(e)=>e.stopPropagation()}>
            <div className="picker-head">
              <div className="title">Выберите блюдо</div>
              <button className="slot-clear" onClick={() => setPickerOpen(false)}>×</button>
            </div>

            <input
              className="search"
              placeholder="Поиск…"
              value={query}
              onChange={(e) => search(e.target.value)}
            />

            <div className="picker-list">
              {qLoading && <div className="muted">Поиск…</div>}
              {!qLoading && found.length === 0 && (
                <div className="muted">Ничего не найдено</div>
              )}
              {!qLoading && found.map(r => (
                <button key={r.id} className="picker-row"
                        onClick={() => assign(r)}>
                  <div className="picker-thumb">
                    {r.image_url ? <img src={r.image_url} /> : <div className="ph">🍽️</div>}
                  </div>
                  <div className="picker-title">{r.title}</div>
                  {typeof r.calories === "number" && (
                    <div className="picker-kkal">{r.calories} ккал</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
