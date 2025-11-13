import { useEffect, useMemo, useState } from "react";
import axios from "axios";

/** Вспомогалки */
const mondayISO = (d = new Date()) => {
  const x = new Date(d);
  const diff = (x.getDay() + 6) % 7;
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - diff);
  return x.toISOString().slice(0, 10);
};
const addDays = (iso, n) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
/** аккуратная агрегация одинаковых ингредиентов (имя+ед.) */
function aggregate(items) {
  const map = new Map();
  for (const it of items) {
    const name = it.name?.trim();
    if (!name) continue;
    const unit = (it.unit || "").trim().toLowerCase();
    const key = `${name}|${unit}`;
    const prev = map.get(key) || { name, unit, qty: 0, checked: false };
    prev.qty += Number(it.qty || 0);
    map.set(key, prev);
  }
  return [...map.values()];
}

export default function Shopping() {
  /** сохранённый список (то, с чем работаем постоянно) */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  /** быстрый ввод (Добавить) */
  const [nName, setNName] = useState("");
  const [nQty, setNQty] = useState(1);
  const [nUnit, setNUnit] = useState("шт");

  /** генерация по плану */
  const [start, setStart] = useState(() => mondayISO());
  const [days, setDays] = useState(7);
  const [gen, setGen] = useState([]);         // сгенерированный предпросмотр
  const [genLoading, setGenLoading] = useState(false);

  /** фильтр по строке */
  const [q, setQ] = useState("");

  /** загрузка сохранённого списка */
  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get("/api/shopping");
      setItems(r.data || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  /** Добавить ручную позицию */
  const addManual = async () => {
    const payload = { name: nName.trim(), qty: Number(nQty || 0), unit: nUnit.trim() };
    if (!payload.name || payload.qty <= 0) return;
    const r = await axios.post("/api/shopping/add", payload);
    setItems(r.data || []);               // сервер вернул актуальный список
    setNName(""); setNQty(1); setNUnit("шт");
  };

  /** Отметить/снять «куплено» */
  const toggle = async (it) => {
    const r = await axios.patch(`/api/shopping/${it.id}`, { checked: !it.checked });
    setItems(r.data || []);
  };

  /** Править количество/ед.изм */
  const update = async (it, patch) => {
    const r = await axios.patch(`/api/shopping/${it.id}`, patch);
    setItems(r.data || []);
  };

  /** Удалить позицию */
  const remove = async (it) => {
    const r = await axios.delete(`/api/shopping/${it.id}`);
    setItems(r.data || []);
  };

  /** Очистить отмеченные */
  const clearChecked = async () => {
    const r = await axios.delete("/api/shopping", { params: { checked: 1 }});
    setItems(r.data || []);
  };

  /** Сгенерировать из меню (агрегирует ингредиенты из планов за диапазон) */
  const generate = async () => {
    setGenLoading(true);
    try {
      // сервер сам суммирует, но на всякий случай умеем агрегировать и на клиенте
      const r = await axios.post("/api/shopping/generate", { start, end: addDays(start, days-1) });
      const list = r.data?.items || [];
      setGen(aggregate(list));
    } finally {
      setGenLoading(false);
    }
  };

  /** Сохранить сгенерированный как текущий список */
  const saveGenerated = async () => {
    const r = await axios.post("/api/shopping", { items: gen });
    setItems(r.data || []);
    setGen([]);            // очистим предпросмотр
  };

  /** отфильтрованные списки для отображения */
  const itemsView = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter(i =>
      !s || i.name.toLowerCase().includes(s) || (i.unit||"").toLowerCase().includes(s)
    );
  }, [items, q]);

  const genView = useMemo(() => {
    const s = q.trim().toLowerCase();
    return gen.filter(i =>
      !s || i.name.toLowerCase().includes(s) || (i.unit||"").toLowerCase().includes(s)
    );
  }, [gen, q]);

  return (
    <div className="pageWrap">
      <h2 className="title" style={{marginBottom: 14}}>Список ингредиентов</h2>

      {/* Панель: дата, генерация, фильтр */}
      <div className="shop-controls">
        <div className="row">
          <label>Неделя от</label>
          <input type="date" className="search" value={start}
                 onChange={e => setStart(e.target.value)} />
        </div>
        <div className="row">
          <label>Дней</label>
          <select className="search" value={days} onChange={e=>setDays(Number(e.target.value))}>
            {[3,5,7,10,14].map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button className="btnPrimary" onClick={generate}>
          Сгенерировать список
        </button>
        <div className="grow" />
        <input className="search" placeholder="Фильтр по названию…"
               value={q} onChange={e=>setQ(e.target.value)} />
      </div>

      <div className="shop-grid">
        {/* Левая колонка: Добавить + Сохранённый список */}
        <div className="col">
          {/* Добавить */}
          <div className="card" style={{padding:14, display:"grid", gap:10}}>
            <div className="title" style={{opacity:.95}}>Добавить</div>
            <div className="add-grid">
              <input className="search" placeholder="Название"
                     value={nName} onChange={e=>setNName(e.target.value)} />
              <input className="search" type="number" min="0"
                     placeholder="Кол-во" value={nQty}
                     onChange={e=>setNQty(e.target.value)} />
              <input className="search" placeholder="Ед. изм. (шт, г, мл)"
                     value={nUnit} onChange={e=>setNUnit(e.target.value)} />
              <button className="btnPrimary" onClick={addManual}>Добавить</button>
            </div>
          </div>

          {/* Сгенерированный предпросмотр */}
          <div className="card" style={{padding:14, display:"grid", gap:10}}>
            <div className="title" style={{opacity:.95}}>Сгенерированный список</div>
            {genLoading && <div className="muted">Генерация…</div>}
            {!genLoading && genView.length===0 && (
              <div className="muted">Пока пусто. Нажми «Сгенерировать список».</div>
            )}
            {!genLoading && genView.length>0 && (
              <>
                <div className="shopping-list">
                  {genView.map((it, i)=>(
                    <div key={`${it.name}|${it.unit}|${i}`} className="shopping-row">
                      <div className="name">{it.name}</div>
                      <div className="qty">
                        {it.qty}
                      </div>
                      <div className="unit">{it.unit}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
                  <button className="btnPrimary" onClick={saveGenerated}>
                    Сохранить сгенерированный
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Правая колонка: Текущий (сохранённый) список — редактирование */}
        <div className="col">
          <div className="card" style={{padding:14, display:"grid", gap:10}}>
            <div className="title" style={{display:"flex", justifyContent:"space-between"}}>
              <span>Список</span>
              <button className="btnGhost" onClick={clearChecked} title="Удалить отмеченные">
                Очистить отмеченные
              </button>
            </div>

            {loading && <div className="muted">Загрузка…</div>}
            {!loading && itemsView.length===0 && (
              <div className="muted">Список пуст.</div>
            )}

            {!loading && itemsView.length>0 && (
              <div className="shopping-list">
                {itemsView.map(it=>(
                  <div key={it.id} className={`shopping-row ${it.checked ? "row-checked": ""}`}>
                    <label className="check">
                      <input type="checkbox" checked={!!it.checked}
                             onChange={()=>toggle(it)} />
                      <span />
                    </label>

                    <input
                      className="name-input"
                      value={it.name}
                      onChange={e=>update(it, { name: e.target.value })}
                    />
                    <input
                      type="number"
                      className="qty-input"
                      value={it.qty}
                      onChange={e=>update(it, { qty: Number(e.target.value) })}
                    />
                    <input
                      className="unit-input"
                      value={it.unit || ""}
                      onChange={e=>update(it, { unit: e.target.value })}
                    />

                    <button className="btnGhost" onClick={()=>remove(it)}>Удалить</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
