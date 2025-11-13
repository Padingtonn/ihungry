import { Routes, Route, useNavigate, Link } from "react-router-dom";
import "./App.css";

// страницы
import Recipes from "./pages/Recipes.jsx";
import Catalog from "./pages/Catalog.jsx";
import Planner from "./pages/Planner.jsx";
import Shopping from "./pages/Shopping.jsx";
import AddRecipe from "./pages/AddRecipe.jsx";
import Profile from "./pages/Profile.jsx";

// компоненты
import AuthModal from "./components/AuthModal.jsx";
import Mascot from "./components/Mascot.jsx";
import { ToastProvider } from "./components/Toast.jsx";

import { useEffect, useState } from "react";

function Topbar() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ih_user"));
      if (saved) setUser(saved);
    } catch {
      setUser(null);
    }
  }, [open]);

  const handleAvatarClick = () => {
    if (user) nav("/profile");
    else setOpen(true);
  };

  return (
    <>
      <header className="topbar">
        <Link to="/" className="logo" style={{ textDecoration: "none" }}>
          IHUNGRY
        </Link>

        <div className="searchWrap">
          <span className="searchIcon">🔎</span>
          <input className="search" placeholder="Искать рецепты…" />
        </div>

        <button
          className="avatar"
          onClick={handleAvatarClick}
          title={user ? "Профиль" : "Вход / Регистрация"}
          style={{ border: "none", background: "transparent", cursor: "pointer" }}
        >
          {user?.firstName?.[0]?.toUpperCase() || "👤"}
        </button>
      </header>

      <AuthModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={(data) => {
          setUser(data);
          setOpen(false);
        }}
      />
    </>
  );
}

function Home() {
  const nav = useNavigate();
  return (
    <main className="main">
      <section className="left">
        <div className="mascot">
          {/* ЕНОТ С ДИАЛОГАМИ */}
          <Mascot />
        </div>
      </section>

      <section className="right">
        <div className="grid">
          <button className="card c1" onClick={() => nav("/recipes/new")}>
            <div className="cardLabel">1. Добавить блюдо</div>
            <div className="cardContent">
              <div className="cardEmoji" />
              <div className="cardTitle">Создать рецепт</div>
              <div className="cardHint">Название, ингредиенты, БЖУ и шаги</div>
            </div>
          </button>

          <button className="card c2" onClick={() => nav("/catalog")}>
            <div className="cardLabel">2. Каталог</div>
            <div className="cardContent">
              <div className="cardEmoji">📚</div>
              <div className="cardTitle">Каталог блюд</div>
              <div className="cardHint">Завтрак • Обед • Ужин • Десерты</div>
            </div>
          </button>

          <button className="card c3" onClick={() => nav("/planner")}>
            <div className="cardLabel">3. Меню</div>
            <div className="cardContent">
              <div className="cardEmoji">🗓️</div>
              <div className="cardTitle">Недельное меню</div>
              <div className="cardHint">План на каждый день: завтрак, обед, ужин</div>
            </div>
          </button>

          <button className="card c4" onClick={() => nav("/shopping")}>
            <div className="cardLabel">4. Список ингредиентов</div>
            <div className="cardContent">
              <div className="cardEmoji">🛒</div>
              <div className="cardTitle">Покупки</div>
              <div className="cardHint">Автогенерация из меню или вручную</div>
            </div>
          </button>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <div className="page">
        <Topbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/recipes/new" element={<AddRecipe />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/planner" element={<Planner />} />
          {/* алиас, можно удалить если не нужен */}
          <Route path="/nutrition" element={<Planner />} />
          <Route path="/shopping" element={<Shopping />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </ToastProvider>
  );
}
