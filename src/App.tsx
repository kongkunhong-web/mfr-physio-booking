import {
  Activity,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  PhoneCall,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Route = "home" | "patient" | "admin";
type ServiceArea = "ELE" | "GYM";
type Gender = "male" | "female" | "unknown";
type GenderPreference = "any" | "male" | "female";

type Therapist = {
  id: string;
  name: string;
  service_area: ServiceArea;
  code: string;
  gender: Gender;
  active: number;
  alias?: string;
};

type Doctor = {
  id: string;
  code: string;
  name: string;
  quota: number;
  active: number;
};

type Patient = {
  id: string;
  patient_code: string;
  display_name: string;
  doctor_id: string;
  doctor_code?: string;
  service_area: ServiceArea;
  subtype: string;
  gender_preference: GenderPreference;
  session_count: number;
  status: "draft" | "pending" | "active" | "booked";
  rules_accepted_at?: string | null;
  activated_at?: string | null;
  idNumberTail?: string;
  phoneTail?: string;
  id_number?: string;
  phone?: string;
};

type Appointment = {
  id?: string;
  date: string;
  time: string;
  therapistId: string;
  therapistAlias?: string;
  therapist_name?: string;
  session_no?: number;
};

type Slot = {
  date: string;
  time: string;
  therapistId: string;
  therapistAlias: string;
  capacity: number;
  booked: number;
  available: boolean;
  reason: string;
};

type Availability = {
  patient: Patient;
  dates: string[];
  times: string[];
  therapists: Therapist[];
  slots: Slot[];
  booking: Booking | null;
};

type Booking = {
  id: string;
  patient_id: string;
  appointments: Appointment[];
};

type AdminData = {
  therapists: Therapist[];
  doctors: Doctor[];
  unavailable: Array<Record<string, any>>;
  patients: Patient[];
  smsLogs: Array<Record<string, any>>;
  helpRequests: Array<Record<string, any>>;
  capacities: Array<Record<string, any>>;
  dashboard: Record<string, any>;
  subtypes: Record<ServiceArea, string[]>;
  helpPhone: string;
};

const HELP_PHONE = "89305130";
const ADMIN_SESSION_KEY = "mfr-admin-session-v2";
const SUBTYPES: Record<ServiceArea, string[]> = {
  ELE: ["ELE-1", "ELE-2", "ELE-3"],
  GYM: ["GYM-1", "GYM-1/2", "GYM-3", "GYM-3-1"],
};
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const SESSION_OPTIONS = Array.from({ length: 7 }, (_, index) => index + 6);

function App() {
  const [route, setRoute] = useState<Route>(() => routeFromPath(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function go(next: Route) {
    const path = next === "home" ? "/" : `/${next}`;
    window.history.pushState({}, "", path);
    setRoute(next);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" onClick={() => go("home")} type="button">
          <span className="brand-mark">
            <Stethoscope size={24} />
          </span>
          <span>
            <small>示範系統</small>
            <strong>物理治療排更預約</strong>
          </span>
        </button>
        <span className="status-pill">Cloudflare D1 Demo</span>
      </header>

      {route === "home" && <Home go={go} />}
      {route === "patient" && <PatientPortal go={go} />}
      {route === "admin" && <AdminPortal />}
    </main>
  );
}

function Home({ go }: { go: (route: Route) => void }) {
  return (
    <section className="home-grid">
      <div className="intro-panel">
        <p className="eyebrow">MFR Physiotherapy</p>
        <h1>前台給就診者選擇時間，後台給職員開通帳號和管理排期。</h1>
        <p>
          Demo 已改成共享資料模式：後台設定患者條件、治療師、醫生 quota、不可預約時段和容量；前台只顯示該患者可選的治療師代號與時間。
        </p>
      </div>
      <button className="entry-card patient-entry" onClick={() => go("patient")} type="button">
        <PhoneCall size={28} />
        <strong>就診者預約</strong>
        <span>輸入身份證和電話後選擇治療時間</span>
      </button>
      <button className="entry-card admin-entry" onClick={() => go("admin")} type="button">
        <LayoutDashboard size={28} />
        <strong>後台管理</strong>
        <span>患者開通、排更、月曆和統計</span>
      </button>
    </section>
  );
}

function PatientPortal({ go }: { go: (route: Route) => void }) {
  const [idNumber, setIdNumber] = useState("6661");
  const [phone, setPhone] = useState("28313731");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [selected, setSelected] = useState<Appointment[]>([]);
  const [weekIndex, setWeekIndex] = useState(0);
  const [rulesReady, setRulesReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const data = await api<any>("/api/patient/login", {
        method: "POST",
        body: { idNumber, phone },
      });
      if (data.status === "pending") {
        setPatient(null);
        setAvailability(null);
        setNotice(data.message);
        return;
      }
      setPatient(data.patient);
      setBooking(data.booking);
      setRulesReady(Boolean(data.patient.rules_accepted_at || data.booking));
      if (data.patient.rules_accepted_at || data.booking) await loadAvailability(data.patient.id);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function loadAvailability(patientId = patient?.id ?? "") {
    if (!patientId) return;
    const data = await api<Availability>(`/api/patient/availability?patientId=${encodeURIComponent(patientId)}`);
    setAvailability(data);
    setBooking(data.booking);
    if (data.booking?.appointments) {
      setSelected(
        data.booking.appointments.map((item) => {
          const therapistId = item.therapistId ?? (item as any).therapist_id;
          return {
          date: item.date,
          time: item.time,
          therapistId,
          therapistAlias: data.therapists.find((therapist) => therapist.id === therapistId)?.alias,
          therapist_name: item.therapist_name,
          session_no: item.session_no,
        };
        }),
      );
    }
  }

  async function acceptRules() {
    if (!patient) return;
    setBusy(true);
    try {
      await api("/api/patient/accept-rules", { method: "POST", body: { patientId: patient.id } });
      setRulesReady(true);
      await loadAvailability(patient.id);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function requestHelp() {
    await api("/api/patient/help", {
      method: "POST",
      body: { patientId: patient?.id, idNumber, phone, note: "患者在登入或預約時按下致電求助" },
    }).catch(() => null);
    setNotice(`請致電 ${HELP_PHONE}，後台職員會協助你完成預約。`);
  }

  async function confirmBooking() {
    if (!patient) return;
    setBusy(true);
    setNotice("");
    try {
      const data = await api<{ booking: Booking }>("/api/patient/book", {
        method: "POST",
        body: { patientId: patient.id, appointments: selected },
      });
      setBooking(data.booking);
      await loadAvailability(patient.id);
      setNotice("預約已確認，以下是你的療程時間。");
    } catch (error) {
      setNotice(errorMessage(error));
      await loadAvailability(patient.id);
    } finally {
      setBusy(false);
    }
  }

  const weekDates = availability?.dates.slice(weekIndex * 4, weekIndex * 4 + 4) ?? [];
  const maxWeek = Math.max(0, Math.ceil((availability?.dates.length ?? 0) / 4) - 1);

  return (
    <section className="stack">
      <div className="section-title">
        <button className="ghost-button compact" onClick={() => go("home")} type="button">
          <ChevronLeft size={18} />
          返回
        </button>
        <div>
          <p className="eyebrow">就診者前台</p>
          <h1>線上選擇物理治療時間</h1>
        </div>
        <button className="help-button" onClick={requestHelp} type="button">
          <PhoneCall size={18} />
          致電求助
        </button>
      </div>

      {!patient && (
        <section className="panel narrow">
          <div className="panel-heading">
            <LockKeyhole size={24} />
            <div>
              <p className="eyebrow">登入</p>
              <h2>請輸入短訊內指定的個人資料</h2>
            </div>
          </div>
          <form className="form-grid" onSubmit={login}>
            <label>
              身份證號碼
              <input inputMode="numeric" value={idNumber} onChange={(event) => setIdNumber(event.target.value)} />
            </label>
            <label>
              電話號碼
              <input inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <button className="primary-button" disabled={busy} type="submit">
              <LogIn size={18} />
              進入預約系統
            </button>
          </form>
          {notice && <Notice text={notice} />}
        </section>
      )}

      {patient && !rulesReady && (
        <section className="panel narrow">
          <div className="panel-heading">
            <ClipboardCheck size={24} />
            <div>
              <p className="eyebrow">預約規則</p>
              <h2>請先閱讀並同意以下安排</h2>
            </div>
          </div>
          <div className="rule-cards">
            <span>每位就診者由後台預先設定療程種類、治療師性別限制及堂數。</span>
            <span>可選星期二至星期五；同一星期最多兩堂，兩堂之間最少相隔一日。</span>
            <span>確認後整個療程會固定同一位治療師及同一個時間。</span>
            <span>如不懂操作，可按「致電求助」由職員協助預約。</span>
          </div>
          <button className="primary-button" disabled={busy} onClick={acceptRules} type="button">
            <ShieldCheck size={18} />
            我已明白並開始選擇
          </button>
        </section>
      )}

      {patient && rulesReady && availability && (
        <section className="booking-layout">
          <aside className="panel booking-side">
            <p className="eyebrow">患者條件</p>
            <h2>{patient.display_name}</h2>
            <div className="info-list">
              <span>{patient.service_area} / {patient.subtype}</span>
              <span>{genderPreferenceText(patient.gender_preference)}</span>
              <span>需預約 {patient.session_count} 堂</span>
              <span>{lockedSummary(selected)}</span>
            </div>
            <div className="selected-list">
              {selected.length === 0 ? (
                <p>請在右方時間表逐堂點選。</p>
              ) : (
                selected.map((item, index) => (
                  <div key={`${item.date}-${item.time}-${item.therapistId}`}>
                    <strong>第 {index + 1} 堂</strong>
                    <span>{formatDate(item.date)} {weekdayText(item.date)} {item.time}</span>
                    <small>{aliasFor(availability, item.therapistId)}</small>
                  </div>
                ))
              )}
            </div>
            <button
              className="primary-button wide"
              disabled={busy || selected.length !== patient.session_count}
              onClick={confirmBooking}
              type="button"
            >
              <Check size={18} />
              確認 {selected.length}/{patient.session_count} 堂
            </button>
            <button className="ghost-button wide" onClick={() => loadAvailability(patient.id)} type="button">
              <RefreshCw size={18} />
              重新整理可選時段
            </button>
          </aside>

          <section className="panel calendar-panel">
            <div className="calendar-header">
              <div>
                <p className="eyebrow">可選時間</p>
                <h2>{weekDates[0] ? `${formatDate(weekDates[0])} 至 ${formatDate(weekDates[weekDates.length - 1])}` : "沒有可選日期"}</h2>
              </div>
              <div className="week-controls">
                <button disabled={weekIndex <= 0} onClick={() => setWeekIndex((value) => Math.max(0, value - 1))} type="button" aria-label="上一週">
                  <ChevronLeft size={18} />
                </button>
                <button disabled={weekIndex >= maxWeek} onClick={() => setWeekIndex((value) => Math.min(maxWeek, value + 1))} type="button" aria-label="下一週">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <PatientCalendar
              availability={availability}
              dates={weekDates}
              selected={selected}
              setSelected={setSelected}
            />
          </section>
        </section>
      )}

      {booking && (
        <section className="panel">
          <div className="panel-heading">
            <Check size={24} />
            <div>
              <p className="eyebrow">已確認預約</p>
              <h2>療程摘要</h2>
            </div>
          </div>
          <div className="summary-grid">
            {booking.appointments?.map((item, index) => (
              <div className="summary-card" key={`${item.date}-${item.time}-${index}`}>
                <strong>第 {index + 1} 堂</strong>
                <span>{formatDate(item.date)} {weekdayText(item.date)} {item.time}</span>
                <small>{item.therapist_name || aliasFor(availability, (item as any).therapist_id || item.therapistId)}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {patient && notice && <Notice text={notice} />}
    </section>
  );
}

function PatientCalendar({
  availability,
  dates,
  selected,
  setSelected,
}: {
  availability: Availability;
  dates: string[];
  selected: Appointment[];
  setSelected: React.Dispatch<React.SetStateAction<Appointment[]>>;
}) {
  const slotMap = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of availability.slots) {
      const key = `${slot.date}|${slot.time}`;
      map.set(key, [...(map.get(key) ?? []), slot]);
    }
    return map;
  }, [availability.slots]);

  function toggle(slot: Slot) {
    const exact = selected.find((item) => sameAppointment(item, slot));
    if (exact) {
      setSelected((items) => items.filter((item) => !sameAppointment(item, slot)));
      return;
    }
    const state = slotState(slot, selected, availability.patient.session_count);
    if (state.disabled) return;
    setSelected((items) =>
      [...items, { date: slot.date, time: slot.time, therapistId: slot.therapistId, therapistAlias: slot.therapistAlias }]
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    );
  }

  return (
    <div className="calendar-scroll">
      <div className="patient-grid" style={{ gridTemplateColumns: `78px repeat(${Math.max(dates.length, 1)}, minmax(180px, 1fr))` }}>
        <div className="grid-head">時間</div>
        {dates.map((date) => (
          <div className="grid-head" key={date}>
            <strong>{weekdayText(date)}</strong>
            <span>{formatDate(date)}</span>
          </div>
        ))}
        {availability.times.map((time) => (
          <div className="grid-row" key={time}>
            <div className="time-label">{time}</div>
            {dates.map((date) => {
              const slots = slotMap.get(`${date}|${time}`) ?? [];
              return (
                <div className="slot-stack" key={`${date}-${time}`}>
                  {slots.length === 0 ? (
                    <span className="empty-slot">未開放</span>
                  ) : (
                    slots.map((slot) => {
                      const state = slotState(slot, selected, availability.patient.session_count);
                      return (
                        <button
                          className={`therapist-slot ${state.selected ? "selected" : ""}`}
                          disabled={state.disabled}
                          key={`${slot.therapistId}-${slot.date}-${slot.time}`}
                          onClick={() => toggle(slot)}
                          title={state.reason || `${slot.therapistAlias} 尚餘 ${Math.max(0, slot.capacity - slot.booked)} 位`}
                          type="button"
                        >
                          <strong>{slot.therapistAlias}</strong>
                          <span>{state.selected ? "已選" : state.reason || `餘 ${Math.max(0, slot.capacity - slot.booked)}`}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPortal() {
  const [session, setSession] = useState(() => window.localStorage.getItem(ADMIN_SESSION_KEY) || "");
  const [password, setPassword] = useState("admin");
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState("dashboard");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const result = await api<{ session: string }>("/api/admin/login", { method: "POST", body: { password } });
      window.localStorage.setItem(ADMIN_SESSION_KEY, result.session);
      setSession(result.session);
      await load(result.session);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function load(activeSession = session) {
    if (!activeSession) return;
    const next = await api<AdminData>("/api/admin/bootstrap", { session: activeSession });
    setData(next);
  }

  useEffect(() => {
    if (session) load(session).catch(() => window.localStorage.removeItem(ADMIN_SESSION_KEY));
  }, []);

  if (!session || !data) {
    return (
      <section className="panel narrow">
        <div className="panel-heading">
          <LockKeyhole size={24} />
          <div>
            <p className="eyebrow">後台管理</p>
            <h1>物理治療排更預約系統</h1>
          </div>
        </div>
        <form className="form-grid" onSubmit={login}>
          <label>
            Demo 密碼
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          <button className="primary-button" disabled={busy} type="submit">
            <LogIn size={18} />
            登入後台
          </button>
        </form>
        {notice && <Notice text={notice} />}
      </section>
    );
  }

  const tabs = [
    ["dashboard", "儀表板", LayoutDashboard],
    ["patients", "患者開通", UserPlus],
    ["calendar", "月曆排期", CalendarDays],
    ["settings", "資料設定", Settings],
    ["logs", "SMS/求助", ClipboardList],
  ] as const;

  return (
    <section className="admin-shell">
      <div className="section-title">
        <div>
          <p className="eyebrow">後台</p>
          <h1>物理治療排更預約系統</h1>
        </div>
        <button className="ghost-button compact" onClick={() => load()} type="button">
          <RefreshCw size={18} />
          更新資料
        </button>
      </div>

      <nav className="tabbar">
        {tabs.map(([key, label, Icon]) => (
          <button className={tab === key ? "active" : ""} key={key} onClick={() => setTab(key)} type="button">
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      {tab === "dashboard" && <Dashboard data={data} />}
      {tab === "patients" && <PatientAdmin data={data} session={session} reload={load} setNotice={setNotice} />}
      {tab === "calendar" && <CalendarAdmin data={data} session={session} reload={load} setNotice={setNotice} />}
      {tab === "settings" && <SettingsAdmin data={data} session={session} reload={load} setNotice={setNotice} />}
      {tab === "logs" && <LogsAdmin data={data} session={session} reload={load} setNotice={setNotice} />}

      {notice && <Notice text={notice} />}
    </section>
  );
}

function Dashboard({ data }: { data: AdminData }) {
  const dashboard = data.dashboard || {};
  const status = dashboard.statusCounts ?? [];
  const totalPatients = sumCount(status);
  const bookedSessions = sumCount(dashboard.therapistLoad ?? [], "booked_sessions");
  return (
    <div className="stack">
      <div className="metric-grid">
        <Metric icon={<Users size={22} />} label="患者總數" value={totalPatients} />
        <Metric icon={<Check size={22} />} label="已預約堂數" value={bookedSessions} />
        <Metric icon={<Activity size={22} />} label="治療師" value={data.therapists.filter((item) => item.active).length} />
        <Metric icon={<PhoneCall size={22} />} label="求助紀錄" value={data.helpRequests.length} />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <LayoutDashboard size={22} />
          <h2>醫生轉介 quota</h2>
        </div>
        <DataTable
          rows={dashboard.doctorStats ?? []}
          columns={[
            ["code", "醫生"],
            ["name", "名稱"],
            ["quota", "Quota"],
            ["referred", "已轉介"],
            ["remaining", "剩餘"],
          ]}
        />
      </section>
      <section className="grid-two">
        <div className="panel">
          <div className="panel-heading"><Activity size={22} /><h2>治療師利用率</h2></div>
          <DataTable rows={dashboard.therapistLoad ?? []} columns={[["name", "治療師"], ["service_area", "類別"], ["booked_sessions", "堂數"]]} />
        </div>
        <div className="panel">
          <div className="panel-heading"><ClipboardList size={22} /><h2>分類需求</h2></div>
          <DataTable rows={dashboard.subtypeDemand ?? []} columns={[["service_area", "大類"], ["subtype", "子類"], ["count", "人數"]]} />
        </div>
      </section>
    </div>
  );
}

function PatientAdmin({
  data,
  session,
  reload,
  setNotice,
}: {
  data: AdminData;
  session: string;
  reload: (session?: string) => Promise<void>;
  setNotice: (value: string) => void;
}) {
  const [form, setForm] = useState({
    patient_code: "",
    display_name: "示範患者",
    id_number: "",
    phone: "",
    doctor_id: data.doctors[0]?.id ?? "",
    service_area: "ELE" as ServiceArea,
    subtype: "ELE-1",
    gender_preference: "any" as GenderPreference,
    session_count: 8,
    custom_session_count: "",
    status: "draft",
  });
  const [checked, setChecked] = useState<string[]>([]);
  const drafts = data.patients.filter((patient) => ["draft", "pending"].includes(patient.status));

  async function savePatient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api("/api/admin/patients", { method: "POST", session, body: form });
    setNotice("患者條件已暫存，可在下方二次核對後開通。");
    await reload(session);
  }

  async function activate() {
    await api("/api/admin/activate", { method: "POST", session, body: { patientIds: checked } });
    setChecked([]);
    setNotice("已開通患者帳號並生成 SMS 模擬紀錄。");
    await reload(session);
  }

  return (
    <section className="grid-two">
      <div className="panel">
        <div className="panel-heading"><UserPlus size={22} /><h2>患者條件錄入</h2></div>
        <form className="form-grid dense" onSubmit={savePatient}>
          <label>患者代號<input value={form.patient_code} onChange={(event) => setForm({ ...form, patient_code: event.target.value })} placeholder="可留空自動生成" /></label>
          <label>顯示名稱<input value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} /></label>
          <label>身份證<input value={form.id_number} onChange={(event) => setForm({ ...form, id_number: event.target.value })} required /></label>
          <label>電話<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></label>
          <label>轉介醫生<Select value={form.doctor_id} onChange={(value) => setForm({ ...form, doctor_id: value })} options={data.doctors.filter((item) => item.active).map((item) => [item.id, `${item.code} ${item.name}`])} /></label>
          <label>治療大類<Select value={form.service_area} onChange={(value) => setForm({ ...form, service_area: value as ServiceArea, subtype: SUBTYPES[value as ServiceArea][0] })} options={[["ELE", "ELE"], ["GYM", "GYM"]]} /></label>
          <label>治療子類<Select value={form.subtype} onChange={(value) => setForm({ ...form, subtype: value })} options={SUBTYPES[form.service_area].map((item) => [item, item])} /></label>
          <label>性別限制<Select value={form.gender_preference} onChange={(value) => setForm({ ...form, gender_preference: value as GenderPreference })} options={[["any", "不限"], ["male", "男治療師"], ["female", "女治療師"]]} /></label>
          <label>堂數<Select value={String(form.session_count)} onChange={(value) => setForm({ ...form, session_count: Number(value), custom_session_count: "" })} options={SESSION_OPTIONS.map((item) => [String(item), `${item} 堂`])} /></label>
          <label>自訂堂數<input inputMode="numeric" value={form.custom_session_count} onChange={(event) => setForm({ ...form, custom_session_count: event.target.value })} placeholder="特別個案才填" /></label>
          <button className="primary-button" type="submit"><Save size={18} />暫存患者</button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-heading"><ClipboardCheck size={22} /><h2>今日暫存清單及二次核對</h2></div>
        <div className="review-list">
          {drafts.map((patient) => (
            <label className="check-row" key={patient.id}>
              <input
                checked={checked.includes(patient.id)}
                onChange={(event) => setChecked((items) => event.target.checked ? [...items, patient.id] : items.filter((id) => id !== patient.id))}
                type="checkbox"
              />
              <span>
                <strong>{patient.display_name} {patient.patient_code}</strong>
                <small>{patient.service_area}/{patient.subtype} · {genderPreferenceText(patient.gender_preference)} · {patient.session_count} 堂 · Dr {patient.doctor_code}</small>
              </span>
            </label>
          ))}
        </div>
        <button className="primary-button wide" disabled={!checked.length} onClick={activate} type="button">
          <ShieldCheck size={18} />
          二次核對後一鍵開通 {checked.length} 位
        </button>
        <DataTable
          rows={data.patients.slice(0, 12)}
          columns={[["patient_code", "代號"], ["display_name", "患者"], ["service_area", "類別"], ["subtype", "子類"], ["session_count", "堂數"], ["status", "狀態"]]}
        />
      </div>
    </section>
  );
}

function CalendarAdmin({ data, session, reload, setNotice }: { data: AdminData; session: string; reload: (session?: string) => Promise<void>; setNotice: (value: string) => void }) {
  const [therapistId, setTherapistId] = useState(data.therapists[0]?.id ?? "");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [calendar, setCalendar] = useState<{ bookings: any[]; unavailable: any[] } | null>(null);
  const [capacity, setCapacity] = useState({ therapist_id: "", service_area: "ELE" as ServiceArea, subtype: "ELE-1", weekday: 2, time: "08:30", capacity: 1 });
  const [move, setMove] = useState({ appointmentId: "", therapistId: "", date: "", time: "" });

  async function loadCalendar() {
    const query = new URLSearchParams({ month });
    if (therapistId) query.set("therapistId", therapistId);
    setCalendar(await api(`/api/admin/calendar?${query}`, { session }));
  }

  useEffect(() => {
    loadCalendar().catch(() => null);
  }, [therapistId, month]);

  async function saveCapacity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api("/api/admin/capacity", { method: "POST", session, body: capacity });
    setNotice("容量已更新，前台會即時使用新容量。");
    await reload(session);
  }

  async function reschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api("/api/admin/reschedule", { method: "POST", session, body: move });
    setNotice("已改期或轉治療師。");
    await loadCalendar();
  }

  const bookingsByDate = groupBy(calendar?.bookings ?? [], "date");

  return (
    <section className="stack">
      <div className="panel toolbar-panel">
        <label>治療師<Select value={therapistId} onChange={setTherapistId} options={[["", "全部"], ...data.therapists.map((item) => [item.id, `${item.name} (${item.service_area})`])]} /></label>
        <label>月份<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
      </div>
      <div className="month-grid">
        {monthDays(month).map((date) => (
          <div className="day-card" key={date}>
            <strong>{date.slice(8)} {weekdayText(date)}</strong>
            <span>{(bookingsByDate[date] ?? []).length} 堂</span>
            {(bookingsByDate[date] ?? []).slice(0, 4).map((item: any) => (
              <small key={item.id}>{item.time} {item.display_name || item.patient_code}</small>
            ))}
          </div>
        ))}
      </div>
      <section className="grid-two">
        <div className="panel">
          <div className="panel-heading"><Settings size={22} /><h2>逐格容量修改</h2></div>
          <form className="form-grid dense" onSubmit={saveCapacity}>
            <label>套用治療師<Select value={capacity.therapist_id} onChange={(value) => setCapacity({ ...capacity, therapist_id: value })} options={[["", "通用容量"], ...data.therapists.map((item) => [item.id, item.name])]} /></label>
            <label>大類<Select value={capacity.service_area} onChange={(value) => setCapacity({ ...capacity, service_area: value as ServiceArea, subtype: SUBTYPES[value as ServiceArea][0] })} options={[["ELE", "ELE"], ["GYM", "GYM"]]} /></label>
            <label>子類<Select value={capacity.subtype} onChange={(value) => setCapacity({ ...capacity, subtype: value })} options={SUBTYPES[capacity.service_area].map((item) => [item, item])} /></label>
            <label>星期<Select value={String(capacity.weekday)} onChange={(value) => setCapacity({ ...capacity, weekday: Number(value) })} options={[["2", "星期二"], ["3", "星期三"], ["4", "星期四"], ["5", "星期五"]]} /></label>
            <label>時間<input value={capacity.time} onChange={(event) => setCapacity({ ...capacity, time: event.target.value })} placeholder="08:30" /></label>
            <label>容量<input inputMode="numeric" value={capacity.capacity} onChange={(event) => setCapacity({ ...capacity, capacity: Number(event.target.value) })} /></label>
            <button className="primary-button" type="submit"><Save size={18} />保存容量</button>
          </form>
        </div>
        <div className="panel">
          <div className="panel-heading"><RefreshCw size={22} /><h2>內部改期/轉治療師</h2></div>
          <form className="form-grid dense" onSubmit={reschedule}>
            <label>預約堂 ID<Select value={move.appointmentId} onChange={(value) => setMove({ ...move, appointmentId: value })} options={(calendar?.bookings ?? []).map((item: any) => [item.id, `${item.date} ${item.time} ${item.display_name}`])} /></label>
            <label>新治療師<Select value={move.therapistId} onChange={(value) => setMove({ ...move, therapistId: value })} options={data.therapists.map((item) => [item.id, item.name])} /></label>
            <label>新日期<input type="date" value={move.date} onChange={(event) => setMove({ ...move, date: event.target.value })} /></label>
            <label>新時間<input value={move.time} onChange={(event) => setMove({ ...move, time: event.target.value })} placeholder="08:30" /></label>
            <button className="primary-button" type="submit"><Save size={18} />檢查容量並保存</button>
          </form>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading"><ClipboardList size={22} /><h2>月內預約詳情</h2></div>
        <DataTable rows={calendar?.bookings ?? []} columns={[["date", "日期"], ["time", "時間"], ["therapist_name", "治療師"], ["display_name", "患者"], ["service_area", "類別"], ["subtype", "子類"]]} />
      </section>
    </section>
  );
}

function SettingsAdmin({ data, session, reload, setNotice }: { data: AdminData; session: string; reload: (session?: string) => Promise<void>; setNotice: (value: string) => void }) {
  const [therapist, setTherapist] = useState({ name: "", service_area: "ELE" as ServiceArea, code: "", gender: "unknown" as Gender });
  const [doctor, setDoctor] = useState({ code: "", name: "", quota: 30 });
  const [unavailable, setUnavailable] = useState({ therapist_id: data.therapists[0]?.id ?? "", start_date: "", end_date: "", start_time: "", end_time: "", all_day: true, reason: "" });

  async function saveTherapist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api("/api/admin/therapists", { method: "POST", session, body: therapist });
    setNotice("治療師已保存。");
    await reload(session);
  }

  async function saveDoctor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api("/api/admin/doctors", { method: "POST", session, body: doctor });
    setNotice("醫生資料已保存。");
    await reload(session);
  }

  async function saveUnavailable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api("/api/admin/unavailable", { method: "POST", session, body: unavailable });
    setNotice("不可預約時段已保存，前台會即時封鎖。");
    await reload(session);
  }

  async function remove(kind: "therapists" | "doctors" | "unavailable", id: string) {
    await api(`/api/admin/${kind}/${encodeURIComponent(id)}`, { method: "DELETE", session });
    setNotice("已更新。");
    await reload(session);
  }

  return (
    <section className="stack">
      <section className="grid-three">
        <div className="panel">
          <div className="panel-heading"><Users size={22} /><h2>治療師</h2></div>
          <form className="form-grid dense" onSubmit={saveTherapist}>
            <label>名稱<input value={therapist.name} onChange={(event) => setTherapist({ ...therapist, name: event.target.value })} /></label>
            <label>大類<Select value={therapist.service_area} onChange={(value) => setTherapist({ ...therapist, service_area: value as ServiceArea })} options={[["ELE", "ELE"], ["GYM", "GYM"]]} /></label>
            <label>代號<input value={therapist.code} onChange={(event) => setTherapist({ ...therapist, code: event.target.value })} /></label>
            <label>性別<Select value={therapist.gender} onChange={(value) => setTherapist({ ...therapist, gender: value as Gender })} options={[["unknown", "未設定"], ["male", "男"], ["female", "女"]]} /></label>
            <button className="primary-button" type="submit"><Save size={18} />保存</button>
          </form>
        </div>
        <div className="panel">
          <div className="panel-heading"><Stethoscope size={22} /><h2>轉介醫生</h2></div>
          <form className="form-grid dense" onSubmit={saveDoctor}>
            <label>代號<input value={doctor.code} onChange={(event) => setDoctor({ ...doctor, code: event.target.value })} /></label>
            <label>名稱<input value={doctor.name} onChange={(event) => setDoctor({ ...doctor, name: event.target.value })} /></label>
            <label>Quota<input inputMode="numeric" value={doctor.quota} onChange={(event) => setDoctor({ ...doctor, quota: Number(event.target.value) })} /></label>
            <button className="primary-button" type="submit"><Save size={18} />保存</button>
          </form>
        </div>
        <div className="panel">
          <div className="panel-heading"><CalendarDays size={22} /><h2>不可預約時段</h2></div>
          <form className="form-grid dense" onSubmit={saveUnavailable}>
            <label>治療師<Select value={unavailable.therapist_id} onChange={(value) => setUnavailable({ ...unavailable, therapist_id: value })} options={data.therapists.map((item) => [item.id, item.name])} /></label>
            <label>開始日期<input type="date" value={unavailable.start_date} onChange={(event) => setUnavailable({ ...unavailable, start_date: event.target.value })} /></label>
            <label>結束日期<input type="date" value={unavailable.end_date} onChange={(event) => setUnavailable({ ...unavailable, end_date: event.target.value })} /></label>
            <label className="check-inline"><input checked={unavailable.all_day} onChange={(event) => setUnavailable({ ...unavailable, all_day: event.target.checked })} type="checkbox" />全日</label>
            <label>開始時間<input disabled={unavailable.all_day} value={unavailable.start_time} onChange={(event) => setUnavailable({ ...unavailable, start_time: event.target.value })} /></label>
            <label>結束時間<input disabled={unavailable.all_day} value={unavailable.end_time} onChange={(event) => setUnavailable({ ...unavailable, end_time: event.target.value })} /></label>
            <label>原因<input value={unavailable.reason} onChange={(event) => setUnavailable({ ...unavailable, reason: event.target.value })} /></label>
            <button className="primary-button" type="submit"><Save size={18} />保存</button>
          </form>
        </div>
      </section>
      <section className="grid-three">
        <ListPanel title="治療師清單" rows={data.therapists} main="name" sub={(row) => `${row.service_area} · ${genderText(row.gender)} · ${row.active ? "啟用" : "停用"}`} onDelete={(id) => remove("therapists", id)} />
        <ListPanel title="醫生清單" rows={data.doctors} main="name" sub={(row) => `${row.code} · quota ${row.quota} · ${row.active ? "啟用" : "停用"}`} onDelete={(id) => remove("doctors", id)} />
        <ListPanel title="不可預約時段" rows={data.unavailable} main="reason" sub={(row) => `${row.therapist_name} · ${row.start_date} 至 ${row.end_date} ${row.all_day ? "全日" : `${row.start_time}-${row.end_time}`}`} onDelete={(id) => remove("unavailable", id)} />
      </section>
    </section>
  );
}

function LogsAdmin({ data, session, reload, setNotice }: { data: AdminData; session: string; reload: (session?: string) => Promise<void>; setNotice: (value: string) => void }) {
  async function resetDemo() {
    if (!window.confirm("確認清除患者、預約、SMS、求助紀錄？治療師、醫生、容量和不可預約時段會保留。")) return;
    await api("/api/admin/demo-reset", { method: "POST", session });
    setNotice("Demo 資料已重設。");
    await reload(session);
  }

  return (
    <section className="stack">
      <div className="danger-zone">
        <button className="danger-button" onClick={resetDemo} type="button">
          <Trash2 size={18} />
          Demo reset
        </button>
      </div>
      <section className="grid-two">
        <div className="panel">
          <div className="panel-heading"><ClipboardList size={22} /><h2>SMS 模擬紀錄</h2></div>
          <DataTable rows={data.smsLogs} columns={[["created_at", "時間"], ["display_name", "患者"], ["phone", "電話"], ["message", "內容"], ["status", "狀態"]]} />
        </div>
        <div className="panel">
          <div className="panel-heading"><HelpCircle size={22} /><h2>致電求助紀錄</h2></div>
          <DataTable rows={data.helpRequests} columns={[["created_at", "時間"], ["id_number", "身份證"], ["phone", "電話"], ["note", "備註"]]} />
        </div>
      </section>
    </section>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>{label}</option>
      ))}
    </select>
  );
}

function DataTable({ rows, columns }: { rows: Array<Record<string, any>>; columns: Array<[string, string]> }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map(([, label]) => <th key={label}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length}>暫無資料</td></tr>
          ) : rows.map((row, index) => (
            <tr key={row.id ?? index}>
              {columns.map(([key]) => <td key={key}>{String(row[key] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListPanel({ title, rows, main, sub, onDelete }: { title: string; rows: any[]; main: string; sub: (row: any) => string; onDelete: (id: string) => void }) {
  return (
    <div className="panel">
      <div className="panel-heading"><ClipboardList size={22} /><h2>{title}</h2></div>
      <div className="plain-list">
        {rows.slice(0, 24).map((row) => (
          <div key={row.id}>
            <span>
              <strong>{row[main]}</strong>
              <small>{sub(row)}</small>
            </span>
            <button className="icon-button" onClick={() => onDelete(row.id)} type="button" aria-label="刪除或停用">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="metric-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return <div className="notice">{text}</div>;
}

async function api<T = any>(path: string, options: { method?: string; body?: unknown; session?: string } = {}): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.session ? { "x-admin-session": options.session } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "操作失敗");
  return data as T;
}

function routeFromPath(path: string): Route {
  if (path.startsWith("/patient")) return "patient";
  if (path.startsWith("/admin")) return "admin";
  return "home";
}

function slotState(slot: Slot, selected: Appointment[], sessionCount: number) {
  const exact = selected.some((item) => sameAppointment(item, slot));
  if (exact) return { selected: true, disabled: false, reason: "" };
  if (!slot.available) return { selected: false, disabled: true, reason: slot.reason || "不可選" };
  if (selected.length >= sessionCount) return { selected: false, disabled: true, reason: "堂數已滿" };
  if (selected.length > 0) {
    const first = selected[0];
    if (slot.therapistId !== first.therapistId) return { selected: false, disabled: true, reason: "需同一治療師" };
    if (slot.time !== first.time) return { selected: false, disabled: true, reason: "需同一時間" };
  }
  const week = weekKey(slot.date);
  const sameWeekDates = [...new Set(selected.filter((item) => weekKey(item.date) === week).map((item) => item.date))];
  if (!sameWeekDates.includes(slot.date) && sameWeekDates.length >= 2) return { selected: false, disabled: true, reason: "本週已滿" };
  if (sameWeekDates.some((date) => Math.abs(daysBetween(date, slot.date)) < 2)) {
    return { selected: false, disabled: true, reason: "需隔一日" };
  }
  return { selected: false, disabled: false, reason: "" };
}

function sameAppointment(item: Appointment, slot: Slot) {
  return item.date === slot.date && item.time === slot.time && item.therapistId === slot.therapistId;
}

function lockedSummary(selected: Appointment[]) {
  if (!selected[0]) return "第一堂會鎖定治療師及時間";
  return `已鎖定 ${selected[0].therapistAlias ?? selected[0].therapistId} · ${selected[0].time}`;
}

function aliasFor(availability: Availability | null, therapistId: string) {
  return availability?.therapists.find((item) => item.id === therapistId)?.alias ?? therapistId;
}

function genderPreferenceText(value: GenderPreference) {
  if (value === "male") return "只限男治療師";
  if (value === "female") return "只限女治療師";
  return "不限治療師性別";
}

function genderText(value: Gender) {
  if (value === "male") return "男";
  if (value === "female") return "女";
  return "未設定";
}

function formatDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function weekdayText(date: string) {
  return `星期${WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]}`;
}

function weekKey(date: string) {
  const base = new Date(`${date}T00:00:00Z`);
  const day = base.getUTCDay() || 7;
  base.setUTCDate(base.getUTCDate() - day + 1);
  return base.toISOString().slice(0, 10);
}

function daysBetween(left: string, right: string) {
  return Math.round((new Date(`${right}T00:00:00Z`).getTime() - new Date(`${left}T00:00:00Z`).getTime()) / 86_400_000);
}

function monthDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const total = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: total }, (_, index) => `${year}-${String(monthNumber).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`);
}

function groupBy(rows: any[], key: string) {
  return rows.reduce<Record<string, any[]>>((groups, row) => {
    const value = String(row[key] ?? "");
    groups[value] = [...(groups[value] ?? []), row];
    return groups;
  }, {});
}

function sumCount(rows: any[], key = "count") {
  return rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失敗";
}

export default App;
