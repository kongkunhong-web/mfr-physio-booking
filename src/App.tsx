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
  Pencil,
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
type ServiceArea = "ELE" | "GYM" | "OT";
type Gender = "male" | "female" | "unknown";
type GenderPreference = "any" | "male" | "female";
type ScheduleGroup = "A" | "B" | "M";

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
  status: "draft" | "pending" | "active" | "booked" | "expired";
  rules_accepted_at?: string | null;
  activated_at?: string | null;
  first_login_at?: string | null;
  idNumberTail?: string;
  phoneTail?: string;
  id_number?: string;
  phone?: string;
  queue_priority?: "urgent" | "normal";
  notification_due_date?: string | null;
  original_wait_weeks?: number;
  notification_deferral_count?: number;
  notification_deferral_reason?: string | null;
  monday_only?: number;
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
  courseWindow?: { start: string; end: string; firstLoginDate: string };
  portal?: PortalStatus;
};

type PortalStatus = {
  open: boolean;
  automaticOpen: boolean;
  source: "manual" | "automatic";
  manualState: "open" | "closed" | "auto";
  manualUntil?: string | null;
  date: string;
  time: string;
  holiday?: string | null;
  message: string;
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
  portal: PortalStatus;
  holidays: Array<{ date: string; name: string }>;
  transferBatches: Array<Record<string, any>>;
};

type CalendarDayStat = {
  date: string;
  weekday: number;
  isWeekend: boolean;
  isReserved?: boolean;
  capacityTotal: number;
  booked: number;
  remaining: number;
  blockedCapacity: number;
  status: "weekend" | "reserved" | "unavailable" | "no-capacity" | "full" | "partial" | "available";
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
  OT: ["OT"],
};
const SERVICE_AREA_OPTIONS: string[][] = [["ELE", "ELE"], ["GYM", "GYM"], ["OT", "OT（職業治療）"]];
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const SESSION_OPTIONS = Array.from({ length: 7 }, (_, index) => index + 6);
const WEEKDAY_OPTIONS = [["1", "星期一特別療程"], ["2", "星期二"], ["3", "星期三"], ["4", "星期四"], ["5", "星期五"]];
const SERVICE_TIMES: Record<ServiceArea, string[]> = {
  ELE: ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"],
  GYM: ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"],
  OT: ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"],
};
const SCHEDULE_GROUPS: Record<ScheduleGroup, { label: string; weekdays: number[] }> = {
  A: { label: "A班：星期三及星期五", weekdays: [3, 5] },
  B: { label: "B班：星期二及星期四", weekdays: [2, 4] },
  M: { label: "星期一特別安排", weekdays: [1] },
};
const PATIENT_WEEKDAY_HEADERS = ["星期二", "星期三", "星期四", "星期五"];

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
  const [step, setStep] = useState<"rules" | "group" | "time" | "therapist" | "plan" | "custom" | "review" | "summary">("rules");
  const [selectedGroup, setSelectedGroup] = useState<ScheduleGroup | "">("");
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
    setSelectedGroup("");
    setSelectedTime("");
    setSelectedTherapistId("");
    setSelectedPlanKey("");
    try {
      const data = await api<any>("/api/patient/login", {
        method: "POST",
        body: { idNumber, phone },
      });
      if (data.status !== "active") {
        setPatient(null);
        setBooking(null);
        setStep("rules");
        setNotice(data.message || "此帳號暫時未能使用網上預約。請致電求助。");
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
        if (patient.monday_only) {
          setSelectedGroup("M");
          setStep("time");
        } else {
          setStep("group");
        }
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
      await loadAvailability(patient.id);
      setSelected([]);
      setSelectedGroup("");
      setSelectedTime("");
      setSelectedTherapistId("");
      setSelectedPlanKey("");
      setStep(patient.monday_only ? "time" : "group");
      if (patient.monday_only) setSelectedGroup("M");
      setNotice(patient.monday_only ? "已沒有位置或名額已更新，請重新選擇星期一特別療程時間。" : "已沒有位置或名額已更新，請重新選擇 A/B 班別。");
    } finally {
      setBusy(false);
    }
  }

  function chooseGroup(group: ScheduleGroup) {
    setSelectedGroup(group);
    setSelectedTime("");
    setSelectedTherapistId("");
    setSelected([]);
    setSelectedPlanKey("");
    setStep("time");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setStep(selectedTherapistId ? "plan" : selectedTime ? "therapist" : selectedGroup ? "time" : patient?.monday_only ? "time" : "group");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const timeOptions = useMemo(() => (availability && selectedGroup ? getTimeOptions(availability, selectedGroup) : []), [availability, selectedGroup]);
  const therapistOptions = useMemo(
    () => (availability && selectedTime && selectedGroup ? getTherapistOptions(availability, selectedTime, selectedGroup) : []),
    [availability, selectedTime, selectedGroup],
  );
  const planOptions = useMemo(
    () => (availability && selectedTime && selectedTherapistId && selectedGroup ? getPlanOptions(availability, selectedTime, selectedTherapistId, selectedGroup) : []),
    [availability, selectedTime, selectedTherapistId, selectedGroup],
  );
  const customStartDates = useMemo(
    () => (availability && selectedTime && selectedTherapistId && selectedGroup ? getCustomStartDates(availability, selectedTime, selectedTherapistId, selectedGroup) : []),
    [availability, selectedTime, selectedTherapistId, selectedGroup],
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
            {!patient.monday_only && <span>請先選擇 A 班或 B 班。</span>}
            {!patient.monday_only && <span>A 班治療時間為星期三及星期五。</span>}
            {!patient.monday_only && <span>B 班治療時間為星期二及星期四。</span>}
            {patient.monday_only && <span>此療程已由醫院安排為星期一特別療程，每星期只安排一堂。</span>}
            <span>確認後整個療程會固定同一個時間。</span>
            <span>選堂後如因私人原因缺席，不獲補堂。</span>
            <span>如因病缺席物理治療，請提交政府認可醫院發出的證明，可酌情補堂，整個療程最多可獲兩堂補堂。</span>
            <span>最後確認後，已預約日期不可自行更改，如需協助請致電求助。</span>
            <span>網上預約服務時間為星期一至星期五上午9時至下午5時，星期六、日及公眾假期暫停服務。</span>
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
          <PatientProgress step={step} selectedGroup={selectedGroup} selectedTime={selectedTime} therapist={therapistById(availability, selectedTherapistId)} selected={selected} patient={patient} />

          {step === "group" && (
            <section className="panel">
              <div className="panel-heading">
                <CalendarDays size={24} />
                <div>
                  <p className="eyebrow">第一步</p>
                  <h2>選擇治療班別</h2>
                </div>
              </div>
              <p className="flow-copy">選定後整個療程不可轉班；星期一保留給醫院指定的特別療程。</p>
              <div className="option-list">
                {(["A", "B"] as ScheduleGroup[]).map((group) => (
                  <button className="option-card" key={group} onClick={() => chooseGroup(group)} type="button">
                    <strong>{SCHEDULE_GROUPS[group].label}</strong>
                    <span>請在固定班別內完成整個療程。</span>
                  </button>
                ))}
              </div>
              <PatientActionRow busy={busy} onRefresh={refreshAvailability} />
            </section>
          )}

          {step === "time" && (
            <section className="panel">
              <div className="panel-heading">
                <CalendarDays size={24} />
                <div>
                  <p className="eyebrow">第二步</p>
                  <h2>先選一個固定治療時間</h2>
                </div>
              </div>
              <p className="flow-copy">已選 {selectedGroup && SCHEDULE_GROUPS[selectedGroup].label}。只顯示可在{patient.monday_only ? `${patient.session_count} 週` : "八週"}療程窗口內完成整個療程的時間。</p>
              <div className="option-list">
                {timeOptions.map((option) => (
                  <button className="option-card" key={option.time} onClick={() => chooseTime(option.time)} type="button">
                    <strong>{option.time}</strong>
                    <span>{option.therapistCount} 位治療師可完成 · 最早 {formatDate(option.earliestDate)} {weekdayText(option.earliestDate)}</span>
                  </button>
                ))}
              </div>
              {!timeOptions.length && <Notice text="暫時沒有足夠名額完成整個療程，請致電求助。" />}
              <div className="button-row">
                {!patient.monday_only && <button className="ghost-button" onClick={() => setStep("group")} type="button">返回選班別</button>}
              </div>
              <PatientActionRow busy={busy} onRefresh={refreshAvailability} />
            </section>
          )}

          {step === "therapist" && (
            <section className="panel">
              <div className="panel-heading">
                <Users size={24} />
                <div>
                  <p className="eyebrow">第三步</p>
                  <h2>選擇治療師代號</h2>
                </div>
              </div>
              <p className="flow-copy">已選 {selectedGroup && SCHEDULE_GROUPS[selectedGroup].label} · {selectedTime}。選定後會鎖定同一治療師和同一時間。</p>
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
                {!patient.monday_only && <button className="ghost-button" onClick={() => setStep("group")} type="button">返回選班別</button>}
              </div>
              <PatientActionRow busy={busy} onRefresh={refreshAvailability} />
            </section>
          )}

          {step === "plan" && (
            <section className="panel">
              <div className="panel-heading">
                <ClipboardCheck size={24} />
                <div>
                  <p className="eyebrow">第四步</p>
                  <h2>選擇療程日期方案</h2>
                </div>
              </div>
              <p className="flow-copy">已鎖定 {selectedGroup && SCHEDULE_GROUPS[selectedGroup].label} · {aliasFor(availability, selectedTherapistId)} · {selectedTime}。</p>
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
                <button className="ghost-button" onClick={() => setStep("custom")} type="button">自選首堂日期</button>
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
                  <p className="eyebrow">自選首堂日期</p>
                  <h2>選擇第一堂日期</h2>
                </div>
              </div>
              <p className="flow-copy">已選 {selectedGroup && SCHEDULE_GROUPS[selectedGroup].label}。選定第一堂後，系統會自動排滿其後 {patient.session_count - 1} 堂。</p>
              <div className="schedule-weekday-headings" aria-hidden="true">
                {(selectedGroup === "M" ? ["星期一"] : PATIENT_WEEKDAY_HEADERS).map((label) => <span key={label}>{label}</span>)}
              </div>
              <div className="date-choice-grid schedule-date-grid">
                {buildCustomDateGrid(availability, selectedTime, selectedTherapistId, selectedGroup as ScheduleGroup, customStartDates).map((item) => (
                  <button
                    className={`date-choice ${item.groupAllowed ? "" : "other-group"}`}
                    disabled={!item.appointment || !item.canStart}
                    key={item.date}
                    onClick={() => {
                      if (!item.appointment) return;
                      const plan = buildGreedyPlan(getDateChoices(availability, selectedTime, selectedTherapistId, selectedGroup as ScheduleGroup), patient.session_count, addDays(item.date, -1));
                      setSelected(plan);
                      setSelectedPlanKey("custom");
                      setStep("review");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    type="button"
                  >
                    <strong>{formatDate(item.date)}</strong>
                    <span>{weekdayText(item.date)} · {selectedTime}</span>
                    <small>{item.groupAllowed ? item.canStart ? "可作首堂" : item.reason || "無法完成療程" : `${selectedGroup === "A" ? "B" : "A"}班日期`}</small>
                  </button>
                ))}
              </div>
              <div className="button-row">
                <button className="ghost-button" onClick={() => setStep("plan")} type="button">返回方案</button>
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
  selectedGroup,
  selectedTime,
  therapist,
  selected,
  patient,
}: {
  step: string;
  selectedGroup: ScheduleGroup | "";
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
        <span>需預約 {patient.session_count} 堂</span>
        <span>{selectedGroup ? SCHEDULE_GROUPS[selectedGroup].label : "尚未選班別"}</span>
        <span>{selectedTime ? `已選時間 ${selectedTime}` : "尚未選時間"}</span>
        <span>{therapist ? `已鎖定 ${therapist.alias}` : "尚未選治療師"}</span>
        <span>已選 {selected.length}/{patient.session_count} 堂</span>
      </div>
      <div className="step-pills">
        {["group", "time", "therapist", "plan", "review"].map((item) => (
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
    queue_priority: "normal" as "urgent" | "normal",
    notification_due_date: "",
    monday_only: false,
  });
  const [checked, setChecked] = useState<string[]>([]);
  const [queue, setQueue] = useState<Patient[]>([]);
  const [queuePriority, setQueuePriority] = useState("");
  const [minWeeks, setMinWeeks] = useState("0");
  const [createdDate, setCreatedDate] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [queueNotice, setQueueNotice] = useState("");

  async function loadQueue() {
    const params = new URLSearchParams();
    if (queuePriority) params.set("priority", queuePriority);
    if (Number(minWeeks) > 0) params.set("minWeeks", minWeeks);
    if (createdDate) params.set("createdDate", createdDate);
    if (dueOnly) params.set("dueOnly", "1");
    try {
      const result = await api<{ patients: Patient[] }>(`/api/admin/activation-queue?${params}`, { session });
      setQueue(result.patients ?? []);
      setChecked((selected) => selected.filter((id) => (result.patients ?? []).some((item) => item.id === id)));
    } catch (error) {
      setQueueNotice(errorMessage(error));
    }
  }

  useEffect(() => { loadQueue().catch(() => undefined); }, [queuePriority, minWeeks, createdDate, dueOnly, data.patients.length]);

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
    try {
      await api("/api/admin/activate", { method: "POST", session, body: { patientIds: checked } });
      setChecked([]);
      setShowReview(false);
      setQueueNotice("已開通患者帳號並生成 SMS 模擬紀錄。");
      setNotice("已開通患者帳號並生成 SMS 模擬紀錄。");
      await reload(session);
      await loadQueue();
    } catch (error) {
      setQueueNotice(errorMessage(error));
    }
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
          <label>治療大類<Select value={form.service_area} onChange={(value) => setForm({ ...form, service_area: value as ServiceArea, subtype: SUBTYPES[value as ServiceArea][0] })} options={SERVICE_AREA_OPTIONS} /></label>
          <label>治療子類<Select value={form.subtype} onChange={(value) => setForm({ ...form, subtype: value })} options={SUBTYPES[form.service_area].map((item) => [item, item])} /></label>
          <label>性別限制<Select value={form.gender_preference} onChange={(value) => setForm({ ...form, gender_preference: value as GenderPreference })} options={[["any", "不限"], ["male", "男治療師"], ["female", "女治療師"]]} /></label>
          <label>堂數<Select value={String(form.session_count)} onChange={(value) => setForm({ ...form, session_count: Number(value), custom_session_count: "" })} options={SESSION_OPTIONS.map((item) => [String(item), `${item} 堂`])} /></label>
          <label>自訂堂數<input inputMode="numeric" value={form.custom_session_count} onChange={(event) => setForm({ ...form, custom_session_count: event.target.value })} placeholder="特別個案才填" /></label>
          <label>優先級<Select value={form.queue_priority} onChange={(value) => setForm({ ...form, queue_priority: value as "urgent" | "normal", notification_due_date: "" })} options={[["urgent", "緊急：預設等候 2 週"], ["normal", "普通：預設等候 4 週"]]} /></label>
          <label>預計通知日<input type="date" value={form.notification_due_date} onChange={(event) => setForm({ ...form, notification_due_date: event.target.value })} /></label>
          <label className="check-inline form-span"><input checked={form.monday_only} onChange={(event) => setForm({ ...form, monday_only: event.target.checked })} type="checkbox" />星期一特別療程：患者只可選星期一，每星期一堂</label>
          <button className="primary-button" type="submit"><Save size={18} />暫存患者</button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-heading"><ClipboardCheck size={22} /><h2>候選開通清單</h2></div>
        <div className="form-grid dense queue-filter">
          <label>優先級<Select value={queuePriority} onChange={setQueuePriority} options={[["", "全部"], ["urgent", "緊急"], ["normal", "普通"]]} /></label>
          <label>已等待<Select value={minWeeks} onChange={setMinWeeks} options={[["0", "不限"], ["1", "至少 1 週"], ["2", "至少 2 週"], ["4", "至少 4 週"], ["6", "至少 6 週"]]} /></label>
          <label>某日新增<input type="date" value={createdDate} onChange={(event) => setCreatedDate(event.target.value)} /></label>
          <label className="check-inline"><input checked={dueOnly} onChange={(event) => setDueOnly(event.target.checked)} type="checkbox" />只看已到通知日</label>
        </div>
        {queueNotice && <div className="notice panel-notice">{queueNotice}</div>}
        <div className={`review-list ${queue.length > 10 ? "scrollable-vertical" : ""}`}>
          {queue.map((patient) => (
            <label className="check-row" key={patient.id}>
              <input
                checked={checked.includes(patient.id)}
                onChange={(event) => setChecked((items) => event.target.checked ? [...items, patient.id] : items.filter((id) => id !== patient.id))}
                type="checkbox"
              />
              <span>
                <strong>{patient.display_name} {patient.patient_code}</strong>
                <small>{patient.queue_priority === "urgent" ? "緊急" : "普通"} · 已等 {(patient as any).waiting_weeks ?? 0} 週 · 通知日 {patient.notification_due_date || "未設定"}</small>
                <small>{patient.service_area}/{patient.subtype} · {patient.monday_only ? "星期一特別療程" : genderPreferenceText(patient.gender_preference)} · {patient.session_count} 堂 · Dr {patient.doctor_code}</small>
                {patient.notification_deferral_reason && <small className="blocked-note">{patient.notification_deferral_reason}</small>}
              </span>
            </label>
          ))}
        </div>
        {!queue.length && <small className="muted">目前沒有符合條件的候選患者。</small>}
        <button className="primary-button wide" disabled={!checked.length} onClick={() => setShowReview(true)} type="button"><ClipboardCheck size={18} />查看二次核對摘要 {checked.length} 位</button>
        {showReview && (
          <div className="notice strong-notice">
            <strong>二次核對：即將發送 SMS 並開通 {checked.length} 位患者。</strong>
            <small>{queue.filter((patient) => checked.includes(patient.id)).map((patient) => `${patient.patient_code} ${patient.display_name}`).join("、")}</small>
            <div className="button-row"><button className="ghost-button" onClick={() => setShowReview(false)} type="button">返回勾選</button><button className="primary-button" onClick={activate} type="button"><ShieldCheck size={18} />確認開通並發送 SMS</button></div>
          </div>
        )}
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
  const [rows, setRows] = useState<Patient[]>(data.patients.slice(0, 100));
  const [patientTotal, setPatientTotal] = useState(data.patients.length);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientNotice, setPatientNotice] = useState("");

  async function loadPatients() {
    setPatientLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      if (area) params.set("area", area);
      if (doctorId) params.set("doctorId", doctorId);
      const result = await api<{ patients: Patient[]; total: number; limit: number }>(`/api/admin/patients/search?${params}`, { session });
      setRows(result.patients ?? []);
      setPatientTotal(result.total ?? 0);
      setPatientNotice(result.total > result.limit ? `共有 ${result.total} 位符合條件，現顯示最新 ${result.limit} 位。請輸入更準確的代號、姓名、身份證或電話縮窄搜尋。` : "");
    } catch (error) {
      setPatientNotice(errorMessage(error));
    } finally {
      setPatientLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPatients().catch((error) => setPatientNotice(errorMessage(error)));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, status, area, doctorId, data.patients.length]);

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
      queue_priority: patient.queue_priority ?? "normal",
      notification_due_date: patient.notification_due_date ?? "",
      monday_only: Boolean(patient.monday_only),
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
      await loadPatients();
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }

  async function cancelBooking(patient: Patient) {
    if (!window.confirm(`取消 ${patient.display_name} 的整個療程？患者會回到可重新預約狀態。`)) return;
    await api(`/api/admin/patients/${encodeURIComponent(patient.id)}/cancel-booking`, { method: "POST", session });
    setNotice("已取消整個療程，患者可重新登入前台預約。");
    await reload(session);
    await loadPatients();
  }

  async function deletePatient(patient: Patient) {
    if (!window.confirm(`永久刪除 ${patient.display_name} 的患者帳號、預約、SMS 和求助紀錄？`)) return;
    if (!window.confirm("請再次確認：此操作不能復原。")) return;
    await api(`/api/admin/patients/${encodeURIComponent(patient.id)}`, { method: "DELETE", session });
    setNotice("患者帳號已刪除。");
    if (editing?.id === patient.id) setEditing(null);
    await reload(session);
    await loadPatients();
  }

  return (
    <section className="stack">
      <div className="panel toolbar-panel filter-bar">
        <label>搜尋患者<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="代號、姓名、身份證、電話" /></label>
        <label>狀態<Select value={status} onChange={setStatus} options={[["", "全部"], ["draft", "draft"], ["pending", "pending"], ["active", "active"], ["booked", "booked"]]} /></label>
        <label>大類<Select value={area} onChange={setArea} options={[["", "全部"], ...SERVICE_AREA_OPTIONS]} /></label>
        <label>轉介醫生<Select value={doctorId} onChange={setDoctorId} options={[["", "全部"], ...data.doctors.map((doctor) => [doctor.id, `${doctor.code} ${doctor.name}`])]} /></label>
      </div>
      {(patientLoading || patientNotice) && <div className="notice">{patientLoading ? "正在搜尋患者..." : patientNotice}</div>}

      <section className="grid-two">
        <div className="panel">
          <div className="panel-heading"><Users size={22} /><h2>患者總覽</h2></div>
          <div className={`table-wrap ${rows.length > 10 ? "table-scroll" : ""}`}>
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
              <label>治療大類<Select value={editing.service_area} onChange={(value) => setEditing({ ...editing, service_area: value as ServiceArea, subtype: SUBTYPES[value as ServiceArea][0] })} options={SERVICE_AREA_OPTIONS} /></label>
              <label>治療子類<Select value={editing.subtype} onChange={(value) => setEditing({ ...editing, subtype: value })} options={SUBTYPES[editing.service_area as ServiceArea].map((item) => [item, item])} /></label>
              <label>性別限制<Select value={editing.gender_preference} onChange={(value) => setEditing({ ...editing, gender_preference: value as GenderPreference })} options={[["any", "不限"], ["male", "男治療師"], ["female", "女治療師"]]} /></label>
              <label>堂數<Select value={String(editing.session_count)} onChange={(value) => setEditing({ ...editing, session_count: Number(value), custom_session_count: "" })} options={SESSION_OPTIONS.map((item) => [String(item), `${item} 堂`])} /></label>
              <label>優先級<Select value={editing.queue_priority} onChange={(value) => setEditing({ ...editing, queue_priority: value })} options={[["urgent", "緊急"], ["normal", "普通"]]} /></label>
              <label>預計通知日<input type="date" value={editing.notification_due_date} onChange={(event) => setEditing({ ...editing, notification_due_date: event.target.value })} /></label>
              <label className="check-inline form-span"><input checked={Boolean(editing.monday_only)} disabled={editing.status === "booked"} onChange={(event) => setEditing({ ...editing, monday_only: event.target.checked })} type="checkbox" />星期一特別療程（每星期一堂）</label>
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
  const [unavailableForm, setUnavailableForm] = useState(() => emptyUnavailableForm(data.therapists[0]?.id ?? "", month));
  const [move, setMove] = useState({ appointmentId: "", therapistId: "", date: "", time: "" });
  const [moveTimes, setMoveTimes] = useState<Array<Record<string, any>>>([]);
  const [transfer, setTransfer] = useState({ sourceTherapistId: data.therapists[0]?.id ?? "", date: "", startTime: "", endTime: "", reason: "臨時病假" });
  const [transferPreview, setTransferPreview] = useState<any | null>(null);
  const [panelNotice, setPanelNotice] = useState({ unavailable: "", capacity: "", reschedule: "", matrix: "", transfer: "" });

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
    setUnavailableForm(emptyUnavailableForm(therapistId, month));
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
    try {
      await api("/api/admin/capacity", { method: "POST", session, body: capacity });
      setPanelNotice((current) => ({ ...current, capacity: "每時間段可接納就診者數目已更新，患者前台會即時反映。" }));
      await reload(session);
      await loadCalendar();
    } catch (error) {
      setPanelNotice((current) => ({ ...current, capacity: errorMessage(error) }));
    }
  }

  async function saveUnavailable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!therapistId) {
      setPanelNotice((current) => ({ ...current, unavailable: "請先選擇一位治療師，才可新增不可預約時段。" }));
      return;
    }
    if (!unavailableForm.start_date || !unavailableForm.reason.trim()) {
      setPanelNotice((current) => ({ ...current, unavailable: "請輸入日期及不可預約原因。" }));
      return;
    }
    if (!unavailableForm.all_day && (!unavailableForm.start_time || !unavailableForm.end_time)) {
      setPanelNotice((current) => ({ ...current, unavailable: "部分時段請選擇開始及結束時間。" }));
      return;
    }
    try {
      await api("/api/admin/unavailable", {
        method: "POST",
        session,
        body: {
          ...unavailableForm,
          therapist_id: therapistId,
          end_date: unavailableForm.end_date || unavailableForm.start_date,
          start_time: unavailableForm.all_day ? "" : unavailableForm.start_time,
          end_time: unavailableForm.all_day ? "" : unavailableForm.end_time,
        },
      });
      setPanelNotice((current) => ({ ...current, unavailable: "不可預約時段已保存，月曆和前台名額已更新。" }));
      setUnavailableForm(emptyUnavailableForm(therapistId, month));
      await reload(session);
      await loadCalendar();
    } catch (error) {
      setPanelNotice((current) => ({ ...current, unavailable: errorMessage(error) }));
    }
  }

  async function removeUnavailable(id: string) {
    if (!window.confirm("確認刪除此不可預約時段？")) return;
    try {
      await api(`/api/admin/unavailable/${encodeURIComponent(id)}`, { method: "DELETE", session });
      setPanelNotice((current) => ({ ...current, unavailable: "不可預約時段已刪除。" }));
      setUnavailableForm(emptyUnavailableForm(therapistId, month));
      await reload(session);
      await loadCalendar();
    } catch (error) {
      setPanelNotice((current) => ({ ...current, unavailable: errorMessage(error) }));
    }
  }

  function editUnavailable(row: Record<string, any>) {
    setUnavailableForm({
      id: row.id ?? "",
      therapist_id: row.therapist_id ?? therapistId,
      start_date: row.start_date ?? `${month}-01`,
      end_date: row.end_date ?? row.start_date ?? `${month}-01`,
      start_time: row.start_time ?? "",
      end_time: row.end_time ?? "",
      all_day: Boolean(Number(row.all_day)),
      reason: row.reason ?? "",
    });
  }

  async function reschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/api/admin/reschedule", { method: "POST", session, body: move });
      setPanelNotice((current) => ({ ...current, reschedule: "已改期或轉治療師。" }));
      await loadCalendar();
    } catch (error) {
      setPanelNotice((current) => ({ ...current, reschedule: errorMessage(error) }));
    }
  }

  async function previewTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = await api<any>("/api/admin/bulk-transfer/preview", { method: "POST", session, body: transfer });
      setTransferPreview(result);
      setPanelNotice((current) => ({ ...current, transfer: result.items?.length ? `已找到 ${result.items.length} 堂受影響預約：可自動轉移 ${result.transferable} 堂，待處理 ${result.unresolved} 堂。` : "指定日期/時段沒有受影響預約。" }));
    } catch (error) {
      setPanelNotice((current) => ({ ...current, transfer: errorMessage(error) }));
    }
  }

  async function confirmTransfer() {
    if (!transferPreview || !window.confirm("確認執行批量病假轉移？原治療師的指定範圍會同步設為不可預約。")) return;
    try {
      const result = await api<any>("/api/admin/bulk-transfer/confirm", { method: "POST", session, body: transfer });
      setPanelNotice((current) => ({ ...current, transfer: `已完成批量轉移 ${result.transferred} 堂；${result.unresolved} 堂沒有空位，保留原預約並列為待處理。` }));
      setTransferPreview(null);
      await reload(session);
      await loadCalendar();
    } catch (error) {
      setPanelNotice((current) => ({ ...current, transfer: errorMessage(error) }));
    }
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
  const selectedTherapist = data.therapists.find((item) => item.id === therapistId);
  const selectedTherapistUnavailable = (calendar?.unavailable ?? []).filter((item) => item.therapist_id === therapistId);
  const unavailableTimes = selectedTherapist ? SERVICE_TIMES[selectedTherapist.service_area] : SERVICE_TIMES.ELE;

  async function exportMatrix() {
    if (!selectedTherapist) {
      setPanelNotice((current) => ({ ...current, matrix: "請先選擇一位治療師才可匯出 Excel。" }));
      return;
    }
    try {
      await exportScheduleMatrixExcel({
        bookings: calendar?.bookings ?? [],
        capacities: data.capacities,
        month,
        therapist: selectedTherapist,
        unavailable: calendar?.unavailable ?? [],
      });
      setPanelNotice((current) => ({ ...current, matrix: "Excel 已產生並開始下載。" }));
    } catch (error) {
      setPanelNotice((current) => ({ ...current, matrix: errorMessage(error) }));
    }
  }

  function shiftMatrixMonth(delta: number) {
    setMonth(addMonths(month, delta));
  }

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
        <Metric icon={<HelpCircle size={20} />} label="保留日" value={Number(monthSummary.reservedDays) || 0} />
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
              <div className="plain-list vacancy-list">
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
          <div className="panel-heading"><CalendarDays size={22} /><h2>治療師不可預約時段</h2></div>
          {panelNotice.unavailable && <div className="notice panel-notice">{panelNotice.unavailable}</div>}
          {!therapistId || !selectedTherapist ? (
            <div className="notice">請先在上方選擇一位治療師，才可在同一頁新增或修改年假、會議、病假等不可預約時段。</div>
          ) : (
            <form className="form-grid dense" onSubmit={saveUnavailable}>
              <label>治療師<input disabled value={selectedTherapist.name} /></label>
              <label>開始日期<input type="date" value={unavailableForm.start_date} onChange={(event) => setUnavailableForm({ ...unavailableForm, start_date: event.target.value })} required /></label>
              <label>結束日期<input type="date" value={unavailableForm.end_date} onChange={(event) => setUnavailableForm({ ...unavailableForm, end_date: event.target.value })} /></label>
              <label className="check-inline"><input checked={unavailableForm.all_day} onChange={(event) => setUnavailableForm({ ...unavailableForm, all_day: event.target.checked })} type="checkbox" />全日</label>
              <label>開始時間<Select value={unavailableForm.start_time} onChange={(value) => setUnavailableForm({ ...unavailableForm, start_time: value })} options={[["", "選擇開始時間"], ...unavailableTimes.map((time) => [time, time])]} /></label>
              <label>結束時間<Select value={unavailableForm.end_time} onChange={(value) => setUnavailableForm({ ...unavailableForm, end_time: value })} options={[["", "選擇結束時間"], ...unavailableTimes.map((time) => [time, time])]} /></label>
              <label className="form-span">原因<input value={unavailableForm.reason} onChange={(event) => setUnavailableForm({ ...unavailableForm, reason: event.target.value })} placeholder="例如：年假、會議、培訓、病假" required /></label>
              <div className="button-row form-span">
                <button className="primary-button" type="submit"><Save size={18} />{unavailableForm.id ? "保存修改" : "新增不可預約"}</button>
                <button className="ghost-button" onClick={() => setUnavailableForm(emptyUnavailableForm(therapistId, month))} type="button">清除</button>
              </div>
            </form>
          )}
        </div>
        <div className="panel">
          <div className="panel-heading"><ClipboardList size={22} /><h2>本月不可預約清單</h2></div>
          {!therapistId ? (
            <div className="notice">請選擇單一治療師查看清單。</div>
          ) : (
            <div className={`plain-list unavailable-admin-list ${selectedTherapistUnavailable.length > 10 ? "scrollable-vertical" : ""}`}>
              {selectedTherapistUnavailable.length ? selectedTherapistUnavailable.map((item) => (
                <div key={item.id}>
                  <span>
                    <strong>{item.reason}</strong>
                    <small>{item.start_date} 至 {item.end_date} · {Number(item.all_day) ? "全日" : `${item.start_time}-${item.end_time}`}</small>
                  </span>
                  <div className="button-row compact-actions">
                    <button className="ghost-button compact" onClick={() => editUnavailable(item)} type="button">修改</button>
                    <button className="danger-button compact" onClick={() => removeUnavailable(item.id)} type="button">刪除</button>
                  </div>
                </div>
              )) : <small className="muted">本月沒有不可預約時段。</small>}
            </div>
          )}
        </div>
      </section>
      <section className="grid-two">
        <div className="panel">
          <div className="panel-heading"><Settings size={22} /><h2>每時間段可接納就診者數目</h2></div>
          {panelNotice.capacity && <div className="notice panel-notice">{panelNotice.capacity}</div>}
          <form className="form-grid dense" onSubmit={saveCapacity}>
            <label>套用治療師<Select value={capacity.therapist_id} onChange={(value) => setCapacity({ ...capacity, therapist_id: value })} options={[["", "通用容量"], ...data.therapists.map((item) => [item.id, item.name])]} /></label>
            <label>大類<Select value={capacity.service_area} onChange={(value) => setCapacity({ ...capacity, service_area: value as ServiceArea, subtype: SUBTYPES[value as ServiceArea][0], time: SERVICE_TIMES[value as ServiceArea][0] })} options={SERVICE_AREA_OPTIONS} /></label>
            <label>子類<Select value={capacity.subtype} onChange={(value) => setCapacity({ ...capacity, subtype: value })} options={SUBTYPES[capacity.service_area].map((item) => [item, item])} /></label>
            <label>星期<Select value={String(capacity.weekday)} onChange={(value) => setCapacity({ ...capacity, weekday: Number(value) })} options={WEEKDAY_OPTIONS} /></label>
            <label>時間<Select value={capacity.time} onChange={(value) => setCapacity({ ...capacity, time: value })} options={SERVICE_TIMES[capacity.service_area].map((time) => [time, time])} /></label>
            <label>每時間段可接納就診者數目<input inputMode="numeric" value={capacity.capacity} onChange={(event) => setCapacity({ ...capacity, capacity: Number(event.target.value) })} /></label>
            <button className="primary-button" type="submit"><Save size={18} />保存容量</button>
          </form>
        </div>
        <div className="panel">
          <div className="panel-heading"><RefreshCw size={22} /><h2>內部改期/轉治療師</h2></div>
          {panelNotice.reschedule && <div className="notice panel-notice">{panelNotice.reschedule}</div>}
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
        <div className="panel-heading"><RefreshCw size={22} /><h2>批量病假轉移</h2></div>
        <p className="flow-copy">選擇原治療師與病假範圍後，系統會按同日、同時間、大類、子類、性別限制、可用容量與不可預約時段預覽分配。確認後才正式轉移。</p>
        {panelNotice.transfer && <div className="notice panel-notice">{panelNotice.transfer}</div>}
        <form className="form-grid dense" onSubmit={previewTransfer}>
          <label>原治療師<Select value={transfer.sourceTherapistId} onChange={(value) => setTransfer({ ...transfer, sourceTherapistId: value })} options={data.therapists.map((item) => [item.id, `${item.name} (${item.service_area})`])} /></label>
          <label>病假日期<input type="date" value={transfer.date} onChange={(event) => setTransfer({ ...transfer, date: event.target.value })} required /></label>
          <label>開始時間（留空為全日）<Select value={transfer.startTime} onChange={(value) => setTransfer({ ...transfer, startTime: value })} options={[["", "全日"], ...SERVICE_TIMES[(data.therapists.find((item) => item.id === transfer.sourceTherapistId)?.service_area ?? "ELE")].map((time) => [time, time])]} /></label>
          <label>結束時間（留空為全日）<Select value={transfer.endTime} onChange={(value) => setTransfer({ ...transfer, endTime: value })} options={[["", "全日"], ...SERVICE_TIMES[(data.therapists.find((item) => item.id === transfer.sourceTherapistId)?.service_area ?? "ELE")].map((time) => [time, time])]} /></label>
          <label className="form-span">病假原因<input value={transfer.reason} onChange={(event) => setTransfer({ ...transfer, reason: event.target.value })} required /></label>
          <button className="primary-button" type="submit"><RefreshCw size={18} />預覽自動分配</button>
        </form>
        {transferPreview && <div className={`table-wrap compact-list ${transferPreview.items.length > 10 ? "table-scroll" : ""}`}><table><thead><tr><th>時間</th><th>患者</th><th>建議轉往</th><th>結果</th></tr></thead><tbody>{transferPreview.items.map((item: any) => <tr key={item.appointmentId}><td>{item.time}</td><td>{item.patientCode} {item.displayName}</td><td>{item.targetTherapistName || "沒有空位"}</td><td>{item.targetTherapistId ? "可轉移" : item.reason}</td></tr>)}</tbody></table><div className="button-row"><button className="primary-button" onClick={confirmTransfer} type="button"><ShieldCheck size={18} />確認批量轉移</button><button className="ghost-button" onClick={() => setTransferPreview(null)} type="button">取消預覽</button></div></div>}
      </section>
      <section className="panel">
        <div className="panel-heading matrix-toolbar">
          <div><ClipboardList size={22} /><h2>月度時間表矩陣</h2></div>
          <div className="button-row">
            <button className="ghost-button compact" onClick={() => shiftMatrixMonth(-1)} type="button"><ChevronLeft size={16} />上一月</button>
            <button className="ghost-button compact" onClick={() => setMonth(new Date().toISOString().slice(0, 7))} type="button">本月</button>
            <button className="ghost-button compact" onClick={() => shiftMatrixMonth(1)} type="button">下一月<ChevronRight size={16} /></button>
            <button className="primary-button compact" onClick={exportMatrix} type="button"><Save size={16} />匯出 Excel</button>
          </div>
        </div>
        {panelNotice.matrix && <div className="notice panel-notice">{panelNotice.matrix}</div>}
        <MonthlyScheduleMatrix
          bookings={calendar?.bookings ?? []}
          capacities={data.capacities}
          month={month}
          therapist={selectedTherapist}
          unavailable={calendar?.unavailable ?? []}
        />
      </section>
    </section>
  );
}

function SettingsAdmin({ data, session, reload, setNotice }: { data: AdminData; session: string; reload: (session?: string) => Promise<void>; setNotice: (value: string) => void }) {
  const [therapist, setTherapist] = useState({ id: "", name: "", service_area: "ELE" as ServiceArea, code: "", gender: "unknown" as Gender });
  const [doctor, setDoctor] = useState({ id: "", code: "", name: "", quota: 30 });
  const [holiday, setHoliday] = useState({ date: "", name: "" });
  const [portalNotice, setPortalNotice] = useState("");
  const [settingsTab, setSettingsTab] = useState<"general" | "year-rollover">("general");

  async function saveTherapist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api("/api/admin/therapists", { method: "POST", session, body: therapist });
    setNotice(therapist.id ? "治療師資料已修改。" : "治療師已新增。");
    setTherapist({ id: "", name: "", service_area: "ELE", code: "", gender: "unknown" });
    await reload(session);
  }

  async function saveDoctor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api("/api/admin/doctors", { method: "POST", session, body: doctor });
    setNotice(doctor.id ? "醫生資料及 quota 已修改。" : "醫生已新增。");
    setDoctor({ id: "", code: "", name: "", quota: 30 });
    await reload(session);
  }

  async function remove(kind: "therapists" | "doctors", id: string) {
    await api(`/api/admin/${kind}/${encodeURIComponent(id)}`, { method: "DELETE", session });
    setNotice("已更新。");
    await reload(session);
  }

  async function setPortal(state: "open" | "closed" | "auto") {
    try {
      const result = await api<PortalStatus>("/api/admin/portal-status", { method: "POST", session, body: { state } });
      setPortalNotice(`${result.message}${result.manualUntil ? ` 人手設定至 ${new Date(result.manualUntil).toLocaleString("zh-HK")}` : ""}`);
      await reload(session);
    } catch (error) {
      setPortalNotice(errorMessage(error));
    }
  }

  async function saveHoliday(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/api/admin/holidays", { method: "POST", session, body: holiday });
      setHoliday({ date: "", name: "" });
      setPortalNotice("公眾假期已保存，前台開放狀態已更新。");
      await reload(session);
    } catch (error) {
      setPortalNotice(errorMessage(error));
    }
  }

  async function deleteHoliday(date: string) {
    if (!window.confirm("刪除此公眾假期？")) return;
    try {
      await api(`/api/admin/holidays/${encodeURIComponent(date)}`, { method: "DELETE", session });
      setPortalNotice("公眾假期已刪除。");
      await reload(session);
    } catch (error) {
      setPortalNotice(errorMessage(error));
    }
  }

  return (
    <section className="settings-layout">
      <aside className="settings-nav" aria-label="資料設定子分頁">
        <button className={settingsTab === "general" ? "active" : ""} onClick={() => setSettingsTab("general")} type="button">資料設定</button>
        <button className={settingsTab === "year-rollover" ? "active" : ""} onClick={() => setSettingsTab("year-rollover")} type="button">跨年轉更</button>
      </aside>
      <div className="stack">
      {settingsTab === "general" && <>
      <section className="grid-two">
        <div className="panel">
          <div className="panel-heading"><Activity size={22} /><h2>前台網上預約開放</h2></div>
          <div className={`notice ${data.portal.open ? "portal-open" : ""}`}><strong>{data.portal.open ? "現正開放" : "現已關閉"}</strong><small>{data.portal.message}</small></div>
          {portalNotice && <div className="notice panel-notice">{portalNotice}</div>}
          <div className="button-row"><button className="primary-button" onClick={() => setPortal("open")} type="button">立即開放前台</button><button className="danger-button" onClick={() => setPortal("closed")} type="button">立即關閉前台</button><button className="ghost-button" onClick={() => setPortal("auto")} type="button">回復自動時間</button></div>
          <small className="muted">自動規則：星期一至五 09:00-17:00 開放；週末和公眾假期關閉。人手覆寫會在下一個 09:00 或 17:00 時段邊界失效。</small>
        </div>
        <div className="panel">
          <div className="panel-heading"><CalendarDays size={22} /><h2>公眾假期</h2></div>
          <form className="form-grid dense" onSubmit={saveHoliday}><label>日期<input type="date" value={holiday.date} onChange={(event) => setHoliday({ ...holiday, date: event.target.value })} required /></label><label>名稱<input value={holiday.name} onChange={(event) => setHoliday({ ...holiday, name: event.target.value })} required /></label><button className="primary-button" type="submit"><Save size={18} />保存假期</button></form>
          <div className={`plain-list compact-list ${data.holidays.length > 10 ? "scrollable-vertical" : ""}`}>{data.holidays.length ? data.holidays.map((item) => <div key={item.date}><span><strong>{item.date}</strong><small>{item.name}</small></span><button className="danger-button compact" onClick={() => deleteHoliday(item.date)} type="button">刪除</button></div>) : <small className="muted">未設定公眾假期。</small>}</div>
        </div>
      </section>
      <section className="grid-three">
        <div className="panel">
          <div className="panel-heading"><Users size={22} /><h2>治療師</h2></div>
          <form className="form-grid dense" onSubmit={saveTherapist}>
            <label>名稱<input value={therapist.name} onChange={(event) => setTherapist({ ...therapist, name: event.target.value })} /></label>
            <label>大類<Select value={therapist.service_area} onChange={(value) => setTherapist({ ...therapist, service_area: value as ServiceArea })} options={SERVICE_AREA_OPTIONS} /></label>
            <label>代號<input value={therapist.code} onChange={(event) => setTherapist({ ...therapist, code: event.target.value })} /></label>
            <label>性別<Select value={therapist.gender} onChange={(value) => setTherapist({ ...therapist, gender: value as Gender })} options={[["unknown", "未設定"], ["male", "男"], ["female", "女"]]} /></label>
            <div className="button-row"><button className="primary-button" type="submit"><Save size={18} />{therapist.id ? "保存修改" : "新增治療師"}</button>{therapist.id && <button className="ghost-button" onClick={() => setTherapist({ id: "", name: "", service_area: "ELE", code: "", gender: "unknown" })} type="button">取消修改</button>}</div>
          </form>
        </div>
        <div className="panel">
          <div className="panel-heading"><Stethoscope size={22} /><h2>轉介醫生</h2></div>
          <form className="form-grid dense" onSubmit={saveDoctor}>
            <label>代號<input value={doctor.code} onChange={(event) => setDoctor({ ...doctor, code: event.target.value })} /></label>
            <label>名稱<input value={doctor.name} onChange={(event) => setDoctor({ ...doctor, name: event.target.value })} /></label>
            <label>Quota<input inputMode="numeric" value={doctor.quota} onChange={(event) => setDoctor({ ...doctor, quota: Number(event.target.value) })} /></label>
            <div className="button-row"><button className="primary-button" type="submit"><Save size={18} />{doctor.id ? "保存修改" : "新增醫生"}</button>{doctor.id && <button className="ghost-button" onClick={() => setDoctor({ id: "", code: "", name: "", quota: 30 })} type="button">取消修改</button>}</div>
          </form>
        </div>
      </section>
      <section className="grid-three">
        <ListPanel title="治療師清單" rows={data.therapists} main="name" sub={(row) => `${row.service_area} · ${genderText(row.gender)} · ${row.active ? "啟用" : "停用"}`} onEdit={(row) => setTherapist({ id: row.id, name: row.name, service_area: row.service_area, code: row.code, gender: row.gender })} onDelete={(id) => remove("therapists", id)} />
        <ListPanel title="醫生清單" rows={data.doctors} main="name" sub={(row) => `${row.code} · quota ${row.quota} · ${row.active ? "啟用" : "停用"}`} onEdit={(row) => setDoctor({ id: row.id, code: row.code, name: row.name, quota: Number(row.quota) || 30 })} onDelete={(id) => remove("doctors", id)} />
      </section>
      </>}
      {settingsTab === "year-rollover" && (
        <section className="panel settings-info-panel">
          <div className="panel-heading"><CalendarDays size={22} /><div><p className="eyebrow">跨年轉更</p><h2>治療師跨年排更</h2></div></div>
          <p>用於治療師跨年排更之用。</p>
        </section>
      )}
      </div>
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
    <div className={`table-wrap ${rows.length > 10 ? "table-scroll" : ""}`}>
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

function MonthlyScheduleMatrix({
  bookings,
  capacities,
  month,
  therapist,
  unavailable,
}: {
  bookings: Array<Record<string, any>>;
  capacities: Array<Record<string, any>>;
  month: string;
  therapist?: Therapist;
  unavailable: Array<Record<string, any>>;
}) {
  if (!therapist) {
    return <div className="notice">請先在上方選擇一位治療師，系統會在這裡顯示該治療師的月度時間表矩陣。</div>;
  }

  const dates = monthDays(month).filter((date) => {
    const weekday = weekdayNumber(date);
    return weekday >= 1 && weekday <= 5;
  });
  const times = SERVICE_TIMES[therapist.service_area];
  const bookingsBySlot = bookings
    .filter((item) => item.therapist_id === therapist.id)
    .reduce<Record<string, Array<Record<string, any>>>>((groups, item) => {
      const key = `${item.date}|${item.time}`;
      groups[key] = [...(groups[key] ?? []), item];
      return groups;
    }, {});
  const monthBlocks = unavailable.filter((item) => item.therapist_id === therapist.id);

  return (
    <div className="schedule-matrix-wrap">
      <table className="schedule-matrix">
        <thead>
          <tr>
            <th className="sticky-col">時間</th>
            {dates.map((date) => (
              <th className={weekdayNumber(date) === 1 ? "reserved-column" : ""} key={date}>
                <span>{formatDate(date)}</span>
                <small>{weekdayText(date)}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((time) => (
            <tr key={time}>
              <th className="sticky-col time-col">{time}</th>
              {dates.map((date) => {
                const weekday = weekdayNumber(date);
                const slotBookings = bookingsBySlot[`${date}|${time}`] ?? [];
                const blocks = monthBlocks.filter((item) => unavailableCoversSlot(item, date, time));
                const capacity = weekday === 1 ? 0 : matrixCapacity(capacities, therapist, weekday, time);
                const isFull = capacity > 0 && slotBookings.length >= capacity;
                const isReserved = weekday === 1;
                return (
                  <td className={`matrix-cell ${isReserved ? "matrix-reserved" : ""} ${blocks.length ? "matrix-blocked" : ""} ${isFull ? "matrix-full" : ""}`} key={`${date}-${time}`}>
                    <div className="matrix-capacity">
                      {isReserved ? "保留日" : capacity > 0 ? `${slotBookings.length}/${capacity}${isFull ? " 滿" : ""}` : "未開放"}
                    </div>
                    {blocks.map((block) => (
                      <div className="matrix-block-note" key={block.id ?? `${block.reason}-${date}-${time}`}>
                        {block.reason}{Number(block.all_day) ? "" : ` ${block.start_time}-${block.end_time}`}
                      </div>
                    ))}
                    {slotBookings.map((booking, index) => (
                      <div className="matrix-patient" key={booking.id ?? `${date}-${time}-${index}`}>
                        <strong>{booking.display_name || booking.patient_code || "未命名患者"}</strong>
                        <small>{booking.id_number || "未填身份證"}</small>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function exportScheduleMatrixExcel({
  bookings,
  capacities,
  month,
  therapist,
  unavailable,
}: {
  bookings: Array<Record<string, any>>;
  capacities: Array<Record<string, any>>;
  month: string;
  therapist: Therapist;
  unavailable: Array<Record<string, any>>;
}) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hogan PT Demo";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("月度時間表矩陣", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 4 }],
  });
  const dates = monthDays(month).filter((date) => {
    const weekday = weekdayNumber(date);
    return weekday >= 1 && weekday <= 5;
  });
  const times = SERVICE_TIMES[therapist.service_area];
  const bookingsBySlot = bookings
    .filter((item) => item.therapist_id === therapist.id)
    .reduce<Record<string, Array<Record<string, any>>>>((groups, item) => {
      const key = `${item.date}|${item.time}`;
      groups[key] = [...(groups[key] ?? []), item];
      return groups;
    }, {});
  const monthBlocks = unavailable.filter((item) => item.therapist_id === therapist.id);
  const lastColumn = dates.length + 1;

  sheet.mergeCells(1, 1, 1, lastColumn);
  sheet.getCell(1, 1).value = `${therapist.name} ${month} 月度時間表矩陣`;
  sheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: "FF203733" } };
  sheet.getCell(2, 1).value = "治療師";
  sheet.getCell(2, 2).value = `${therapist.name} (${therapist.code || therapist.id})`;
  sheet.getCell(3, 1).value = "月份";
  sheet.getCell(3, 2).value = month;

  const header = sheet.getRow(4);
  header.getCell(1).value = "時間";
  dates.forEach((date, index) => {
    header.getCell(index + 2).value = `${formatDate(date)}\n${weekdayText(date)}`;
  });
  header.height = 34;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FF203733" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE9F4F1" } };
    cell.border = excelBorder();
  });

  times.forEach((time, rowIndex) => {
    const row = sheet.getRow(rowIndex + 5);
    row.getCell(1).value = time;
    row.getCell(1).font = { bold: true, color: { argb: "FF1F6F65" } };
    row.getCell(1).alignment = { vertical: "top", horizontal: "center" };
    row.height = 78;
    dates.forEach((date, dateIndex) => {
      const weekday = weekdayNumber(date);
      const slotBookings = bookingsBySlot[`${date}|${time}`] ?? [];
      const blocks = monthBlocks.filter((item) => unavailableCoversSlot(item, date, time));
      const capacity = weekday === 1 ? 0 : matrixCapacity(capacities, therapist, weekday, time);
      const isFull = capacity > 0 && slotBookings.length >= capacity;
      const lines = [
        weekday === 1 ? "保留日" : capacity > 0 ? `${slotBookings.length}/${capacity}${isFull ? " 滿" : ""}` : "未開放",
        ...blocks.map((block) => `${block.reason}${Number(block.all_day) ? "" : ` ${block.start_time}-${block.end_time}`}`),
        ...slotBookings.map((booking) => `${booking.display_name || booking.patient_code || "未命名患者"}\n${booking.id_number || "未填身份證"}`),
      ];
      const cell = row.getCell(dateIndex + 2);
      cell.value = lines.join("\n");
      cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
      cell.border = excelBorder();
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: weekday === 1 ? "FFF0F2F4" : blocks.length ? "FFFFE7DF" : isFull ? "FFFFF0EE" : "FFFFFFFF" },
      };
      cell.font = { bold: slotBookings.length > 0 || blocks.length > 0, color: { argb: blocks.length ? "FF9F2F2B" : "FF203733" } };
    });
  });

  sheet.columns = [{ width: 10 }, ...dates.map(() => ({ width: 22 }))];
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, `${safeFileName(therapist.code || therapist.name)}-${month}-月度時間表矩陣.xlsx`);
}

function ListPanel({ title, rows, main, sub, onEdit, onDelete }: { title: string; rows: any[]; main: string; sub: (row: any) => string; onEdit: (row: any) => void; onDelete: (id: string) => void }) {
  return (
    <div className="panel">
      <div className="panel-heading"><ClipboardList size={22} /><h2>{title}</h2></div>
      <div className={`plain-list ${rows.length > 10 ? "scrollable-vertical" : ""}`}>
        {rows.map((row) => (
          <div key={row.id}>
            <span>
              <strong>{row[main]}</strong>
              <small>{sub(row)}</small>
            </span>
            <div className="inline-actions">
              <button className="icon-button" onClick={() => onEdit(row)} type="button" aria-label="修改" title="修改"><Pencil size={16} /></button>
              <button className="icon-button" onClick={() => onDelete(row.id)} type="button" aria-label="刪除或停用" title="刪除或停用"><Trash2 size={16} /></button>
            </div>
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
  if (step === "group") return "選班別";
  if (step === "time") return "選時間";
  if (step === "therapist") return "選治療師";
  if (step === "plan") return "選方案";
  if (step === "review") return "確認";
  return step;
}

function getDateChoices(availability: Availability, time: string, therapistId: string, group: ScheduleGroup): Appointment[] {
  return availability.slots
    .filter((slot) => slot.available && slot.time === time && slot.therapistId === therapistId && isGroupDate(slot.date, group))
    .sort((left, right) => left.date.localeCompare(right.date))
    .map(slotToAppointment);
}

function getTimeOptions(availability: Availability, group: ScheduleGroup) {
  return availability.times
    .map((time) => {
      const therapistOptions = getTherapistOptions(availability, time, group);
      const earliestDate = therapistOptions.map((option) => option.earliestDate).sort()[0];
      return { time, therapistCount: therapistOptions.length, earliestDate };
    })
    .filter((option) => option.therapistCount > 0 && option.earliestDate);
}

function getTherapistOptions(availability: Availability, time: string, group: ScheduleGroup) {
  return availability.therapists
    .map((therapist) => {
      const choices = getDateChoices(availability, time, therapist.id, group);
      const plan = buildGreedyPlan(choices, availability.patient.session_count);
      return { therapist, earliestDate: plan[0]?.date ?? "", plan };
    })
    .filter((option) => option.plan.length === availability.patient.session_count);
}

function getPlanOptions(availability: Availability, time: string, therapistId: string, group: ScheduleGroup): PlanOption[] {
  const choices = getDateChoices(availability, time, therapistId, group);
  const sessionCount = availability.patient.session_count;
  const fastest = buildGreedyPlan(choices, sessionCount);
  const delayedOneWeek = fastest.length ? buildGreedyPlan(choices, sessionCount, addDays(fastest[0].date, 6)) : [];
  const delayedTwoWeeks = fastest.length ? buildGreedyPlan(choices, sessionCount, addDays(fastest[0].date, 13)) : [];
  return [
    {
      key: "fastest",
      title: "最快完成",
      caption: planCaption(fastest),
      appointments: fastest,
    },
    {
      key: "delay-one-week",
      title: "延後一週開始",
      caption: planCaption(delayedOneWeek),
      appointments: delayedOneWeek,
    },
    {
      key: "delay-two-weeks",
      title: "延後兩週開始",
      caption: planCaption(delayedTwoWeeks),
      appointments: delayedTwoWeeks,
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

function canAddAppointment(selected: Appointment[], appointment: Appointment) {
  if (selected.some((item) => item.date === appointment.date)) return false;
  const sameWeek = selected.filter((item) => weekKey(item.date) === weekKey(appointment.date));
  if (sameWeek.length >= (weekdayNumber(appointment.date) === 1 ? 1 : 2)) return false;
  return true;
}

function getCustomStartDates(availability: Availability, time: string, therapistId: string, group: ScheduleGroup) {
  const choices = getDateChoices(availability, time, therapistId, group);
  return choices.filter((choice) => {
    const plan = buildGreedyPlan(choices, availability.patient.session_count, addDays(choice.date, -1));
    return plan.length === availability.patient.session_count && plan[0]?.date === choice.date;
  });
}

function buildCustomDateGrid(
  availability: Availability,
  time: string,
  therapistId: string,
  group: ScheduleGroup,
  customStartDates: Appointment[],
) {
  const choices = getDateChoices(availability, time, therapistId, group);
  const choicesByDate = new Map(choices.map((choice) => [choice.date, choice]));
  const startDates = new Set(customStartDates.map((choice) => choice.date));
  return availability.dates.map((date) => {
    const groupAllowed = isGroupDate(date, group);
    const appointment = choicesByDate.get(date);
    const sourceSlot = availability.slots.find((slot) => slot.date === date && slot.time === time && slot.therapistId === therapistId);
    return {
      date,
      groupAllowed,
      appointment,
      canStart: Boolean(appointment && startDates.has(date)),
      reason: sourceSlot?.reason || "此日期未能排滿整個療程",
    };
  });
}

function isGroupDate(date: string, group: ScheduleGroup) {
  return SCHEDULE_GROUPS[group].weekdays.includes(weekdayNumber(date));
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

function weekdayNumber(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function addMonths(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
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
  if (day.status === "reserved") return "保留日";
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

function emptyUnavailableForm(therapistId: string, month: string) {
  return {
    id: "",
    therapist_id: therapistId,
    start_date: `${month}-01`,
    end_date: `${month}-01`,
    start_time: "",
    end_time: "",
    all_day: true,
    reason: "",
  };
}

function matrixCapacity(rows: Array<Record<string, any>>, therapist: Therapist, weekday: number, time: string) {
  let max = 0;
  for (const subtype of SUBTYPES[therapist.service_area]) {
    const subtypeRows = rows.filter((row) => (
      row.service_area === therapist.service_area
      && row.subtype === subtype
      && Number(row.weekday) === weekday
      && row.time === time
    ));
    const specific = capacityFromRows(subtypeRows, therapist.id, weekday, time);
    const shared = capacityFromRows(subtypeRows, "", weekday, time);
    max = Math.max(max, specific ?? shared ?? 0);
  }
  return max;
}

function capacityFromRows(rows: Array<Record<string, any>>, therapistId: string, weekday: number, time: string) {
  const row = rows.find((item) => String(item.therapist_id ?? "") === therapistId && Number(item.weekday) === weekday && item.time === time);
  return row ? Number(row.capacity) || 0 : undefined;
}

function unavailableCoversSlot(block: Record<string, any>, date: string, time: string) {
  if (date < block.start_date || date > block.end_date) return false;
  if (Number(block.all_day)) return true;
  return time >= String(block.start_time ?? "") && time < String(block.end_time ?? "");
}

function excelBorder() {
  return {
    top: { style: "thin" as const, color: { argb: "FFD7E3DF" } },
    left: { style: "thin" as const, color: { argb: "FFD7E3DF" } },
    bottom: { style: "thin" as const, color: { argb: "FFD7E3DF" } },
    right: { style: "thin" as const, color: { argb: "FFD7E3DF" } },
  };
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").slice(0, 60) || "therapist";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sumCount(rows: any[], key = "count") {
  return rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失敗";
}

export default App;
