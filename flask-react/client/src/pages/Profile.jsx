import { useEffect, useRef, useState } from "react";

const LS_KEY = "ih_user";

/* ---------- МЕНЮ ПРОФИЛЯ С НАСТРОЙКАМИ ---------- */
function ProfileMenu({ onLogout }) {
  const [showSettings, setShowSettings] = useState(false);
  const [showAlcohol, setShowAlcohol] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("showAlcohol");
    if (saved !== null) setShowAlcohol(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("showAlcohol", showAlcohol);
  }, [showAlcohol]);

  return (
    <div className="profileMenu">
      <button className="menuBtn">⭐ Избранное</button>
      <button className="menuBtn">🍽 Мои рецепты</button>
      <button className="menuBtn">🕓 История</button>

      <button className="menuBtn" onClick={() => setShowSettings(true)}>
        ⚙️ Настройки
      </button>

      {/* используем переданный обработчик выхода */}
      <button className="menuBtn logout" onClick={onLogout}>Выйти</button>

      {showSettings && (
        <div className="modalOverlay" onClick={() => setShowSettings(false)}>
          <div className="modalWindow" onClick={(e) => e.stopPropagation()}>
            <h3>Настройки</h3>
            <div className="settingItem">
              <label>
                <input
                  type="checkbox"
                  checked={showAlcohol}
                  onChange={(e) => setShowAlcohol(e.target.checked)}
                />
                Показывать алкогольные продукты
              </label>
            </div>
            <button className="btnPrimary" onClick={() => setShowSettings(false)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- СТРАНИЦА ПРОФИЛЯ ---------- */
export default function Profile() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; }
    catch { return null; }
  });

  const fileRef = useRef(null);
  const onPickPhoto = () => fileRef.current?.click();
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = { ...(user || {}), photo: reader.result };
      setUser(next);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    };
    reader.readAsDataURL(f);
  };

  const logout = () => {
    localStorage.removeItem(LS_KEY);
    setUser(null);
  };

  const cards = [
    { id: 1, title: "Паста", kcal: 345, img: "https://images.unsplash.com/photo-1523986371872-9d3ba2e2f642?q=80&w=1080&auto=format&fit=crop" },
    { id: 2, title: "Борщ", kcal: 411, img: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=1080&auto=format&fit=crop" },
    { id: 3, title: "Плов", kcal: 390, img: "https://images.unsplash.com/photo-1631452236404-6a188aeffe83?q=80&w=1080&auto=format&fit=crop" },
  ];

  return (
    <div className="profile-wrap">
      {/* Левая колонка */}
      <aside className="profile-left card">
        <div className="profile-photo" onClick={onPickPhoto} title="Нажмите, чтобы выбрать фото">
          {user?.photo ? <img src={user.photo} alt="avatar" /> : <span>📷</span>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        </div>

        <div className="profile-name">
          <div className="nm-1">{user?.firstName || "Имя"}</div>
          <div className="nm-2">{user?.lastName || "Фамилия"}</div>
        </div>

        <div className="profile-meta">
          <div className="row"><span>Телефон</span><b>{user?.phone || "—"}</b></div>
          <div className="row"><span>Пол</span><b>{user?.gender || "—"}</b></div>
        </div>

        {/* ⬇️ СТАРЫЙ БЛОК УДАЛЯЕМ и вставляем НАШЕ МЕНЮ */}
        <ProfileMenu onLogout={logout} />
      </aside>

      {/* Правая колонка */}
      <main className="profile-main">
        <section className="try-block card">
          <div className="try-title">СКОРЕЕ<br/>ПОПРОБУЙ</div>
        </section>

        <section className="profile-grid">
          {cards.map(c => (
            <article key={c.id} className="profile-card card">
              <div className="pc-thumb"><img src={c.img} alt={c.title} /></div>
              <div className="pc-body">
                <h3 className="pc-title">{c.title}</h3>
                <ul className="pc-list">
                  <li>Калории: <b>{c.kcal}/100 г</b></li>
                  <li>Ингредиенты: <b>пример</b></li>
                </ul>
              </div>
            </article>
          ))}
        </section>

        <div className="more-wrap">
          <button className="btnMore">Показать всё</button>
        </div>
      </main>
    </div>
  );
}
