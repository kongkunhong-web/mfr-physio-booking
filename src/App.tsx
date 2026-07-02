import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LockKeyhole,
  LogIn,
  RotateCcw,
  Stethoscope,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Gender = "male" | "female";
type Preference = "any" | "male" | "female";
type Step = "login" | "preference" | "calendar" | "confirmation";

type Therapist = {
  id: string;
  gender: Gender;
};

type Appointment = {
  date: string;
  time: string;
  therapistId: string;
  gender: Gender;
};

type Booking = {
  preference: Preference;
  sessionCount: number;
  appointments: Appointment[];
  createdAt: string;
};

type CellState =
  | {
      status: "selected";
      label: string;
      appointment: Appointment;
    }
  | {
      status: "available";
      label: string;
      appointment: Appointment;
    }
  | {
      status: "disabled";
      reason: string;
    };

const STORAGE_KEY = "mfr-physio-booking-v1";
const TEST_ID = "6661";
const TEST_PHONE = "28313731";
const SESSION_OPTIONS = [6, 7, 8];
const MAX_WEEKS = 12;

const therapists: Therapist[] = [
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `M${String(index + 1).padStart(2, "0")}`,
    gender: "male" as const,
  })),
  ...Array.from({ length: 5 }, (_, index) => ({
    id: `F${String(index + 1).padStart(2, "0")}`,
    gender: "female" as const,
  })),
];

const preferenceCopy: Record<
  Preference,
  { title: string; caption: string; badge: string }
> = {
  any: {
    title: "不指定治療師",
    caption: "由系統配對最快可完成療程的治療師。",
    badge: "最快預約",
  },
  male: {
    title: "指定男治療師",
    caption: "只顯示男治療師可提供的時段，排期可能較長。",
    badge: "男治療師",
  },
  female: {
    title: "指定女治療師",
    caption: "只顯示女治療師可提供的時段，排期可能較長。",
    badge: "女治療師",
  },
};

const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];
const timeSlots = makeTimeSlots();

function App() {
  const [step, setStep] = useState<Step>("login");
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loginError, setLoginError] = useState("");
  const [preference, setPreference] = useState<Preference>("any");
  const [sessionCount, setSessionCount] = useState(6);
  const [selected, setSelected] = useState<Appointment[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      setBooking(JSON.parse(stored) as Booking);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const today = useMemo(() => startOfDay(new Date()), []);
  const visibleWeek = useMemo(() => {
    const base = addDays(getMonday(today), weekOffset * 7);
    return Array.from({ length: 5 }, (_, index) => addDays(base, index));
  }, [today, weekOffset]);

  const lockedTherapist = selected[0]?.therapistId ?? null;
  const lockedTime = selected[0]?.time ?? null;

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (idNumber.trim() === TEST_ID && phone.trim() === TEST_PHONE) {
      setLoginError("");
      setStep(booking ? "confirmation" : "preference");
      return;
    }

    setLoginError("資料未能核對，請確認身份證及電話號碼。");
  }

  function startBooking() {
    setSelected([]);
    setWeekOffset(0);
    setStep("calendar");
  }

  function commitBooking() {
    if (selected.length !== sessionCount) return;

    const nextBooking: Booking = {
      preference,
      sessionCount,
      appointments: selected,
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBooking));
    setBooking(nextBooking);
    setStep("confirmation");
  }

  function resetDemo() {
    window.localStorage.removeItem(STORAGE_KEY);
    setBooking(null);
    setSelected([]);
    setPreference("any");
    setSessionCount(6);
    setWeekOffset(0);
    setStep("preference");
  }

  function handleCellClick(cell: CellState) {
    if (cell.status === "disabled") return;

    if (cell.status === "selected") {
      const nextSelected = selected
        .filter(
          (item) =>
            !(item.date === cell.appointment.date && item.time === cell.appointment.time),
        )
        .sort(sortAppointments);
      setSelected(nextSelected);
      return;
    }

    if (selected.length >= sessionCount) return;
    setSelected([...selected, cell.appointment].sort(sortAppointments));
  }

  const displayBooking = booking ?? {
    preference,
    sessionCount,
    appointments: selected,
    createdAt: "",
  };

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="系統狀態">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Stethoscope size={22} />
          </span>
          <div>
            <p className="eyebrow">醫院物理治療部</p>
            <h1>物理治療預約</h1>
          </div>
        </div>
        <div className="status-pill">
          <span />
          Demo
        </div>
      </section>

      {step === "login" && (
        <section className="panel login-panel">
          <div className="section-heading">
            <LockKeyhole size={26} />
            <div>
              <p className="eyebrow">就診者登入</p>
              <h2>請輸入短訊內相同的個人資料</h2>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleLogin}>
            <label>
              身份證
              <input
                inputMode="numeric"
                value={idNumber}
                onChange={(event) => setIdNumber(event.target.value)}
                placeholder="例如 6661"
              />
            </label>
            <label>
              電話號碼
              <input
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="例如 28313731"
              />
            </label>
            {loginError && <p className="form-error">{loginError}</p>}
            <button className="primary-button" type="submit">
              <LogIn size={19} />
              登入預約
            </button>
          </form>
        </section>
      )}

      {step === "preference" && (
        <section className="panel">
          <div className="section-heading">
            <UserRoundCheck size={26} />
            <div>
              <p className="eyebrow">治療師偏好</p>
              <h2>請選擇你接受的治療師安排</h2>
            </div>
          </div>

          <div className="choice-grid">
            {(Object.keys(preferenceCopy) as Preference[]).map((key) => (
              <button
                className={`choice-card ${preference === key ? "active" : ""}`}
                key={key}
                onClick={() => setPreference(key)}
                type="button"
              >
                <span>{preferenceCopy[key].badge}</span>
                <strong>{preferenceCopy[key].title}</strong>
                <small>{preferenceCopy[key].caption}</small>
              </button>
            ))}
          </div>

          <div className="session-selector" aria-label="療程堂數">
            <div>
              <p className="eyebrow">療程堂數</p>
              <h3>每個療程最少 6 堂，最多 8 堂</h3>
            </div>
            <div className="segmented">
              {SESSION_OPTIONS.map((count) => (
                <button
                  className={sessionCount === count ? "active" : ""}
                  key={count}
                  onClick={() => setSessionCount(count)}
                  type="button"
                >
                  {count} 堂
                </button>
              ))}
            </div>
          </div>

          <button className="primary-button wide" onClick={startBooking} type="button">
            <CalendarDays size={19} />
            選擇時段
          </button>
        </section>
      )}

      {step === "calendar" && (
        <section className="calendar-layout">
          <div className="panel sidebar">
            <p className="eyebrow">預約條件</p>
            <h2>{preferenceCopy[preference].title}</h2>
            <div className="rule-list">
              <span>已選 {selected.length} / {sessionCount} 堂</span>
              <span>{lockedTherapist ? `固定治療師 ${lockedTherapist}` : "第一堂將決定治療師"}</span>
              <span>{lockedTime ? `固定時間 ${lockedTime}` : "第一堂將決定固定鐘點"}</span>
              <span>每週最多 2 堂，兩堂相隔至少 1 日</span>
            </div>

            <div className="mini-summary">
              {selected.length === 0 ? (
                <p>請先在右方週曆選擇第一堂。</p>
              ) : (
                selected.map((item, index) => (
                  <div key={`${item.date}-${item.time}`}>
                    <strong>第 {index + 1} 堂</strong>
                    <span>{formatDate(item.date)} {item.time}</span>
                    <small>{item.therapistId}</small>
                  </div>
                ))
              )}
            </div>

            <button
              className="primary-button wide"
              disabled={selected.length !== sessionCount}
              onClick={commitBooking}
              type="button"
            >
              <Check size={19} />
              確認預約
            </button>
            <button className="ghost-button wide" onClick={() => setStep("preference")} type="button">
              返回修改條件
            </button>
          </div>

          <div className="panel calendar-panel">
            <div className="calendar-header">
              <div>
                <p className="eyebrow">週曆時間表</p>
                <h2>{formatDate(toDateKey(visibleWeek[0]))} - {formatDate(toDateKey(visibleWeek[4]))}</h2>
              </div>
              <div className="week-controls">
                <button
                  aria-label="上一週"
                  disabled={weekOffset === 0}
                  onClick={() => setWeekOffset((value) => Math.max(0, value - 1))}
                  type="button"
                >
                  <ChevronLeft size={19} />
                </button>
                <button
                  aria-label="下一週"
                  disabled={weekOffset >= MAX_WEEKS - 1}
                  onClick={() => setWeekOffset((value) => Math.min(MAX_WEEKS - 1, value + 1))}
                  type="button"
                >
                  <ChevronRight size={19} />
                </button>
              </div>
            </div>

            <div className="calendar-scroll" role="region" aria-label="可選預約時段">
              <div className="calendar-grid">
                <div className="grid-head time-head">
                  <Clock3 size={17} />
                </div>
                {visibleWeek.map((date) => (
                  <div className="grid-head" key={date.toISOString()}>
                    <strong>星期{weekdayNames[date.getDay()]}</strong>
                    <span>{formatMonthDay(date)}</span>
                  </div>
                ))}

                {timeSlots.map((time) => (
                  <CalendarRow
                    key={time}
                    onCellClick={handleCellClick}
                    preference={preference}
                    selected={selected}
                    sessionCount={sessionCount}
                    time={time}
                    today={today}
                    visibleWeek={visibleWeek}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {step === "confirmation" && (
        <section className="panel confirmation-panel">
          <div className="success-mark">
            <Check size={30} />
          </div>
          <p className="eyebrow">預約已保存</p>
          <h2>你的物理治療療程已完成選時</h2>
          <p className="confirmation-copy">
            {preferenceCopy[displayBooking.preference].title}，共 {displayBooking.sessionCount} 堂。
            請按以下時間到物理治療部登記。
          </p>

          <div className="appointment-list">
            {displayBooking.appointments.map((item, index) => (
              <div key={`${item.date}-${item.time}-${item.therapistId}`}>
                <strong>第 {index + 1} 堂</strong>
                <span>{formatDate(item.date)} {timeWithWeekday(item.date, item.time)}</span>
                <small>{genderText(item.gender)}治療師 {item.therapistId}</small>
              </div>
            ))}
          </div>

          <div className="confirmation-actions">
            <button className="ghost-button" onClick={() => setStep("preference")} type="button">
              <RotateCcw size={18} />
              重新選擇
            </button>
            <button className="danger-button" onClick={resetDemo} type="button">
              <Trash2 size={18} />
              清除示範資料
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function CalendarRow({
  onCellClick,
  preference,
  selected,
  sessionCount,
  time,
  today,
  visibleWeek,
}: {
  onCellClick: (cell: CellState) => void;
  preference: Preference;
  selected: Appointment[];
  sessionCount: number;
  time: string;
  today: Date;
  visibleWeek: Date[];
}) {
  return (
    <>
      <div className="time-label">{time}</div>
      {visibleWeek.map((date) => {
        const cell = getCellState({
          date,
          preference,
          selected,
          sessionCount,
          time,
          today,
        });
        const key = `${toDateKey(date)}-${time}`;

        return (
          <button
            className={`slot-cell ${cell.status}`}
            disabled={cell.status === "disabled"}
            key={key}
            onClick={() => onCellClick(cell)}
            title={cell.status === "disabled" ? cell.reason : cell.label}
            type="button"
          >
            {cell.status === "disabled" ? (
              <span>{cell.reason}</span>
            ) : (
              <>
                <strong>{cell.label}</strong>
                <span>{cell.appointment.therapistId}</span>
              </>
            )}
          </button>
        );
      })}
    </>
  );
}

function getCellState({
  date,
  preference,
  selected,
  sessionCount,
  time,
  today,
}: {
  date: Date;
  preference: Preference;
  selected: Appointment[];
  sessionCount: number;
  time: string;
  today: Date;
}): CellState {
  const dateKey = toDateKey(date);
  const selectedCell = selected.find((item) => item.date === dateKey && item.time === time);

  if (selectedCell) {
    return {
      status: "selected",
      label: "已選",
      appointment: selectedCell,
    };
  }

  if (startOfDay(date) < today) {
    return { status: "disabled", reason: "日期已過" };
  }

  if (dateKey === toDateKey(today) && isPastTime(time)) {
    return { status: "disabled", reason: "時間已過" };
  }

  if (selected.length >= sessionCount) {
    return { status: "disabled", reason: "已選滿" };
  }

  if (selected.length > 0 && time !== selected[0].time) {
    return { status: "disabled", reason: "須同一時間" };
  }

  const weeklyCount = selected.filter((item) => sameWeek(item.date, dateKey)).length;
  if (weeklyCount >= 2) {
    return { status: "disabled", reason: "同週已滿" };
  }

  const tooClose = selected.some(
    (item) => sameWeek(item.date, dateKey) && Math.abs(daysBetween(item.date, dateKey)) < 2,
  );
  if (tooClose) {
    return { status: "disabled", reason: "需隔一日" };
  }

  const candidates = getCandidateTherapists(preference, selected);
  const therapist = candidates.find((candidate) => isTherapistAvailable(candidate, dateKey, time));

  if (!therapist) {
    return { status: "disabled", reason: "暫無空檔" };
  }

  return {
    status: "available",
    label: selected.length === 0 ? "可選首診" : "可選",
    appointment: {
      date: dateKey,
      time,
      therapistId: therapist.id,
      gender: therapist.gender,
    },
  };
}

function getCandidateTherapists(preference: Preference, selected: Appointment[]) {
  if (selected[0]) {
    return therapists.filter((therapist) => therapist.id === selected[0].therapistId);
  }

  if (preference === "any") {
    return therapists;
  }

  return therapists.filter((therapist) => therapist.gender === preference);
}

function isTherapistAvailable(therapist: Therapist, date: string, time: string) {
  const score = hash(`${therapist.id}-${date}-${time}`);
  const hour = Number(time.split(":")[0]);
  const lunchPenalty = time === "12:30" || time === "13:00";
  const eveningPenalty = hour >= 17;
  const threshold = lunchPenalty ? 76 : eveningPenalty ? 68 : 42;

  return score % 100 >= threshold;
}

function makeTimeSlots() {
  const slots: string[] = [];
  for (let minutes = 8 * 60 + 30; minutes <= 18 * 60; minutes += 30) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }
  return slots;
}

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getMonday(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(startOfDay(date), diff);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatMonthDay(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDate(dateKey: string) {
  const date = fromDateKey(dateKey);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function timeWithWeekday(dateKey: string, time: string) {
  const date = fromDateKey(dateKey);
  return `星期${weekdayNames[date.getDay()]} ${time}`;
}

function isPastTime(time: string) {
  const now = new Date();
  const [hour, minute] = time.split(":").map(Number);
  const slot = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
  return slot <= now;
}

function sameWeek(left: string, right: string) {
  return toDateKey(getMonday(fromDateKey(left))) === toDateKey(getMonday(fromDateKey(right)));
}

function daysBetween(left: string, right: string) {
  const leftTime = fromDateKey(left).getTime();
  const rightTime = fromDateKey(right).getTime();
  return Math.round((rightTime - leftTime) / 86_400_000);
}

function sortAppointments(left: Appointment, right: Appointment) {
  return `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`);
}

function genderText(gender: Gender) {
  return gender === "male" ? "男" : "女";
}

export default App;
