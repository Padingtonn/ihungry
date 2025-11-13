import { useEffect, useMemo, useState } from "react";

const LS_USER = "ih_user";
const LS_WELCOME_SEEN = "ih_welcome_seen";

export default function Mascot() {
  // читаем пользователя из localStorage
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(LS_USER)) || null; }
    catch { return null; }
  }, []);

  const displayName =
    user?.nickname || user?.nick || user?.firstName || user?.login || null;

  // текущее сообщение и видимость
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // сообщения (с персонализацией)
  const messages = useMemo(() => ([
    displayName
      ? `Привет, ${displayName}! Рад тебя видеть в IHungry 🦝`
      : "Приветствуем тебя, дорогой пользователь! 🦝",
    "Желаю вам отлично покушать! Я помогу подобрать рецепты, план и список покупок.",
    "Нажми на меня ещё раз, чтобы скрыть подсказку или переключать сообщения 😉",
  ]), [displayName]);

  // автоприветствие 1 раз
  useEffect(() => {
    const seen = localStorage.getItem(LS_WELCOME_SEEN);
    if (!seen) {
      setOpen(true);
      localStorage.setItem(LS_WELCOME_SEEN, "1");
    }
  }, []);

  const onClickMascot = () => {
    if (!open) {
      setOpen(true);
      setStep(0);
      return;
    }
    // если уже открыто — листаем, затем закрываем
    if (step < messages.length - 1) setStep(s => s + 1);
    else setOpen(false);
  };

  return (
    <div className="mascotWrap">
      <button className="mascotBtn" onClick={onClickMascot} aria-label="Маскот енот">
        <img src="/mascot.svg" alt="Енот с пиццей" />
      </button>

      {open && (
        <div className="speech" onClick={() => setOpen(false)}>
          <div className="speech-text">{messages[step]}</div>
          <div className="speech-tip" />
        </div>
      )}
    </div>
  );
}
