import { useEffect, useState } from "react";
import axios from "axios";

export default function Recipes() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [maxCal, setMaxCal] = useState("");
  const [tags, setTags] = useState([]);
  const [items, setItems] = useState([]);

  const load = async () => {
    const params = {};
    if (q) params.q = q;
    if (tag) params.tag = tag;
    if (maxCal) params.maxCalories = maxCal;
    const r = await axios.get("/api/recipes", { params });
    setItems(r.data);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { axios.get("/api/tags").then(r=>setTags(r.data)); }, []);

  return (
    <div className="pageWrap">
      <h2 style={{marginBottom:16}}>Recipes</h2>
      <div className="filters" style={{display:"flex", gap:12, marginBottom:16}}>
        <input className="search" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="search" style={{width:180}} value={tag} onChange={e=>setTag(e.target.value)}>
          <option value="">Any tag</option>
          {tags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input className="search" style={{width:160}} type="number" placeholder="Max kcal" value={maxCal} onChange={e=>setMaxCal(e.target.value)} />
        <button onClick={load} className="btnPrimary">Apply</button>
      </div>

      <div className="cardsGrid" style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:16}}>
        {items.map(r => (
          <div key={r.id} className="card" style={{minHeight:160}}>
            <div className="title" style={{fontWeight:700, marginBottom:6}}>{r.title}</div>
            <div className="meta" style={{opacity:.8, marginBottom:8}}>
              {r.calories} kcal • {r.servings} servings
            </div>
            <div style={{fontSize:13, opacity:.9, marginBottom:8}}>
              {r.tags.join(" · ")}
            </div>
            <ul style={{marginLeft:16, fontSize:14}}>
              {r.ingredients.slice(0,4).map((i,idx)=><li key={idx}>{i.name} — {i.qty} {i.unit}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
