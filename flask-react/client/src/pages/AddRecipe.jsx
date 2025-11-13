// client/src/pages/AddRecipe.jsx
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useToast } from "../components/Toast.jsx";



const emptyIng = { name: "", qty: 1, unit: "г" };
const CATEGORIES = [
  { title: "Горячие блюда", icon: "🍜" },
  { title: "Десерты", icon: "🍦" },
  { title: "Салаты", icon: "🥗" },
  { title: "Домашний фастфуд", icon: "🍕" },
  { title: "Экзотические блюда", icon: "🐙", wide: true },
];

export default function AddRecipe() {
  // ----- поля рецепта -----
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [fat, setFat] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [difficulty, setDifficulty] = useState("easy");
  const [servings, setServings] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [ingredients, setIngredients] = useState([{ ...emptyIng }]);
  const [mealTime, setMealTime] = useState("breakfast");

  // ----- копирование из БД -----
  const [dbRecipes, setDbRecipes] = useState([]);
  const [cloneId, setCloneId] = useState("");

  // ----- управление экраном -----
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    axios.get("/api/recipes").then((r) => setDbRecipes(r.data));
  }, []);

  // категории
  const chooseCategory = (name) => {
    if (!tags.includes(name)) setTags((t) => [...t, name]);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  // ингредиенты
  const addIng = () => setIngredients((prev) => [...prev, { ...emptyIng }]);
  const changeIng = (i, field, val) => {
    setIngredients((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], [field]: field === "qty" ? Number(val) : val };
      return next;
    });
  };
  const removeIng = (i) =>
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));

  // теги
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };
  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));

  // клон из базы
  const cloneFromDb = async () => {
    if (!cloneId) return;
    const r = await axios.get(`/api/recipes/${cloneId}`);
    const d = r.data || {};
    setTitle(d.title || "");
    setShortDesc(d.short_desc || "");
    setCalories(d.calories || 0);
    setProtein(d.protein || 0);
    setFat(d.fat || 0);
    setCarbs(d.carbs || 0);
    setDifficulty(d.difficulty || "easy");
    setMealTime(d.meal_time || "breakfast");
    setServings(d.servings || 1);
    setInstructions(d.instructions || "");
    setTags(d.tags || []);
    setIngredients(
      (d.ingredients || []).map((i) => ({
        name: i.name,
        qty: i.qty,
        unit: i.unit || "г",
      }))
    );
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  // отправка
 const submit = async () => {
  const payload = {
    title,
    short_desc: shortDesc,
    calories: Number(calories),
    protein: Number(protein),
    fat: Number(fat),
    carbs: Number(carbs),
    difficulty,
    servings: Number(servings),
    meal_time: mealTime,
    instructions,
    tags,
    ingredients: ingredients.filter(i => i.name.trim())
  };
    try {
    const res = await axios.post("/api/recipes", payload);
    toast.success(`Блюдо «${res.data.title}» добавлено!`, "Оно теперь доступно в каталоге.");
  } catch (err) {
    toast.error("Ошибка при сохранении блюда", err?.response?.data?.message || "Попробуйте ещё раз");
  }
};

  return (
    <div className="page">
      {/* ==== Витрина категорий (енот слева, карточки справа) ===== */}
      <main className="home">
        <section className="home-left">
          {/* картинка лежит */}
          <img className="raccoon" src="/mascot.svg" alt="Енот с пиццей" />
        </section>

        <section className="home-right">
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <button
                key={c.title}
                className={`cat-card ${c.wide ? "cat-wide" : ""}`}
                onClick={() => chooseCategory(c.title)}
                title={`Добавить в категорию «${c.title}»`}
              >
                <div className="cat-icon">{c.icon}</div>
                <div className="cat-title">{c.title}</div>
              </button>
            ))}
          </div>

          <div className="more-wrap">
            <button className="btnMore" onClick={() => setShowForm(true)}>
              БОЛЬШЕ
            </button>
          </div>
        </section>
      </main>

      {/* Форма добавления блюда ===== */}
      {showForm && (
        <div ref={formRef} className="pageWrap" style={{ paddingTop: 8 }}>
          <h2 style={{ marginBottom: 16 }}>Добавить новое блюдо</h2>

          {/* Копирование из базы */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <select
                className="search"
                style={{ width: 340 }}
                value={cloneId}
                onChange={(e) => setCloneId(e.target.value)}
              >
                <option value="">Выбрать существующее блюдо...</option>
                {dbRecipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
              <button className="btnPrimary" onClick={cloneFromDb}>
                Копировать
              </button>
            </div>
          </div>

          {/* Основная форма */}
          <div className="card" style={{ padding: 16, display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Название блюда</label>
                <input
                  className="search"
                  placeholder="Например: Паста с грибами"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label>Сложность</label>
                <select
                  className="search"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="easy">Лёгкая</option>
                  <option value="medium">Средняя</option>
                  <option value="hard">Сложная</option>
                </select>
              </div>
              <div>
                <label>Приём пищи</label>
                <select
                  className="search"
                  value={mealTime}
                  onChange={(e) => setMealTime(e.target.value)}
                >
                  <option value="breakfast">Завтрак</option>
                  <option value="lunch">Обед</option>
                  <option value="dinner">Ужин</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / span 2" }}>
                <label>Краткое описание</label>
                <input
                  className="search"
                  placeholder="Коротко о блюде (для списка)"
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              <div>
                <label>Калории</label>
                <input
                  type="number"
                  className="search"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                />
              </div>
              <div>
                <label>Белки (Б)</label>
                <input
                  type="number"
                  className="search"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                />
              </div>
              <div>
                <label>Жиры (Ж)</label>
                <input
                  type="number"
                  className="search"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                />
              </div>
              <div>
                <label>Углеводы (У)</label>
                <input
                  type="number"
                  className="search"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                />
              </div>
              <div>
                <label>Порции</label>
                <input
                  type="number"
                  className="search"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label>Теги</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  className="search"
                  style={{ width: 240 }}
                  placeholder="например: быстро, остро"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                />
                <button className="btnPrimary" onClick={addTag}>
                  Добавить тег
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {tags.map((t) => (
                  <span key={t} className="badge" onClick={() => removeTag(t)}>
                    {t} ×
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label>Ингредиенты</label>
              <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                {ingredients.map((ing, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 110px 36px",
                      gap: 8,
                    }}
                  >
                    <input
                      className="search"
                      placeholder="Название"
                      value={ing.name}
                      onChange={(e) => changeIng(i, "name", e.target.value)}
                    />
                    <input
                      className="search"
                      type="number"
                      placeholder="Кол-во"
                      value={ing.qty}
                      onChange={(e) => changeIng(i, "qty", e.target.value)}
                    />
                    <input
                      className="search"
                      placeholder="Ед. изм. (г, мл, шт)"
                      value={ing.unit}
                      onChange={(e) => changeIng(i, "unit", e.target.value)}
                    />
                    <button onClick={() => removeIng(i)} className="btnDel">
                      ×
                    </button>
                  </div>
                ))}
                <button className="btnPrimary" onClick={addIng}>
                  + ингредиент
                </button>
              </div>
            </div>

            <div>
              <label>Инструкции по приготовлению</label>
              <textarea
                className="search"
                rows={5}
                placeholder="Шаги приготовления..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button className="btnPrimary" onClick={submit}>
                💾 Сохранить блюдо
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
