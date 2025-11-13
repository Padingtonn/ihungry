import { useEffect, useState } from "react";

const LS_KEY = "ih_user";

export default function AuthModal({ open, onClose, onSuccess }) {
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");

  const [visible, setVisible] = useState(false);

  // управляем плавным появлением
  useEffect(() => {
    if (open) {
      setVisible(true);
    } else {
      // даём анимации скрытия завершиться
      const timeout = setTimeout(() => setVisible(false), 250);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  if (!open && !visible) return null;

  const submit = (e) => {
    e.preventDefault();
    const user = { firstName, lastName, phone, gender };
    localStorage.setItem(LS_KEY, JSON.stringify(user));
    onSuccess?.(user);
    onClose?.();
  };

  return (
    <div
      className={`auth-back ${open ? "show" : "hide"}`}
      onClick={onClose}
    >
      <div
        className={`auth-modal ${open ? "popup-show" : "popup-hide"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="auth-title">
          <span>ВХОД</span> / РЕГИСТРАЦИЯ
        </h3>

        <form className="auth-form" onSubmit={submit}>
          <input
            className="auth-input"
            placeholder="Имя"
            value={firstName}
            onChange={(e) => setFirst(e.target.value)}
          />
          <input
            className="auth-input"
            placeholder="Фамилия"
            value={lastName}
            onChange={(e) => setLast(e.target.value)}
          />
          <input
            className="auth-input"
            placeholder="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div className="auth-gender">
            <button
              type="button"
              className={`gbtn ${gender === "М" ? "active" : ""}`}
              onClick={() => setGender("М")}
            >
              М
            </button>
            <div className="glabel">Выберите пол</div>
            <button
              type="button"
              className={`gbtn ${gender === "Ж" ? "active" : ""}`}
              onClick={() => setGender("Ж")}
            >
              Ж
            </button>
          </div>

          <button className="auth-submit" type="submit">
            ВОЙТИ
          </button>
        </form>
      </div>
    </div>
  );
}
