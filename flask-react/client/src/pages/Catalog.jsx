import { useEffect, useState } from "react";
import axios from "axios";

// верхние группы (как на схеме)
const GROUPS = [
  { key: "breakfast", label: "Завтрак", icon: "🌅" },
  { key: "lunch",     label: "Обед",     icon: "🍲" },
  { key: "dinner",    label: "Ужин",     icon: "🌙" },
  { key: "dessert",   label: "Десерты",  icon: "🧁" },
  { key: "cocktail",  label: "Коктейли", icon: "🥤" },
];

// подкатегории калорийности
const CALS = [
  { key: "low",   label: "Низкокалорийные" },
  { key: "balanced", label: "Сбалансированные" },
  { key: "high",  label: "Высококалорийные" },
];

export default function Catalog() {
  const [group, setGroup] = useState(GROUPS[0].key);
  const [cal, setCal] = useState(CALS[0].key);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);

  // подгрузка списка
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // ожидание API типа: /api/recipes?group=breakfast&cal=low&q=...
        const r = await axios.get("/api/recipes", {
          params: { group, cal, q }
        });
        setRecipes(r.data || []);
      } catch (e) {
        console.error(e);
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [group, cal, q]);

  return (
    <div className="pageWrap">

      {/* Заголовок + поиск */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 320px", gap:16, alignItems:"center", marginBottom:18}}>
        <h2 className="title">Каталог блюд</h2>
        <input
          className="search"
          placeholder="Поиск по названию или тегам…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />
      </div>

      {/* ГРУППЫ (слева-направо) */}
      <div className="cat-grid" style={{marginBottom:18}}>
        {GROUPS.map((g) => (
          <button
            key={g.key}
            className={`cat-card ${g.key === "cocktail" ? "cat-wide" : ""} ${group===g.key ? "active" : ""}`}
            onClick={()=>setGroup(g.key)}
            title={g.label}
          >
            <div className="cat-icon">{g.icon}</div>
            <div className="cat-title">{g.label}</div>
          </button>
        ))}
      </div>

      {/* КАЛОРИЙНОСТЬ (чипы) */}
      <div className="chip-row">
        {CALS.map(c => (
          <button
            key={c.key}
            className={`chip ${cal===c.key ? "chip-active" : ""}`}
            onClick={() => setCal(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* РЕЗУЛЬТАТЫ */}
      <div className="results">
        {loading && <div className="muted">Загрузка…</div>}
        {!loading && recipes.length===0 && (
          <div className="muted">Ничего не найдено. Попробуйте изменить фильтры.</div>
        )}

        {!loading && recipes.map(rec => (
          <div key={rec.id} className="recipe-card">
            <div className="recipe-thumb">
              {/* если на сервере есть поле image_url */}
              {rec.image_url
                ? <img src={rec.image_url} alt={rec.title}/>
                : <div className="ph">🍽️</div>
              }
            </div>
            <div className="recipe-body">
              <div className="recipe-title">{rec.title}</div>
              <div className="recipe-meta">
                {typeof rec.calories === "number" && <span>{rec.calories} ккал</span>}
                {Array.isArray(rec.tags) && rec.tags.slice(0,3).map(t => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
              <div className="recipe-actions">
                {/* Кнопки — под ваш бэкенд */}
                <button className="btnPrimary"
                        onClick={() => alert(`Открыть ${rec.title}`)}>
                  Открыть
                </button>
                <button className="btnGhost"
                        onClick={() => alert(`Добавить «${rec.title}» в план`)}>
                  В план
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
