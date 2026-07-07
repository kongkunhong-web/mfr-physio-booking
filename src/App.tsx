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

type PlanOption = {
  key: string;
  title: string;
  caption: string;
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

type CalendarDayStat = {
  date: string;
  weekday: number;
  isWeekend: boolean;
  capacityTotal: number;
  booked: number;
  remaining: number;
  blockedCapacity: number;
  status: "weekend" | "unavailable" | "no-capacity" | "full" | "partial" | "available";
  unavailableReasons: Array<Record<string, any>>;
  vacancyTimes: Array<Record<string, any>>;
};

type AdminCalendarData = {
  bookings: Array<Record<string, any>>;
  unavailable: Array<Record<string, any>>;
  dailyStats: CalendarDayStat[];
  monthSummary: Record<string, number>;
};

const HELP_PHONE = "8390 5180";
const ADMIN_SESSION_KEY = "mfr-admin-session-v2";
const SUBTYPES: Record<ServiceArea, string[]> = {
  ELE: ["ELE-1", "ELE-2", "ELE-3"],
  GYM: ["GYM-1", "GYM-1/2", "GYM-3", "GYM-3-1"],
};
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const SESSION_OPTIONS = Array.from({ length: 7 }, (_, index) => index + 6);
const WEEKDAY_OPTIONS = [["2", "星期二"], ["3", "星期三"], ["4", "星期四"], ["5", "星期五"]];
const SERVICE_TIMES: Record<ServiceArea, string[]> = {
  ELE: ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"],
  GYM: ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"],
};

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
        <span className="status-pill">Hogan PT Demo</span>
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
  const [step, setStep] = useState<"rules" | "time" | "therapist" | "plan" | "custom" | "review" | "summary">("rules");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTherapistId, setSelectedTherapistId] = useState("");
  const [selected, setSelected] = useState<Appointment[]>([]);
  const [selectedPlanKey, setSelectedPlanKey] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setAvailability(null);
    setSelected([]);
    setSelectedTime("");
    setSelectedTherapistId("");
    setSelectedPlanKey("");
    try {
      const data = await api<any>("/api/patient/login", {
        method: "POST",
        body: { idNumber, phone },
      });
      if (data.status === "pending") {
        setPatient(null);
        setBooking(null);
        setStep("rules");
        setNotice(data.message);
        return;
      }
      setPatient(data.patient);
      setBooking(data.booking);
      setStep("rules");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function loadAvailability(patientId = patient?.id ?? "", preserveSelection = true) {
    if (!patientId) return null;
    const data = await api<Availability>(`/api/patient/availability?patientId=${encodeURIComponent(patientId)}`);
    setAvailability(data);
    setBooking(data.booking);
    if (data.booking?.appointments) {
      setSelected(data.booking.appointments.map((item) => normalizeAppointment(item, data)));
    } else if (!preserveSelection) {
      setSelected([]);
    }
    return data;
  }

  async function acceptRules() {
    if (!patient) return;
    setBusy(true);
    setNotice("");
    try {
      await api("/api/patient/accept-rules", { method: "POST", body: { patientId: patient.id } });
      if (booking) {
        await loadAvailability(patient.id);
        setStep("summary");
      } else {
        await loadAvailability(patient.id, false);
        setStep("time");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function refreshAvailability() {
    if (!patient) return;
    setBusy(true);
    try {
      await loadAvailability(patient.id);
      setNotice("已更新最新名額。若有時段被其他人預約，系統會在確認前再次檢查。");
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
      setSelected(data.booking.appointments.map((item) => normalizeAppointment(item, availability)));
      setStep("summary");
      setNotice("預約已確認，以下是你的療程時間。");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice(errorMessage(error));
      await loadAvailability(patient.id);
    } finally {
      setBusy(false);
    }
  }

  function chooseTime(time: string) {
    setSelectedTime(time);
    setSelectedTherapistId("");
    setSelected([]);
    setSelectedPlanKey("");
    setStep("therapist");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseTherapist(therapistId: string) {
    setSelectedTherapistId(therapistId);
    setSelected([]);
    setSelectedPlanKey("");
    setStep("plan");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function choosePlan(plan: PlanOption) {
    setSelected(plan.appointments);
    setSelectedPlanKey(plan.key);
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearDraft() {
    setSelected([]);
    setSelectedPlanKey("");
    setStep(selectedTherapistId ? "plan" : selectedTime ? "therapist" : "time");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const timeOptions = useMemo(() => (availability ? getTimeOptions(availability) : []), [availability]);
  const therapistOptions = useMemo(
    () => (availability && selectedTime ? getTherapistOptions(availability, selectedTime) : []),
    [availability, selectedTime],
  );
  const planOptions = useMemo(
    () => (availability && selectedTime && selectedTherapistId ? getPlanOptions(availability, selectedTime, selectedTherapistId) : []),
    [availability, selectedTime, selectedTherapistId],
  );
  const customDates = useMemo(
    () => (availability && selectedTime && selectedTherapistId ? getDateChoices(availability, selectedTime, selectedTherapistId) : []),
    [availability, selectedTime, selectedTherapistId],
  );

  return (
    <section className="stack patient-flow">
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

      {patient && step === "rules" && (
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
            <span>最後確認後，已預約日期不可自行更改；如需協助請致電求助。</span>
            {booking && <span>你已有已確認預約；同意規則後只會顯示療程摘要，不可在前台自行改期。</span>}
          </div>
          <button className="primary-button" disabled={busy} onClick={acceptRules} type="button">
            <ShieldCheck size={18} />
            我已明白並繼續
          </button>
        </section>
      )}

      {patient && availability && step !== "rules" && step !== "summary" && (
        <section className="patient-mobile-shell">
          <PatientProgress step={step} selectedTime={selectedTime} therapist={therapistById(availability, selectedTherapistId)} selected={selected} patient={patient} />

          {step === "time" && (
            <section className="panel">
              <div className="panel-heading">
                <CalendarDays size={24} />
                <div>
                  <p className="eyebrow">第一步</p>
                  <h2>先選一個固定治療時間</h2>
                </div>
              </div>
              <p className="flow-copy">只顯示可在 12 週內完成整個療程的時間。</p>
              <div className="option-list">
                {timeOptions.map((option) => (
                  <button className="option-card" key={option.time} onClick={() => chooseTime(option.time)} type="button">
                    <strong>{option.time}</strong>
                    <span>{option.therapistCount} 位治療師可完成 · 最早 {formatDate(option.earliestDate)} {weekdayText(option.earliestDate)}</span>
                  </button>
                ))}
              </div>
              {!timeOptions.length && <Notice text="暫時沒有足夠名額完成整個療程，請致電求助。" />}
              <PatientActionRow busy={busy} onRefresh={refreshAvailability} />
            </section>
          )}

          {step === "therapist" && (
            <section className="panel">
              <div className="panel-heading">
                <Users size={24} />
                <div>
                  <p className="eyebrow">第二步</p>
                  <h2>選擇治療師代號</h2>
                </div>
              </div>
              <p className="flow-copy">已選時間：{selectedTime}。選定後會鎖定同一治療師和同一時間。</p>
              <div className="option-list">
                {therapistOptions.map((option) => (
                  <button className="option-card" key={option.therapist.id} onClick={() => chooseTherapist(option.therapist.id)} type="button">
                    <strong>{option.therapist.alias}</strong>
                    <span>可完成 {patient.session_count} 堂 · 最早 {formatDate(option.earliestDate)} {weekdayText(option.earliestDate)}</span>
                  </button>
                ))}
              </div>
              <div className="button-row">
                <button className="ghost-button" onClick={() => setStep("time")} type="button">返回選時段</button>
              </div>
              <PatientActionRow busy={busy} onRefresh={refreshAvailability} />
            </section>
          )}

          {step === "plan" && (
            <section className="panel">
              <div className="panel-heading">
                <ClipboardCheck size={24} />
                <div>
                  <p className="eyebrow">第三步</p>
                  <h2>選擇療程日期方案</h2>
                </div>
              </div>
              <p className="flow-copy">已鎖定 {aliasFor(availability, selectedTherapistId)} · {selectedTime}。</p>
              <div className="plan-grid">
                {planOptions.map((plan) => (
                  <button className="plan-card" key={plan.key} onClick={() => choosePlan(plan)} type="button">
                    <strong>{plan.title}</strong>
                    <span>{plan.caption}</span>
                    <small>{plan.appointments.map((item) => `${formatDate(item.date)} ${weekdayText(item.date)}`).join("、")}</small>
                  </button>
                ))}
              </div>
              <div className="button-row">
                <button className="ghost-button" onClick={() => setStep("therapist")} type="button">返回選治療師</button>
                <button className="ghost-button" onClick={() => setStep("custom")} type="button">自選日期</button>
                <button className="danger-button" disabled={!selected.length} onClick={clearDraft} type="button">清除已選</button>
              </div>
              <PatientActionRow busy={busy} onRefresh={refreshAvailability} />
            </section>
          )}

          {step === "custom" && (
            <section className="panel">
              <div className="panel-heading">
                <CalendarDays size={24} />
                <div>
                  <p className="eyebrow">自選日期</p>
                  <h2>逐堂選擇日期</h2>
                </div>
              </div>
              <p className="flow-copy">治療師和時間已鎖定，只需選滿 {patient.session_count} 個合規日期。</p>
              <div className="date-choice-grid">
                {customDates.map((appointment) => {
                  const state = customDateState(appointment, selected, patient.session_count);
                  return (
                    <button
                      className={`date-choice ${state.selected ? "selected" : ""}`}
                      disabled={state.disabled}
                      key={appointment.date}
                      onClick={() => setSelected((items) => toggleCustomDate(items, appointment))}
                      type="button"
                    >
                      <strong>{formatDate(appointment.date)}</strong>
                      <span>{weekdayText(appointment.date)} · {appointment.time}</span>
                      <small>{state.selected ? "已選" : state.reason || aliasFor(availability, appointment.therapistId)}</small>
                    </button>
                  );
                })}
              </div>
              <div className="button-row">
                <button className="ghost-button" onClick={() => setStep("plan")} type="button">返回方案</button>
                <button className="danger-button" disabled={!selected.length} onClick={clearDraft} type="button">清除已選</button>
                <button className="primary-button" disabled={selected.length !== patient.session_count} onClick={() => { setSelectedPlanKey("custom"); setStep("review"); }} type="button">
                  檢視 {selected.length}/{patient.session_count} 堂
                </button>
              </div>
              <PatientActionRow busy={busy} onRefresh={refreshAvailability} />
            </section>
          )}

          {step === "review" && (
            <section className="panel">
              <div className="panel-heading">
                <Check size={24} />
                <div>
                  <p className="eyebrow">最後確認</p>
                  <h2>確認後不可自行更改日期</h2>
                </div>
              </div>
              <AppointmentSummary appointments={selected} availability={availability} />
              <div className="button-row">
                <button className="ghost-button" onClick={() => setStep(selectedPlanKey === "custom" ? "custom" : "plan")} type="button">返回修改</button>
                <button className="danger-button" onClick={clearDraft} type="button">清除已選</button>
                <button className="primary-button" disabled={busy || selected.length !== patient.session_count} onClick={confirmBooking} type="button">
                  <Check size={18} />
                  確認 {selected.length}/{patient.session_count} 堂
                </button>
              </div>
              <PatientActionRow busy={busy} onRefresh={refreshAvailability} />
            </section>
          )}
        </section>
      )}

      {patient && step === "summary" && booking && (
        <PatientBookingSummary booking={booking} availability={availability} />
      )}

      {patient && notice && <Notice text={notice} />}
    </section>
  );
}

function PatientProgress({
  step,
  selectedTime,
  therapist,
  selected,
  patient,
}: {
  step: string;
  selectedTime: string;
  therapist?: Therapist;
  selected: Appointment[];
  patient: Patient;
}) {
  return (
    <aside className="panel patient-progress">
      <p className="eyebrow">患者條件</p>
      <h2>{patient.display_name}</h2>
      <div className="info-list">
        <span>{patient.service_area} / {patient.subtype}</span>
        <span>{genderPreferenceText(patient.gender_preference)}</span>
        <span>需預約 {patient.session_count} 堂</span>
        <span>{selectedTime ? `已選時間 ${selectedTime}` : "尚未選時間"}</span>
        <span>{therapist ? `已鎖定 ${therapist.alias}` : "尚未選治療師"}</span>
        <span>已選 {selected.length}/{patient.session_count} 堂</span>
      </div>
      <div className="step-pills">
        {["time", "therapist", "plan", "review"].map((item) => (
          <span className={step === item ? "active" : ""} key={item}>{stepLabel(item)}</span>
        ))}
      </div>
    </aside>
  );
}

function PatientActionRow({ busy, onRefresh }: { busy: boolean; onRefresh: () => void }) {
  return (
    <div className="button-row">
      <button className="ghost-button" disabled={busy} onClick={onRefresh} type="button">
        <RefreshCw size={18} />
        更新最新名額
      </button>
    </div>
  );
}

function AppointmentSummary({ appointments, availability }: { appointments: Appointment[]; availability: Availability | null }) {
  return (
    <div className="summary-grid">
      {appointments.map((item, index) => (
        <div className="summary-card" key={`${item.date}-${item.time}-${index}`}>
          <strong>第 {index + 1} 堂</strong>
          <span>{formatDate(item.date)} {weekdayText(item.date)} {item.time}</span>
          <small>{item.therapistAlias || aliasFor(availability, item.therapistId) || item.therapist_name}</small>
        </div>
      ))}
    </div>
  );
}

function PatientBookingSummary({ booking, availability }: { booking: Booking; availability: Availability | null }) {
  const appointments = booking.appointments.map((item) => normalizeAppointment(item, availability));
  return (
    <section className="panel patient-summary-panel">
      <div className="panel-heading">
        <Check size={24} />
        <div>
          <p className="eyebrow">已確認預約</p>
          <h2>療程摘要</h2>
        </div>
      </div>
      <div className="notice strong-notice">已預約日期不可改動。如需協助，請致電 {HELP_PHONE} 聯絡職員。</div>
      <AppointmentSummary appointments={appointments} availability={availability} />
      <div className="notice">物理治療前會收到衛生局信息提醒。</div>
    </section>
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
    ["overview", "患者總覽", Users],
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
      {tab === "overview" && <PatientOverview data={data} session={session} reload={load} setNotice={setNotice} />}
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
  const monthStats = dashboard.monthStats ?? {};
  return (
    <div className="stack">
      <div className="metric-grid">
        <Metric icon={<Users size={22} />} label="患者總數" value={totalPatients} />
        <Metric icon={<Check size={22} />} label="已預約堂數" value={bookedSessions} />
        <Metric icon={<Activity size={22} />} label="治療師" value={data.therapists.filter((item) => item.active).length} />
        <Metric icon={<PhoneCall size={22} />} label="求助紀錄" value={data.helpRequests.length} />
        <Metric icon={<CalendarDays size={22} />} label={`${dashboard.currentMonth ?? "本月"} 預約`} value={Number(monthStats.booked) || 0} />
        <Metric icon={<ClipboardCheck size={22} />} label="本月剩餘空位" value={Number(monthStats.remaining) || 0} />
        <Metric icon={<Settings size={22} />} label="本月總容量" value={Number(monthStats.capacityTotal) || 0} />
        <Metric icon={<ShieldCheck size={22} />} label="滿約日數" value={Number(monthStats.fullDays) || 0} />
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
    try {
      await api("/api/admin/patients", { method: "POST", session, body: form });
      setNotice("患者條件已暫存，可在下方二次核對後開通。");
      await reload(session);
    } catch (error) {
      setNotice(errorMessage(error));
    }
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

function PatientOverview({ data, session, reload, setNotice }: { data: AdminData; session: string; reload: (session?: string) => Promise<void>; setNotice: (value: string) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [area, setArea] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const rows = data.patients.filter((patient) => {
    const text = `${patient.patient_code} ${patient.display_name} ${patient.id_number ?? ""} ${patient.phone ?? ""}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase()))
      && (!status || patient.status === status)
      && (!area || patient.service_area === area)
      && (!doctorId || patient.doctor_id === doctorId);
  });

  function startEdit(patient: Patient) {
    setEditing({
      id: patient.id,
      patient_code: patient.patient_code,
      display_name: patient.display_name,
      id_number: patient.id_number ?? "",
      phone: patient.phone ?? "",
      doctor_id: patient.doctor_id,
      service_area: patient.service_area,
      subtype: patient.subtype,
      gender_preference: patient.gender_preference,
      session_count: patient.session_count,
      custom_session_count: "",
      status: patient.status,
    });
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    try {
      await api("/api/admin/patients", { method: "POST", session, body: editing });
      setNotice(editing.status === "booked" ? "已更新患者登入資料；已預約患者的療程條件保持不變。" : "患者資料已更新。");
      setEditing(null);
      await reload(session);
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }

  async function cancelBooking(patient: Patient) {
    if (!window.confirm(`取消 ${patient.display_name} 的整個療程？患者會回到可重新預約狀態。`)) return;
    await api(`/api/admin/patients/${encodeURIComponent(patient.id)}/cancel-booking`, { method: "POST", session });
    setNotice("已取消整個療程，患者可重新登入前台預約。");
    await reload(session);
  }

  async function deletePatient(patient: Patient) {
    if (!window.confirm(`永久刪除 ${patient.display_name} 的患者帳號、預約、SMS 和求助紀錄？`)) return;
    if (!window.confirm("請再次確認：此操作不能復原。")) return;
    await api(`/api/admin/patients/${encodeURIComponent(patient.id)}`, { method: "DELETE", session });
    setNotice("患者帳號已刪除。");
    if (editing?.id === patient.id) setEditing(null);
    await reload(session);
  }

  return (
    <section className="stack">
      <div className="panel toolbar-panel filter-bar">
        <label>搜尋患者<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="代號、姓名、身份證、電話" /></label>
        <label>狀態<Select value={status} onChange={setStatus} options={[["", "全部"], ["draft", "draft"], ["pending", "pending"], ["active", "active"], ["booked", "booked"]]} /></label>
        <label>大類<Select value={area} onChange={setArea} options={[["", "全部"], ["ELE", "ELE"], ["GYM", "GYM"]]} /></label>
        <label>轉介醫生<Select value={doctorId} onChange={setDoctorId} options={[["", "全部"], ...data.doctors.map((doctor) => [doctor.id, `${doctor.code} ${doctor.name}`])]} /></label>
      </div>

      <section className="grid-two">
        <div className="panel">
          <div className="panel-heading"><Users size={22} /><h2>患者總覽</h2></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>代號</th>
                  <th>患者</th>
                  <th>前台登入資料</th>
                  <th>條件</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={6}>沒有符合條件的患者</td></tr>
                ) : rows.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.patient_code}</td>
                    <td><strong>{patient.display_name}</strong><br /><small>Dr {patient.doctor_code}</small></td>
                    <td><span className="login-chip">身份證 {patient.id_number}</span><span className="login-chip">電話 {patient.phone}</span></td>
                    <td>{patient.service_area}/{patient.subtype}<br /><small>{patient.session_count} 堂 · {genderPreferenceText(patient.gender_preference)}</small></td>
                    <td><span className={`status-badge status-${patient.status}`}>{patient.status}</span></td>
                    <td>
                      <div className="inline-actions">
                        <button className="ghost-button compact" onClick={() => startEdit(patient)} type="button">修改</button>
                        <button className="ghost-button compact" disabled={patient.status !== "booked"} onClick={() => cancelBooking(patient)} type="button">取消療程</button>
                        <button className="danger-button compact" onClick={() => deletePatient(patient)} type="button">刪除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading"><ClipboardCheck size={22} /><h2>患者資料修改</h2></div>
          {!editing ? (
            <div className="notice">在左側選擇一位患者後，可修改登入資料、醫生和條件。已預約患者需先取消療程才可修改治療條件。</div>
          ) : (
            <form className="form-grid dense" onSubmit={saveEdit}>
              <label>患者代號<input disabled={editing.status === "booked"} value={editing.patient_code} onChange={(event) => setEditing({ ...editing, patient_code: event.target.value })} /></label>
              <label>顯示名稱<input value={editing.display_name} onChange={(event) => setEditing({ ...editing, display_name: event.target.value })} /></label>
              <label>身份證<input value={editing.id_number} onChange={(event) => setEditing({ ...editing, id_number: event.target.value })} required /></label>
              <label>電話<input value={editing.phone} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} required /></label>
              <label>轉介醫生<Select value={editing.doctor_id} onChange={(value) => setEditing({ ...editing, doctor_id: value })} options={data.doctors.filter((item) => item.active).map((item) => [item.id, `${item.code} ${item.name}`])} /></label>
              <label>狀態<Select value={editing.status} onChange={(value) => setEditing({ ...editing, status: value })} options={[["draft", "draft"], ["pending", "pending"], ["active", "active"], ["booked", "booked"]]} /></label>
              <label>治療大類<Select value={editing.service_area} onChange={(value) => setEditing({ ...editing, service_area: value as ServiceArea, subtype: SUBTYPES[value as ServiceArea][0] })} options={[["ELE", "ELE"], ["GYM", "GYM"]]} /></label>
              <label>治療子類<Select value={editing.subtype} onChange={(value) => setEditing({ ...editing, subtype: value })} options={SUBTYPES[editing.service_area as ServiceArea].map((item) => [item, item])} /></label>
              <label>性別限制<Select value={editing.gender_preference} onChange={(value) => setEditing({ ...editing, gender_preference: value as GenderPreference })} options={[["any", "不限"], ["male", "男治療師"], ["female", "女治療師"]]} /></label>
              <label>堂數<Select value={String(editing.session_count)} onChange={(value) => setEditing({ ...editing, session_count: Number(value), custom_session_count: "" })} options={SESSION_OPTIONS.map((item) => [String(item), `${item} 堂`])} /></label>
              {editing.status === "booked" && <div className="notice form-span">此患者已確認療程，治療大類、子類、性別限制和堂數會由後端保持原值。若要改療程條件，請先取消整個療程。</div>}
              <div className="button-row form-span">
                <button className="primary-button" type="submit"><Save size={18} />保存修改</button>
                <button className="ghost-button" onClick={() => setEditing(null)} type="button">取消</button>
              </div>
            </form>
          )}
        </div>
      </section>
    </section>
  );
}

function CalendarAdmin({ data, session, reload, setNotice }: { data: AdminData; session: string; reload: (session?: string) => Promise<void>; setNotice: (value: string) => void }) {
  const [therapistId, setTherapistId] = useState(data.therapists[0]?.id ?? "");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [calendar, setCalendar] = useState<AdminCalendarData | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [capacity, setCapacity] = useState({ therapist_id: "", service_area: "ELE" as ServiceArea, subtype: "ELE-1", weekday: 2, time: "08:30", capacity: 1 });
  const [move, setMove] = useState({ appointmentId: "", therapistId: "", date: "", time: "" });
  const [moveTimes, setMoveTimes] = useState<Array<Record<string, any>>>([]);

  async function loadCalendar() {
    const query = new URLSearchParams({ month });
    if (therapistId) query.set("therapistId", therapistId);
    const next = await api<AdminCalendarData>(`/api/admin/calendar?${query}`, { session });
    setCalendar(next);
    setSelectedDate((current) => current && current.startsWith(month) ? current : `${month}-01`);
  }

  useEffect(() => {
    loadCalendar().catch(() => null);
  }, [therapistId, month]);

  useEffect(() => {
    async function loadMoveTimes() {
      if (!move.appointmentId || !move.therapistId || !move.date) {
        setMoveTimes([]);
        return;
      }
      const query = new URLSearchParams({ appointmentId: move.appointmentId, therapistId: move.therapistId, date: move.date });
      const result = await api<{ options: Array<Record<string, any>> }>(`/api/admin/reschedule-options?${query}`, { session });
      setMoveTimes(result.options ?? []);
      if (result.options?.length && !result.options.some((item) => item.available && item.time === move.time)) {
        setMove((current) => ({ ...current, time: result.options.find((item) => item.available)?.time ?? "" }));
      }
    }
    loadMoveTimes().catch((error) => setNotice(errorMessage(error)));
  }, [move.appointmentId, move.therapistId, move.date]);

  async function saveCapacity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api("/api/admin/capacity", { method: "POST", session, body: capacity });
    setNotice("每時間段可接納就診者數目已更新，患者前台會即時反映。");
    await reload(session);
    await loadCalendar();
  }

  async function reschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api("/api/admin/reschedule", { method: "POST", session, body: move });
    setNotice("已改期或轉治療師。");
    await loadCalendar();
  }

  async function seedWkDemo() {
    const result = await api<{ createdPatients: number; createdSessions: number }>("/api/admin/demo/wk-july-full", { method: "POST", session });
    setNotice(`WK 2026年7月滿約示範已生成/補齊：新增 ${result.createdSessions} 堂。`);
    setTherapistId("gym-03");
    setMonth("2026-07");
    await reload(session);
  }

  const bookingsByDate = groupBy(calendar?.bookings ?? [], "date");
  const statsByDate = Object.fromEntries((calendar?.dailyStats ?? []).map((day) => [day.date, day]));
  const selectedStats = statsByDate[selectedDate] as CalendarDayStat | undefined;
  const selectedBookings = bookingsByDate[selectedDate] ?? [];
  const selectedMoveBooking = (calendar?.bookings ?? []).find((item: any) => item.id === move.appointmentId);
  const therapistOptions = data.therapists
    .filter((item) => !selectedMoveBooking || item.service_area === selectedMoveBooking.service_area)
    .map((item) => [item.id, item.name]);
  const monthSummary = calendar?.monthSummary ?? {};

  return (
    <section className="stack">
      <div className="panel toolbar-panel">
        <label>治療師<Select value={therapistId} onChange={setTherapistId} options={[["", "全部"], ...data.therapists.map((item) => [item.id, `${item.name} (${item.service_area})`])]} /></label>
        <label>月份<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
        <button className="ghost-button" onClick={seedWkDemo} type="button"><ShieldCheck size={18} />生成 WK 7月滿約示範</button>
      </div>
      <div className="metric-grid mini-metrics">
        <Metric icon={<Settings size={20} />} label="總空位" value={Number(monthSummary.capacityTotal) || 0} />
        <Metric icon={<Check size={20} />} label="已預約" value={Number(monthSummary.booked) || 0} />
        <Metric icon={<ClipboardCheck size={20} />} label="剩餘空位" value={Number(monthSummary.remaining) || 0} />
        <Metric icon={<CalendarDays size={20} />} label="不可預約容量" value={Number(monthSummary.blockedCapacity) || 0} />
        <Metric icon={<ShieldCheck size={20} />} label="滿約日" value={Number(monthSummary.fullDays) || 0} />
        <Metric icon={<HelpCircle size={20} />} label="週六日" value={Number(monthSummary.weekendDays) || 0} />
      </div>
      <div className="month-grid">
        {monthDays(month).map((date) => (
          <button className={`day-card calendar-day status-${statsByDate[date]?.status ?? "empty"} ${selectedDate === date ? "selected" : ""}`} key={date} onClick={() => setSelectedDate(date)} type="button">
            <strong>{date.slice(8)} {weekdayText(date)}</strong>
            <span className="status-badge">{calendarStatusText(statsByDate[date])}</span>
            <small>總 {statsByDate[date]?.capacityTotal ?? 0} · 已約 {statsByDate[date]?.booked ?? 0} · 剩 {statsByDate[date]?.remaining ?? 0}</small>
            {(statsByDate[date]?.unavailableReasons ?? []).slice(0, 2).map((item: any, index: number) => (
              <small className="blocked-note" key={`${item.reason}-${index}`}>{item.therapistName || item.therapistId} {item.time} {item.reason}</small>
            ))}
          </button>
        ))}
      </div>
      <section className="grid-two">
        <div className="panel">
          <div className="panel-heading"><CalendarDays size={22} /><h2>{selectedDate || "選擇日期"} 日詳情</h2></div>
          {!selectedStats ? (
            <div className="notice">請在月曆選擇日期。</div>
          ) : (
            <div className="detail-grid">
              <div className="summary-card"><strong>容量</strong><span>總 {selectedStats.capacityTotal} · 已約 {selectedStats.booked} · 剩餘 {selectedStats.remaining} · 不可預約 {selectedStats.blockedCapacity}</span></div>
              <div className="plain-list">
                <strong>不可預約時段</strong>
                {selectedStats.unavailableReasons.length ? selectedStats.unavailableReasons.map((item, index) => (
                  <div key={`${item.reason}-${index}`}><span><strong>{item.therapistName || item.therapistId}</strong><small>{item.time} · {item.reason}</small></span></div>
                )) : <small className="muted">沒有不可預約時段</small>}
              </div>
              <div className="plain-list">
                <strong>剩餘空位時間</strong>
                {selectedStats.vacancyTimes.length ? selectedStats.vacancyTimes.slice(0, 18).map((item, index) => (
                  <div key={`${item.therapistId}-${item.time}-${index}`}><span><strong>{item.time}</strong><small>{item.therapistName} · 剩 {item.remaining}/{item.capacity}</small></span></div>
                )) : <small className="muted">沒有剩餘空位</small>}
              </div>
            </div>
          )}
        </div>
        <div className="panel">
          <div className="panel-heading"><ClipboardList size={22} /><h2>當日患者</h2></div>
          <DataTable rows={selectedBookings} columns={[["time", "時間"], ["therapist_name", "治療師"], ["patient_code", "代號"], ["display_name", "患者"], ["id_number", "身份證"], ["phone", "電話"], ["subtype", "子類"]]} />
        </div>
      </section>
      <section className="grid-two">
        <div className="panel">
          <div className="panel-heading"><Settings size={22} /><h2>每時間段可接納就診者數目</h2></div>
          <form className="form-grid dense" onSubmit={saveCapacity}>
            <label>套用治療師<Select value={capacity.therapist_id} onChange={(value) => setCapacity({ ...capacity, therapist_id: value })} options={[["", "通用容量"], ...data.therapists.map((item) => [item.id, item.name])]} /></label>
            <label>大類<Select value={capacity.service_area} onChange={(value) => setCapacity({ ...capacity, service_area: value as ServiceArea, subtype: SUBTYPES[value as ServiceArea][0], time: SERVICE_TIMES[value as ServiceArea][0] })} options={[["ELE", "ELE"], ["GYM", "GYM"]]} /></label>
            <label>子類<Select value={capacity.subtype} onChange={(value) => setCapacity({ ...capacity, subtype: value })} options={SUBTYPES[capacity.service_area].map((item) => [item, item])} /></label>
            <label>星期<Select value={String(capacity.weekday)} onChange={(value) => setCapacity({ ...capacity, weekday: Number(value) })} options={WEEKDAY_OPTIONS} /></label>
            <label>時間<Select value={capacity.time} onChange={(value) => setCapacity({ ...capacity, time: value })} options={SERVICE_TIMES[capacity.service_area].map((time) => [time, time])} /></label>
            <label>每時間段可接納就診者數目<input inputMode="numeric" value={capacity.capacity} onChange={(event) => setCapacity({ ...capacity, capacity: Number(event.target.value) })} /></label>
            <button className="primary-button" type="submit"><Save size={18} />保存容量</button>
          </form>
        </div>
        <div className="panel">
          <div className="panel-heading"><RefreshCw size={22} /><h2>內部改期/轉治療師</h2></div>
          <form className="form-grid dense" onSubmit={reschedule}>
            <label>預約堂 ID<Select value={move.appointmentId} onChange={(value) => {
              const booking = (calendar?.bookings ?? []).find((item: any) => item.id === value);
              setMove({ appointmentId: value, therapistId: booking?.therapist_id ?? "", date: booking?.date ?? "", time: booking?.time ?? "" });
            }} options={[["", "選擇一堂預約"], ...(calendar?.bookings ?? []).map((item: any) => [item.id, `${item.date} ${item.time} ${item.display_name || item.patient_code}`])]} /></label>
            <label>新治療師<Select value={move.therapistId} onChange={(value) => setMove({ ...move, therapistId: value, time: "" })} options={[["", "選擇治療師"], ...therapistOptions]} /></label>
            <label>新日期<input type="date" value={move.date} onChange={(event) => setMove({ ...move, date: event.target.value })} /></label>
            <label>新時間<Select value={move.time} onChange={(value) => setMove({ ...move, time: value })} options={[["", move.appointmentId && move.therapistId && move.date ? "選擇可用時間" : "先選預約/治療師/日期"], ...moveTimes.filter((item) => item.available).map((item) => [item.time, item.time])]} /></label>
            <button className="primary-button" type="submit"><Save size={18} />確認改期或轉治療師</button>
          </form>
          {moveTimes.some((item) => !item.available) && (
            <div className="plain-list compact-list">
              {moveTimes.filter((item) => !item.available).slice(0, 6).map((item) => (
                <div key={item.time}><span><strong>{item.time}</strong><small>{item.reason}</small></span></div>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading"><ClipboardList size={22} /><h2>月份全部預約</h2></div>
        <DataTable rows={calendar?.bookings ?? []} columns={[["date", "日期"], ["time", "時間"], ["therapist_name", "治療師"], ["patient_code", "代號"], ["display_name", "患者"], ["id_number", "身份證"], ["phone", "電話"], ["service_area", "類別"], ["subtype", "子類"]]} />
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

function normalizeAppointment(item: any, availability: Availability | null): Appointment {
  const therapistId = item.therapistId ?? item.therapist_id;
  return {
    id: item.id,
    date: item.date,
    time: item.time,
    therapistId,
    therapistAlias: availability?.therapists.find((therapist) => therapist.id === therapistId)?.alias,
    therapist_name: item.therapist_name,
    session_no: item.session_no,
  };
}

function therapistById(availability: Availability | null, therapistId: string) {
  return availability?.therapists.find((therapist) => therapist.id === therapistId);
}

function stepLabel(step: string) {
  if (step === "time") return "選時間";
  if (step === "therapist") return "選治療師";
  if (step === "plan") return "選方案";
  if (step === "review") return "確認";
  return step;
}

function getDateChoices(availability: Availability, time: string, therapistId: string): Appointment[] {
  return availability.slots
    .filter((slot) => slot.available && slot.time === time && slot.therapistId === therapistId)
    .sort((left, right) => left.date.localeCompare(right.date))
    .map(slotToAppointment);
}

function getTimeOptions(availability: Availability) {
  return availability.times
    .map((time) => {
      const therapistOptions = getTherapistOptions(availability, time);
      const earliestDate = therapistOptions.map((option) => option.earliestDate).sort()[0];
      return { time, therapistCount: therapistOptions.length, earliestDate };
    })
    .filter((option) => option.therapistCount > 0 && option.earliestDate);
}

function getTherapistOptions(availability: Availability, time: string) {
  return availability.therapists
    .map((therapist) => {
      const choices = getDateChoices(availability, time, therapist.id);
      const plan = buildGreedyPlan(choices, availability.patient.session_count);
      return { therapist, earliestDate: plan[0]?.date ?? "", plan };
    })
    .filter((option) => option.plan.length === availability.patient.session_count);
}

function getPlanOptions(availability: Availability, time: string, therapistId: string): PlanOption[] {
  const choices = getDateChoices(availability, time, therapistId);
  const sessionCount = availability.patient.session_count;
  const fastest = buildGreedyPlan(choices, sessionCount);
  const balanced = buildBalancedPlan(choices, sessionCount);
  const later = buildLaterPlan(choices, sessionCount);
  return [
    {
      key: "fastest",
      title: "最快完成",
      caption: planCaption(fastest),
      appointments: fastest,
    },
    {
      key: "balanced",
      title: "均衡安排",
      caption: planCaption(balanced),
      appointments: balanced,
    },
    {
      key: "later",
      title: "較後開始",
      caption: planCaption(later),
      appointments: later,
    },
  ].filter((plan) => plan.appointments.length === sessionCount);
}

function buildGreedyPlan(choices: Appointment[], sessionCount: number, startAfter = "") {
  const picked: Appointment[] = [];
  for (const choice of choices) {
    if (startAfter && choice.date <= startAfter) continue;
    if (canAddAppointment(picked, choice)) picked.push(choice);
    if (picked.length === sessionCount) break;
  }
  return picked;
}

function buildBalancedPlan(choices: Appointment[], sessionCount: number) {
  const picked: Appointment[] = [];
  const byWeek = groupAppointmentsByWeek(choices);
  for (const week of Object.keys(byWeek).sort()) {
    const weekChoices = byWeek[week];
    const preferredPairs = [
      [2, 4],
      [3, 5],
      [2, 5],
      [3],
      [4],
      [5],
      [2],
    ];
    for (const pair of preferredPairs) {
      for (const weekday of pair) {
        const candidate = weekChoices.find((choice) => weekdayNumber(choice.date) === weekday);
        if (candidate && canAddAppointment(picked, candidate)) picked.push(candidate);
        if (picked.length === sessionCount || picked.filter((item) => weekKey(item.date) === week).length >= 2) break;
      }
      if (picked.length === sessionCount || picked.filter((item) => weekKey(item.date) === week).length >= 2) break;
    }
    if (picked.length === sessionCount) break;
  }
  return picked.length === sessionCount ? picked : buildGreedyPlan(choices, sessionCount);
}

function buildLaterPlan(choices: Appointment[], sessionCount: number) {
  const fastest = buildGreedyPlan(choices, sessionCount);
  if (!fastest.length) return [];
  const firstWeek = weekKey(fastest[0].date);
  const weekEnd = addDays(firstWeek, 6);
  const later = buildGreedyPlan(choices, sessionCount, weekEnd);
  return later.length === sessionCount ? later : buildGreedyPlan(choices.slice(2), sessionCount);
}

function canAddAppointment(selected: Appointment[], appointment: Appointment) {
  if (selected.some((item) => item.date === appointment.date)) return false;
  const sameWeek = selected.filter((item) => weekKey(item.date) === weekKey(appointment.date));
  if (sameWeek.length >= 2) return false;
  return !sameWeek.some((item) => Math.abs(daysBetween(item.date, appointment.date)) < 2);
}

function customDateState(appointment: Appointment, selected: Appointment[], sessionCount: number) {
  const selectedExact = selected.some((item) => item.date === appointment.date);
  if (selectedExact) return { selected: true, disabled: false, reason: "" };
  if (selected.length >= sessionCount) return { selected: false, disabled: true, reason: "堂數已滿" };
  if (!canAddAppointment(selected, appointment)) return { selected: false, disabled: true, reason: "不符合規則" };
  return { selected: false, disabled: false, reason: "" };
}

function toggleCustomDate(selected: Appointment[], appointment: Appointment) {
  const exists = selected.some((item) => item.date === appointment.date);
  if (exists) return selected.filter((item) => item.date !== appointment.date);
  return [...selected, appointment].sort((left, right) => left.date.localeCompare(right.date));
}

function slotToAppointment(slot: Slot): Appointment {
  return {
    date: slot.date,
    time: slot.time,
    therapistId: slot.therapistId,
    therapistAlias: slot.therapistAlias,
  };
}

function planCaption(appointments: Appointment[]) {
  if (!appointments.length) return "暫時未能排滿整個療程";
  return `${formatDate(appointments[0].date)} 開始，${formatDate(appointments[appointments.length - 1].date)} 完成`;
}

function groupAppointmentsByWeek(appointments: Appointment[]) {
  return appointments.reduce<Record<string, Appointment[]>>((groups, appointment) => {
    const key = weekKey(appointment.date);
    groups[key] = [...(groups[key] ?? []), appointment];
    return groups;
  }, {});
}

function weekdayNumber(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
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

function calendarStatusText(day?: CalendarDayStat) {
  if (!day) return "未載入";
  if (day.status === "weekend") return "週六/日";
  if (day.status === "unavailable") return "不可預約";
  if (day.status === "full") return "滿約";
  if (day.status === "partial") return "部分已約";
  if (day.status === "no-capacity") return "無時段";
  return "有空位";
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
