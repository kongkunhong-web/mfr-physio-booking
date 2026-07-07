interface Env {
  DB: D1Database;
}

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
};

type Patient = {
  id: string;
  patient_code: string;
  id_number: string;
  phone: string;
  display_name: string;
  doctor_id: string;
  service_area: ServiceArea;
  subtype: string;
  gender_preference: GenderPreference;
  session_count: number;
  status: "draft" | "pending" | "active" | "booked";
  batch_id?: string | null;
  rules_accepted_at?: string | null;
  created_at?: string;
  activated_at?: string | null;
};

type AppointmentInput = {
  date: string;
  time: string;
  therapistId: string;
};

const ADMIN_SESSION = "demo-admin";
const HELP_PHONE = "8390 5180";
const MAX_WEEKS = 12;

const VALID_SUBTYPES: Record<ServiceArea, string[]> = {
  ELE: ["ELE-1", "ELE-2", "ELE-3"],
  GYM: ["GYM-1", "GYM-1/2", "GYM-3", "GYM-3-1"],
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === "OPTIONS") return json({ ok: true });

  try {
    const path = normalizePath(context.params.path);
    const method = context.request.method.toUpperCase();

    if (method === "GET" && path === "meta") return getMeta(context.env.DB);
    if (method === "POST" && path === "patient/login") return patientLogin(context);
    if (method === "POST" && path === "patient/accept-rules") return acceptRules(context);
    if (method === "GET" && path === "patient/availability") return patientAvailability(context);
    if (method === "POST" && path === "patient/book") return patientBook(context);
    if (method === "POST" && path === "patient/help") return patientHelp(context);

    if (method === "POST" && path === "admin/login") return adminLogin(context);
    if (method === "GET" && path === "admin/bootstrap") return withAdmin(context, () => adminBootstrap(context));
    if (method === "POST" && path === "admin/therapists") return withAdmin(context, () => upsertTherapist(context));
    if (method === "DELETE" && path.startsWith("admin/therapists/")) {
      return withAdmin(context, () => softDelete(context.env.DB, "therapists", pathId(path)));
    }
    if (method === "POST" && path === "admin/doctors") return withAdmin(context, () => upsertDoctor(context));
    if (method === "DELETE" && path.startsWith("admin/doctors/")) {
      return withAdmin(context, () => softDelete(context.env.DB, "doctors", pathId(path)));
    }
    if (method === "POST" && path === "admin/unavailable") return withAdmin(context, () => upsertUnavailable(context));
    if (method === "DELETE" && path.startsWith("admin/unavailable/")) {
      return withAdmin(context, () => deleteRow(context.env.DB, "unavailable_blocks", pathId(path)));
    }
    if (method === "POST" && path === "admin/patients") return withAdmin(context, () => upsertPatient(context));
    if (method === "DELETE" && path.startsWith("admin/patients/")) {
      return withAdmin(context, () => deletePatientAccount(context.env.DB, pathId(path)));
    }
    if (method === "POST" && path.startsWith("admin/patients/") && path.endsWith("/cancel-booking")) {
      return withAdmin(context, () => cancelPatientBooking(context.env.DB, decodeURIComponent(path.split("/")[2] ?? "")));
    }
    if (method === "POST" && path === "admin/activate") return withAdmin(context, () => activatePatients(context));
    if (method === "POST" && path === "admin/capacity") return withAdmin(context, () => upsertCapacity(context));
    if (method === "POST" && path === "admin/reschedule") return withAdmin(context, () => adminReschedule(context));
    if (method === "GET" && path === "admin/reschedule-options") return withAdmin(context, () => adminRescheduleOptions(context));
    if (method === "GET" && path === "admin/calendar") return withAdmin(context, () => adminCalendar(context));
    if (method === "POST" && path === "admin/demo/wk-july-full") return withAdmin(context, () => seedWkJulyFullDemo(context.env.DB));
    if (method === "POST" && path === "admin/demo-reset") return withAdmin(context, () => demoReset(context.env.DB));

    return json({ error: "找不到 API 路由" }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "伺服器發生未知錯誤" }, 500);
  }
};

function normalizePath(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join("/") : value ?? "";
}

function pathId(path: string) {
  return decodeURIComponent(path.split("/").pop() ?? "");
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,x-admin-session",
    },
  });
}

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

async function withAdmin(context: EventContext<Env, string, unknown>, handler: () => Promise<Response>) {
  if (context.request.headers.get("x-admin-session") !== ADMIN_SESSION) {
    return json({ error: "後台登入已失效，請重新登入" }, 401);
  }
  return handler();
}

async function all<T = Record<string, unknown>>(db: D1Database, sql: string, ...binds: unknown[]) {
  const result = await db.prepare(sql).bind(...binds).all<T>();
  return result.results ?? [];
}

function first<T = Record<string, unknown>>(db: D1Database, sql: string, ...binds: unknown[]) {
  return db.prepare(sql).bind(...binds).first<T>();
}

function run(db: D1Database, sql: string, ...binds: unknown[]) {
  return db.prepare(sql).bind(...binds).run();
}

async function getMeta(db: D1Database) {
  const [therapists, doctors] = await Promise.all([
    all(db, "SELECT * FROM therapists WHERE active=1 ORDER BY service_area,name"),
    all(db, "SELECT * FROM doctors WHERE active=1 ORDER BY code"),
  ]);
  return json({ therapists, doctors, subtypes: VALID_SUBTYPES, helpPhone: HELP_PHONE });
}

async function patientLogin(context: EventContext<Env, string, unknown>) {
  const body = await readJson<{ idNumber: string; phone: string }>(context.request);
  const patient = await first<Patient>(
    context.env.DB,
    "SELECT * FROM patients WHERE id_number=? AND phone=?",
    String(body.idNumber ?? "").trim(),
    String(body.phone ?? "").trim(),
  );

  if (!patient || !["active", "booked"].includes(patient.status)) {
    return json({
      status: "pending",
      message: "暫時未查到已開通的線上預約權限。請等候醫院短訊，或按「致電求助」由職員協助。",
      helpPhone: HELP_PHONE,
    });
  }

  return json({
    status: "active",
    patient: publicPatient(patient),
    booking: await getBookingForPatient(context.env.DB, patient.id),
    helpPhone: HELP_PHONE,
  });
}

async function acceptRules(context: EventContext<Env, string, unknown>) {
  const body = await readJson<{ patientId: string }>(context.request);
  await run(context.env.DB, "UPDATE patients SET rules_accepted_at=CURRENT_TIMESTAMP WHERE id=?", body.patientId);
  return json({ ok: true });
}

async function patientAvailability(context: EventContext<Env, string, unknown>) {
  const url = new URL(context.request.url);
  const patientId = url.searchParams.get("patientId");
  const start = url.searchParams.get("start") ?? todayKey();
  if (!patientId) return json({ error: "缺少 patientId" }, 400);

  const patient = await first<Patient>(context.env.DB, "SELECT * FROM patients WHERE id=?", patientId);
  if (!patient || !["active", "booked"].includes(patient.status)) return json({ error: "此帳號尚未開通" }, 403);

  const [therapists, capacities, unavailable, bookedRows, booking] = await Promise.all([
    therapistsForPatient(context.env.DB, patient),
    all<any>(
      context.env.DB,
      "SELECT * FROM slot_capacities WHERE service_area=? AND subtype=?",
      patient.service_area,
      patient.subtype,
    ),
    all<any>(context.env.DB, "SELECT * FROM unavailable_blocks"),
    all<any>(
      context.env.DB,
      "SELECT therapist_id,date,time,COUNT(*) AS count FROM booking_events WHERE status='confirmed' GROUP BY therapist_id,date,time",
    ),
    getBookingForPatient(context.env.DB, patient.id),
  ]);

  const aliases = aliasMap(therapists, todayKey());
  const capacityMap = buildCapacityMap(capacities);
  const bookedMap = new Map(bookedRows.map((row) => [`${row.therapist_id}|${row.date}|${row.time}`, Number(row.count) || 0]));
  const dates = nextBookableDates(start, MAX_WEEKS);
  const times = [...new Set(capacities.map((row) => String(row.time)))].sort();
  const slots = [];

  for (const date of dates) {
    const weekday = weekdayNumber(date);
    for (const time of times) {
      for (const therapist of therapists) {
        const capacity = capacityFor(capacityMap, therapist.id, weekday, time);
        const booked = bookedMap.get(`${therapist.id}|${date}|${time}`) ?? 0;
        const blocked = isUnavailable(unavailable, therapist.id, date, time);
        slots.push({
          date,
          time,
          therapistId: therapist.id,
          therapistAlias: aliases.get(therapist.id) ?? therapist.code,
          capacity,
          booked,
          available: !blocked && booked < capacity,
          reason: blocked ? "不可預約時段" : booked >= capacity ? "名額已滿" : "",
        });
      }
    }
  }

  return json({
    patient: publicPatient(patient),
    dates,
    times,
    therapists: therapists.map((therapist) => ({ ...therapist, alias: aliases.get(therapist.id) })),
    slots,
    booking,
  });
}

async function patientBook(context: EventContext<Env, string, unknown>) {
  const body = await readJson<{ patientId: string; appointments: AppointmentInput[] }>(context.request);
  const patient = await first<Patient>(context.env.DB, "SELECT * FROM patients WHERE id=?", body.patientId);
  if (!patient || !["active", "booked"].includes(patient.status)) return json({ error: "此帳號尚未開通" }, 403);

  const validation = await validateAppointments(context.env.DB, patient, body.appointments);
  if (!validation.ok) return json({ error: validation.error, conflicts: validation.conflicts ?? [] }, 409);

  const existing = await first<{ id: string }>(context.env.DB, "SELECT id FROM bookings WHERE patient_id=?", patient.id);
  const bookingId = existing?.id ?? `book-${crypto.randomUUID()}`;
  if (!existing) await run(context.env.DB, "INSERT INTO bookings (id,patient_id,status) VALUES (?,?, 'confirmed')", bookingId, patient.id);

  await run(context.env.DB, "DELETE FROM booking_events WHERE patient_id=?", patient.id);
  const sorted = [...body.appointments].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  for (let index = 0; index < sorted.length; index += 1) {
    const item = sorted[index];
    await run(
      context.env.DB,
      "INSERT INTO booking_events (id,booking_id,patient_id,therapist_id,date,time,service_area,subtype,session_no,status) VALUES (?,?,?,?,?,?,?,?,?,'confirmed')",
      `appt-${crypto.randomUUID()}`,
      bookingId,
      patient.id,
      item.therapistId,
      item.date,
      item.time,
      patient.service_area,
      patient.subtype,
      index + 1,
    );
  }
  await run(context.env.DB, "UPDATE patients SET status='booked' WHERE id=?", patient.id);
  return json({ ok: true, booking: await getBookingForPatient(context.env.DB, patient.id) });
}

async function patientHelp(context: EventContext<Env, string, unknown>) {
  const body = await readJson<{ patientId?: string; idNumber?: string; phone?: string; note?: string }>(context.request);
  await run(
    context.env.DB,
    "INSERT INTO help_requests (id,patient_id,id_number,phone,note) VALUES (?,?,?,?,?)",
    `help-${crypto.randomUUID()}`,
    body.patientId ?? null,
    body.idNumber ?? null,
    body.phone ?? null,
    body.note ?? "患者按下致電求助，需要職員協助預約",
  );
  return json({ ok: true, helpPhone: HELP_PHONE });
}

async function adminLogin(context: EventContext<Env, string, unknown>) {
  const body = await readJson<{ password: string }>(context.request);
  if (body.password !== "admin") return json({ error: "後台密碼不正確" }, 401);
  return json({ ok: true, session: ADMIN_SESSION });
}

async function adminBootstrap(context: EventContext<Env, string, unknown>) {
  const db = context.env.DB;
  const [therapists, doctors, unavailable, patients, smsLogs, helpRequests, capacities, dashboard] = await Promise.all([
    all(db, "SELECT * FROM therapists ORDER BY service_area,active DESC,name"),
    all(db, "SELECT * FROM doctors ORDER BY active DESC,code"),
    all(db, "SELECT u.*,t.name AS therapist_name FROM unavailable_blocks u LEFT JOIN therapists t ON t.id=u.therapist_id ORDER BY start_date DESC LIMIT 300"),
    all(db, "SELECT p.*,d.code AS doctor_code,d.name AS doctor_name FROM patients p LEFT JOIN doctors d ON d.id=p.doctor_id ORDER BY p.created_at DESC LIMIT 300"),
    all(db, "SELECT s.*,p.display_name FROM sms_logs s LEFT JOIN patients p ON p.id=s.patient_id ORDER BY s.created_at DESC LIMIT 200"),
    all(db, "SELECT * FROM help_requests ORDER BY created_at DESC LIMIT 100"),
    all(db, "SELECT * FROM slot_capacities ORDER BY service_area,subtype,weekday,time LIMIT 800"),
    buildDashboard(db),
  ]);

  return json({ therapists, doctors, unavailable, patients, smsLogs, helpRequests, capacities, dashboard, subtypes: VALID_SUBTYPES, helpPhone: HELP_PHONE });
}

async function upsertTherapist(context: EventContext<Env, string, unknown>) {
  const body = await readJson<Partial<Therapist>>(context.request);
  const serviceArea = normalizeServiceArea(body.service_area);
  if (!serviceArea || !String(body.name ?? "").trim()) return json({ error: "請填寫治療師名稱及大類" }, 400);
  const id = body.id || `${serviceArea.toLowerCase()}-${crypto.randomUUID()}`;
  await run(
    context.env.DB,
    "INSERT INTO therapists (id,name,service_area,code,gender,active) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,service_area=excluded.service_area,code=excluded.code,gender=excluded.gender,active=excluded.active",
    id,
    String(body.name).trim(),
    serviceArea,
    String(body.code || body.name).trim().slice(0, 8).toUpperCase(),
    normalizeGender(body.gender),
    body.active ?? 1,
  );
  return json({ ok: true, id });
}

async function upsertDoctor(context: EventContext<Env, string, unknown>) {
  const body = await readJson<any>(context.request);
  if (!String(body.code ?? "").trim() || !String(body.name ?? "").trim()) return json({ error: "請填寫醫生代號及名稱" }, 400);
  const id = body.id || `dr-${crypto.randomUUID()}`;
  await run(
    context.env.DB,
    "INSERT INTO doctors (id,code,name,quota,active) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,name=excluded.name,quota=excluded.quota,active=excluded.active",
    id,
    String(body.code).trim().toUpperCase(),
    String(body.name).trim(),
    Number(body.quota) || 30,
    body.active ?? 1,
  );
  return json({ ok: true, id });
}

async function upsertUnavailable(context: EventContext<Env, string, unknown>) {
  const body = await readJson<any>(context.request);
  if (!body.therapist_id || !body.start_date) return json({ error: "請選擇治療師及日期" }, 400);
  const id = body.id || `unav-${crypto.randomUUID()}`;
  const allDay = body.all_day ? 1 : 0;
  await run(
    context.env.DB,
    "INSERT INTO unavailable_blocks (id,therapist_id,start_date,end_date,start_time,end_time,all_day,reason) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET therapist_id=excluded.therapist_id,start_date=excluded.start_date,end_date=excluded.end_date,start_time=excluded.start_time,end_time=excluded.end_time,all_day=excluded.all_day,reason=excluded.reason",
    id,
    body.therapist_id,
    body.start_date,
    body.end_date || body.start_date,
    allDay ? null : body.start_time,
    allDay ? null : body.end_time,
    allDay,
    String(body.reason || "不可預約時段").trim(),
  );
  return json({ ok: true, id });
}

async function upsertPatient(context: EventContext<Env, string, unknown>) {
  const body = await readJson<any>(context.request);
  const serviceArea = normalizeServiceArea(body.service_area);
  const subtype = String(body.subtype ?? "");
  if (!serviceArea || !VALID_SUBTYPES[serviceArea].includes(subtype)) return json({ error: "治療分類不正確" }, 400);
  if (!body.id_number || !body.phone || !body.doctor_id) return json({ error: "身份證、電話及轉介醫生必填" }, 400);

  const id = body.id || `pat-${crypto.randomUUID()}`;
  const idNumber = String(body.id_number).trim();
  const phone = String(body.phone).trim();
  const duplicate = await first<Patient>(
    context.env.DB,
    "SELECT * FROM patients WHERE id_number=? AND phone=? AND id<>?",
    idNumber,
    phone,
    id,
  );
  if (duplicate) {
    return json({ error: `此身份證和電話已屬於患者 ${duplicate.patient_code}，不能重複新增。` }, 409);
  }

  const existing = body.id ? await first<Patient>(context.env.DB, "SELECT * FROM patients WHERE id=?", body.id) : null;
  const isBooked = existing?.status === "booked";
  const sessionCount = isBooked ? existing.session_count : clamp(Number(body.custom_session_count || body.session_count || 6), 1, 99);
  await run(
    context.env.DB,
    "INSERT INTO patients (id,patient_code,id_number,phone,display_name,doctor_id,service_area,subtype,gender_preference,session_count,status) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET patient_code=excluded.patient_code,id_number=excluded.id_number,phone=excluded.phone,display_name=excluded.display_name,doctor_id=excluded.doctor_id,service_area=excluded.service_area,subtype=excluded.subtype,gender_preference=excluded.gender_preference,session_count=excluded.session_count,status=excluded.status",
    id,
    isBooked ? existing.patient_code : String(body.patient_code || `P${Math.floor(Math.random() * 9000 + 1000)}`).trim(),
    idNumber,
    phone,
    String(body.display_name || "示範患者").trim(),
    body.doctor_id,
    isBooked ? existing.service_area : serviceArea,
    isBooked ? existing.subtype : subtype,
    isBooked ? existing.gender_preference : normalizeGenderPreference(body.gender_preference),
    sessionCount,
    isBooked ? existing.status : body.status || "draft",
  );
  return json({ ok: true, id });
}

async function activatePatients(context: EventContext<Env, string, unknown>) {
  const body = await readJson<{ patientIds: string[] }>(context.request);
  const patientIds = Array.isArray(body.patientIds) ? body.patientIds : [];
  if (!patientIds.length) return json({ error: "請先選擇要開通的患者" }, 400);

  const batchId = `batch-${crypto.randomUUID()}`;
  await run(context.env.DB, "INSERT INTO activation_batches (id,label,status,activated_at) VALUES (?,?, 'activated', CURRENT_TIMESTAMP)", batchId, `開通批次 ${todayKey()}`);
  for (const patientId of patientIds) {
    const patient = await first<Patient>(context.env.DB, "SELECT * FROM patients WHERE id=?", patientId);
    if (!patient) continue;
    await run(context.env.DB, "UPDATE patients SET status='active',batch_id=?,activated_at=CURRENT_TIMESTAMP WHERE id=?", batchId, patientId);
    await run(
      context.env.DB,
      "INSERT INTO sms_logs (id,patient_id,phone,message,status) VALUES (?,?,?,?, 'sent')",
      `sms-${crypto.randomUUID()}`,
      patientId,
      patient.phone,
      `【物理治療預約】${patient.display_name}，你的線上預約權限已開通，請到 https://mfr.09071247.xyz 登入選擇時間。如需協助請致電 ${HELP_PHONE}。`,
    );
  }
  return json({ ok: true, batchId });
}

async function upsertCapacity(context: EventContext<Env, string, unknown>) {
  const body = await readJson<any>(context.request);
  const serviceArea = normalizeServiceArea(body.service_area);
  const subtype = String(body.subtype ?? "");
  if (!serviceArea || !VALID_SUBTYPES[serviceArea].includes(subtype)) return json({ error: "容量分類不正確" }, 400);

  await run(
    context.env.DB,
    "DELETE FROM slot_capacities WHERE COALESCE(therapist_id,'')=COALESCE(?,'') AND service_area=? AND subtype=? AND weekday=? AND time=?",
    body.therapist_id || null,
    serviceArea,
    subtype,
    Number(body.weekday),
    body.time,
  );
  const id = `cap-${crypto.randomUUID()}`;
  await run(
    context.env.DB,
    "INSERT INTO slot_capacities (id,therapist_id,service_area,subtype,weekday,time,capacity,source,updated_at) VALUES (?,?,?,?,?,?,?,'manual',CURRENT_TIMESTAMP)",
    id,
    body.therapist_id || null,
    serviceArea,
    subtype,
    Number(body.weekday),
    body.time,
    clamp(Number(body.capacity) || 1, 0, 20),
  );
  return json({ ok: true, id });
}

async function adminReschedule(context: EventContext<Env, string, unknown>) {
  const body = await readJson<{ appointmentId: string; therapistId: string; date: string; time: string }>(context.request);
  const appointment = await first<any>(context.env.DB, "SELECT * FROM booking_events WHERE id=?", body.appointmentId);
  if (!appointment) return json({ error: "找不到該堂預約" }, 404);
  const patient = await first<Patient>(context.env.DB, "SELECT * FROM patients WHERE id=?", appointment.patient_id);
  if (!patient) return json({ error: "找不到患者" }, 404);

  const check = await validateSingleSlot(context.env.DB, patient, body.therapistId, body.date, body.time, appointment.id);
  if (!check.ok) return json({ error: check.error }, 409);
  await run(context.env.DB, "UPDATE booking_events SET therapist_id=?,date=?,time=? WHERE id=?", body.therapistId, body.date, body.time, body.appointmentId);
  return json({ ok: true });
}

async function adminRescheduleOptions(context: EventContext<Env, string, unknown>) {
  const url = new URL(context.request.url);
  const appointmentId = url.searchParams.get("appointmentId") ?? "";
  const therapistId = url.searchParams.get("therapistId") ?? "";
  const date = url.searchParams.get("date") ?? "";
  const appointment = await first<any>(context.env.DB, "SELECT * FROM booking_events WHERE id=?", appointmentId);
  if (!appointment) return json({ error: "找不到該堂預約" }, 404);
  const patient = await first<Patient>(context.env.DB, "SELECT * FROM patients WHERE id=?", appointment.patient_id);
  if (!patient) return json({ error: "找不到患者" }, 404);
  if (!therapistId || !date) return json({ options: [], availableTimes: [] });

  const rows = await all<any>(
    context.env.DB,
    "SELECT * FROM slot_capacities WHERE service_area=? AND subtype=? AND weekday=? ORDER BY time",
    patient.service_area,
    patient.subtype,
    weekdayNumber(date),
  );
  const times = [...new Set(rows.map((row) => String(row.time)))].sort();
  const options = [];
  for (const time of times) {
    const check = await validateSingleSlot(context.env.DB, patient, therapistId, date, time, appointment.id);
    options.push({ time, available: check.ok, reason: check.ok ? "" : check.error });
  }
  return json({ options, availableTimes: options.filter((item) => item.available).map((item) => item.time) });
}

async function adminCalendar(context: EventContext<Env, string, unknown>) {
  const url = new URL(context.request.url);
  const therapistId = url.searchParams.get("therapistId");
  const month = url.searchParams.get("month") ?? todayKey().slice(0, 7);
  const [monthStart, monthEnd] = monthBounds(month);
  const therapists = await all<Therapist>(
    context.env.DB,
    "SELECT * FROM therapists WHERE active=1 AND (? IS NULL OR id=?) ORDER BY service_area,name",
    therapistId,
    therapistId,
  );
  const bookings = await all(
    context.env.DB,
    "SELECT b.*,p.display_name,p.patient_code,p.id_number,p.phone,t.name AS therapist_name,t.code AS therapist_code FROM booking_events b LEFT JOIN patients p ON p.id=b.patient_id LEFT JOIN therapists t ON t.id=b.therapist_id WHERE (? IS NULL OR b.therapist_id=?) AND substr(b.date,1,7)=? ORDER BY b.date,b.time",
    therapistId,
    therapistId,
    month,
  );
  const unavailable = await all(
    context.env.DB,
    "SELECT u.*,t.name AS therapist_name,t.code AS therapist_code FROM unavailable_blocks u LEFT JOIN therapists t ON t.id=u.therapist_id WHERE (? IS NULL OR u.therapist_id=?) AND u.start_date<=? AND u.end_date>=? ORDER BY u.start_date,u.start_time",
    therapistId,
    therapistId,
    monthEnd,
    monthStart,
  );
  const capacities = await all<any>(context.env.DB, "SELECT * FROM slot_capacities ORDER BY service_area,subtype,weekday,time");
  const { dailyStats, monthSummary } = buildCalendarStats({ month, therapists, capacities, bookings, unavailable });
  return json({ bookings, unavailable, dailyStats, monthSummary });
}

async function deletePatientAccount(db: D1Database, patientId: string) {
  const patient = await first<Patient>(db, "SELECT * FROM patients WHERE id=?", patientId);
  if (!patient) return json({ error: "找不到患者" }, 404);
  await run(db, "DELETE FROM booking_events WHERE patient_id=?", patientId);
  await run(db, "DELETE FROM bookings WHERE patient_id=?", patientId);
  await run(db, "DELETE FROM sms_logs WHERE patient_id=?", patientId);
  await run(db, "DELETE FROM help_requests WHERE patient_id=? OR (id_number=? AND phone=?)", patientId, patient.id_number, patient.phone);
  await run(db, "DELETE FROM patients WHERE id=?", patientId);
  return json({ ok: true });
}

async function cancelPatientBooking(db: D1Database, patientId: string) {
  const patient = await first<Patient>(db, "SELECT * FROM patients WHERE id=?", patientId);
  if (!patient) return json({ error: "找不到患者" }, 404);
  await run(db, "DELETE FROM booking_events WHERE patient_id=?", patientId);
  await run(db, "DELETE FROM bookings WHERE patient_id=?", patientId);
  await run(db, "UPDATE patients SET status='active' WHERE id=?", patientId);
  return json({ ok: true });
}

async function seedWkJulyFullDemo(db: D1Database) {
  const therapist = await first<Therapist>(db, "SELECT * FROM therapists WHERE id='gym-03'");
  if (!therapist) return json({ error: "找不到 WK 治療師 gym-03" }, 404);
  const doctor = await first<any>(db, "SELECT id FROM doctors WHERE active=1 ORDER BY code LIMIT 1");
  const doctorId = doctor?.id ?? "dr-a";
  await run(
    db,
    "INSERT OR IGNORE INTO unavailable_blocks (id,therapist_id,start_date,end_date,start_time,end_time,all_day,reason) VALUES ('wk-july-leave-2026','gym-03','2026-07-08','2026-07-11',NULL,NULL,1,'WK 7月8日至7月11日年假')",
  );

  const [capacities, unavailable, bookedRows] = await Promise.all([
    all<any>(db, "SELECT * FROM slot_capacities WHERE service_area='GYM' ORDER BY weekday,time"),
    all<any>(db, "SELECT * FROM unavailable_blocks WHERE therapist_id='gym-03'"),
    all<any>(db, "SELECT date,time,COUNT(*) AS count FROM booking_events WHERE therapist_id='gym-03' AND substr(date,1,7)='2026-07' AND status='confirmed' GROUP BY date,time"),
  ]);
  const bookedMap = new Map(bookedRows.map((row) => [`${row.date}|${row.time}`, Number(row.count) || 0]));
  const statements: D1PreparedStatement[] = [];
  for (const date of monthDaysList("2026-07")) {
    const weekday = weekdayNumber(date);
    if (![2, 3, 4, 5].includes(weekday)) continue;
    const times = capacityTimesForService(capacities, "GYM", weekday);
    for (const time of times) {
      if (isUnavailable(unavailable, "gym-03", date, time)) continue;
      const capacity = maxSharedCapacity(capacities, "gym-03", "GYM", weekday, time);
      const booked = bookedMap.get(`${date}|${time}`) ?? 0;
      for (let index = booked + 1; index <= capacity; index += 1) {
        const stamp = `${date.replace(/-/g, "")}${time.replace(":", "")}${index}`;
        const patientId = `wk-demo-${stamp}`;
        const bookingId = `wk-book-${stamp}`;
        const appointmentId = `wk-appt-${stamp}`;
        const code = `WK-${date.slice(5).replace("-", "")}-${time.replace(":", "")}-${index}`;
        statements.push(db.prepare(
          "INSERT OR IGNORE INTO patients (id,patient_code,id_number,phone,display_name,doctor_id,service_area,subtype,gender_preference,session_count,status,activated_at) VALUES (?,?,?,?,?,?,?,?,?,1,'booked',CURRENT_TIMESTAMP)",
        ).bind(
          patientId,
          code,
          `WK${stamp}`,
          `8390${String(Number(stamp.slice(-6)) % 10000).padStart(4, "0")}`,
          `WK示範患者 ${code}`,
          doctorId,
          "GYM",
          "GYM-1",
          "any",
        ));
        statements.push(db.prepare("INSERT OR IGNORE INTO bookings (id,patient_id,status) VALUES (?,?, 'confirmed')").bind(bookingId, patientId));
        statements.push(db.prepare(
          "INSERT OR IGNORE INTO booking_events (id,booking_id,patient_id,therapist_id,date,time,service_area,subtype,session_no,status) VALUES (?,?,?,?,?,?,?,?,1,'confirmed')",
        ).bind(
          appointmentId,
          bookingId,
          patientId,
          "gym-03",
          date,
          time,
          "GYM",
          "GYM-1",
        ));
      }
    }
  }
  let createdPatients = 0;
  let createdSessions = 0;
  for (let index = 0; index < statements.length; index += 75) {
    const results = await db.batch(statements.slice(index, index + 75));
    for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
      const globalIndex = index + resultIndex;
      if (globalIndex % 3 === 0) createdPatients += results[resultIndex].meta.changes ?? 0;
      if (globalIndex % 3 === 2) createdSessions += results[resultIndex].meta.changes ?? 0;
    }
  }
  return json({ ok: true, createdPatients, createdSessions });
}

async function demoReset(db: D1Database) {
  await run(db, "DELETE FROM booking_events");
  await run(db, "DELETE FROM bookings");
  await run(db, "DELETE FROM sms_logs");
  await run(db, "DELETE FROM help_requests");
  await run(db, "DELETE FROM activation_batches");
  await run(db, "DELETE FROM patients WHERE id NOT IN ('pat-001','pat-002','pat-003','pat-004','pat-005')");
  await run(db, "UPDATE patients SET status=CASE WHEN id IN ('pat-001','pat-002') THEN 'active' WHEN id='pat-005' THEN 'pending' ELSE 'draft' END,rules_accepted_at=NULL,batch_id=NULL,activated_at=NULL");
  return json({ ok: true });
}

async function softDelete(db: D1Database, table: "therapists" | "doctors", id: string) {
  await run(db, `UPDATE ${table} SET active=0 WHERE id=?`, id);
  return json({ ok: true });
}

async function deleteRow(db: D1Database, table: "unavailable_blocks", id: string) {
  await run(db, `DELETE FROM ${table} WHERE id=?`, id);
  return json({ ok: true });
}

async function buildDashboard(db: D1Database) {
  const currentMonth = todayKey().slice(0, 7);
  const [monthStart, monthEnd] = monthBounds(currentMonth);
  const [statusCounts, doctorStats, therapistLoad, subtypeDemand, smsStats, incomplete, therapists, capacities, bookings, unavailable] = await Promise.all([
    all(db, "SELECT status,COUNT(*) AS count FROM patients GROUP BY status"),
    all(db, "SELECT d.id,d.code,d.name,d.quota,COUNT(p.id) AS referred,(d.quota-COUNT(p.id)) AS remaining FROM doctors d LEFT JOIN patients p ON p.doctor_id=d.id GROUP BY d.id ORDER BY d.code"),
    all(db, "SELECT t.id,t.name,t.service_area,COUNT(b.id) AS booked_sessions FROM therapists t LEFT JOIN booking_events b ON b.therapist_id=t.id AND b.status='confirmed' GROUP BY t.id ORDER BY booked_sessions DESC"),
    all(db, "SELECT service_area,subtype,COUNT(*) AS count FROM patients GROUP BY service_area,subtype ORDER BY service_area,subtype"),
    all(db, "SELECT status,COUNT(*) AS count FROM sms_logs GROUP BY status"),
    all(db, "SELECT id,display_name,patient_code,session_count,status FROM patients WHERE status='active' ORDER BY activated_at DESC"),
    all<Therapist>(db, "SELECT * FROM therapists WHERE active=1 ORDER BY service_area,name"),
    all<any>(db, "SELECT * FROM slot_capacities ORDER BY service_area,subtype,weekday,time"),
    all<any>(db, "SELECT * FROM booking_events WHERE status='confirmed' AND substr(date,1,7)=?", currentMonth),
    all<any>(db, "SELECT * FROM unavailable_blocks WHERE start_date<=? AND end_date>=?", monthEnd, monthStart),
  ]);
  const monthStats = buildCalendarStats({ month: currentMonth, therapists, capacities, bookings, unavailable }).monthSummary;
  return { statusCounts, doctorStats, therapistLoad, subtypeDemand, smsStats, incomplete, currentMonth, monthStats };
}

async function therapistsForPatient(db: D1Database, patient: Patient) {
  return all<Therapist>(
    db,
    "SELECT * FROM therapists WHERE active=1 AND service_area=? AND (?='any' OR gender=? OR gender='unknown') ORDER BY name",
    patient.service_area,
    patient.gender_preference,
    patient.gender_preference,
  );
}

async function getBookingForPatient(db: D1Database, patientId: string) {
  const booking = await first<any>(db, "SELECT * FROM bookings WHERE patient_id=?", patientId);
  if (!booking) return null;
  const appointments = await all(
    db,
    "SELECT b.*,t.name AS therapist_name FROM booking_events b LEFT JOIN therapists t ON t.id=b.therapist_id WHERE b.patient_id=? ORDER BY session_no",
    patientId,
  );
  return { ...booking, appointments };
}

function publicPatient(patient: Patient) {
  return {
    id: patient.id,
    patient_code: patient.patient_code,
    display_name: patient.display_name,
    doctor_id: patient.doctor_id,
    service_area: patient.service_area,
    subtype: patient.subtype,
    gender_preference: patient.gender_preference,
    session_count: patient.session_count,
    status: patient.status,
    rules_accepted_at: patient.rules_accepted_at,
    activated_at: patient.activated_at,
    idNumberTail: patient.id_number,
    phoneTail: patient.phone,
  };
}

async function validateAppointments(db: D1Database, patient: Patient, appointments: AppointmentInput[]) {
  if (!Array.isArray(appointments) || appointments.length !== Number(patient.session_count)) {
    return { ok: false, error: `需要選滿 ${patient.session_count} 堂才可確認` };
  }

  const therapistId = appointments[0]?.therapistId;
  const time = appointments[0]?.time;
  if (!therapistId || !time) return { ok: false, error: "請先選擇治療師和時間" };
  if (appointments.some((item) => item.therapistId !== therapistId || item.time !== time)) {
    return { ok: false, error: "全部堂數必須使用同一治療師及同一時間" };
  }

  const weekly = new Map<string, string[]>();
  for (const item of appointments) {
    if (![2, 3, 4, 5].includes(weekdayNumber(item.date))) return { ok: false, error: "只可選擇星期二至星期五" };
    const week = weekKey(item.date);
    weekly.set(week, [...(weekly.get(week) ?? []), item.date]);
  }
  for (const days of weekly.values()) {
    const uniqueDays = [...new Set(days)].sort();
    if (uniqueDays.length > 2) return { ok: false, error: "每星期最多只能預約兩堂" };
    if (uniqueDays.length === 2 && Math.abs(daysBetween(uniqueDays[0], uniqueDays[1])) < 2) {
      return { ok: false, error: "同一星期兩堂之間最少要相隔一日" };
    }
  }

  const conflicts = [];
  for (const item of appointments) {
    const check = await validateSingleSlot(db, patient, item.therapistId, item.date, item.time, undefined, patient.id);
    if (!check.ok) conflicts.push({ ...item, reason: check.error });
  }
  if (conflicts.length) return { ok: false, error: "部分時段剛被預約或封鎖，請改選標示不可用的格子", conflicts };
  return { ok: true };
}

async function validateSingleSlot(db: D1Database, patient: Patient, therapistId: string, date: string, time: string, ignoreAppointmentId?: string, ignorePatientId?: string) {
  const therapist = await first<Therapist>(db, "SELECT * FROM therapists WHERE id=? AND active=1", therapistId);
  if (!therapist || therapist.service_area !== patient.service_area) return { ok: false, error: "治療師不符合患者分類" };
  if (patient.gender_preference !== "any" && therapist.gender !== patient.gender_preference && therapist.gender !== "unknown") {
    return { ok: false, error: "治療師不符合性別限制" };
  }
  if (![2, 3, 4, 5].includes(weekdayNumber(date))) return { ok: false, error: "只可選擇星期二至星期五" };

  const unavailable = await all<any>(db, "SELECT * FROM unavailable_blocks WHERE therapist_id=?", therapistId);
  if (isUnavailable(unavailable, therapistId, date, time)) return { ok: false, error: "不可預約時段" };

  const capacities = await all<any>(
    db,
    "SELECT * FROM slot_capacities WHERE service_area=? AND subtype=? AND weekday=? AND time=?",
    patient.service_area,
    patient.subtype,
    weekdayNumber(date),
    time,
  );
  const capacity = capacityFor(buildCapacityMap(capacities), therapistId, weekdayNumber(date), time);
  if (capacity <= 0) return { ok: false, error: "該時段未開放" };

  const booked = await first<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM booking_events WHERE therapist_id=? AND date=? AND time=? AND status='confirmed' AND id<>COALESCE(?, '') AND patient_id<>COALESCE(?, '')",
    therapistId,
    date,
    time,
    ignoreAppointmentId ?? "",
    ignorePatientId ?? "",
  );
  if ((Number(booked?.count) || 0) >= capacity) return { ok: false, error: "名額已滿" };
  return { ok: true };
}

function buildCalendarStats({
  month,
  therapists,
  capacities,
  bookings,
  unavailable,
}: {
  month: string;
  therapists: Therapist[];
  capacities: any[];
  bookings: any[];
  unavailable: any[];
}) {
  const bookedMap = new Map<string, number>();
  for (const booking of bookings) {
    const key = `${booking.therapist_id}|${booking.date}|${booking.time}`;
    bookedMap.set(key, (bookedMap.get(key) ?? 0) + 1);
  }

  const dailyStats = monthDaysList(month).map((date) => {
    const weekday = weekdayNumber(date);
    const isWeekend = [6, 7].includes(weekday);
    const isReserved = weekday === 1;
    const dayBlocks = unavailable.filter((block) => date >= block.start_date && date <= block.end_date);
    const unavailableReasons = dayBlocks.map((block) => ({
      therapistId: block.therapist_id,
      therapistName: block.therapist_name,
      reason: block.reason,
      time: Number(block.all_day) ? "全日" : `${block.start_time}-${block.end_time}`,
    }));

    let capacityTotal = 0;
    let booked = 0;
    let blockedCapacity = 0;
    const vacancyTimes: Array<{ therapistId: string; therapistName: string; time: string; remaining: number; capacity: number; booked: number }> = [];

    if (!isWeekend && !isReserved) {
      for (const therapist of therapists) {
        const times = capacityTimesForService(capacities, therapist.service_area, weekday);
        for (const time of times) {
          const capacity = maxSharedCapacity(capacities, therapist.id, therapist.service_area, weekday, time);
          if (capacity <= 0) continue;
          const slotBooked = bookedMap.get(`${therapist.id}|${date}|${time}`) ?? 0;
          if (isUnavailable(unavailable, therapist.id, date, time)) {
            blockedCapacity += capacity;
            continue;
          }
          const remaining = Math.max(capacity - slotBooked, 0);
          capacityTotal += capacity;
          booked += slotBooked;
          if (remaining > 0) {
            vacancyTimes.push({ therapistId: therapist.id, therapistName: therapist.name, time, remaining, capacity, booked: slotBooked });
          }
        }
      }
    }

    const remaining = Math.max(capacityTotal - booked, 0);
    const status = isWeekend
      ? "weekend"
      : isReserved
        ? "reserved"
        : capacityTotal === 0 && unavailableReasons.length
        ? "unavailable"
        : capacityTotal === 0
          ? "no-capacity"
          : remaining === 0
            ? "full"
            : booked > 0
              ? "partial"
              : "available";

    return {
      date,
      weekday,
      isWeekend,
      isReserved,
      capacityTotal,
      booked,
      remaining,
      blockedCapacity,
      unavailableReasons,
      vacancyTimes,
      status,
    };
  });

  const monthSummary = dailyStats.reduce(
    (summary, day) => ({
      capacityTotal: summary.capacityTotal + day.capacityTotal,
      booked: summary.booked + day.booked,
      remaining: summary.remaining + day.remaining,
      blockedCapacity: summary.blockedCapacity + day.blockedCapacity,
      unavailableDays: summary.unavailableDays + (day.unavailableReasons.length ? 1 : 0),
      fullDays: summary.fullDays + (day.status === "full" ? 1 : 0),
      weekendDays: summary.weekendDays + (day.isWeekend ? 1 : 0),
      reservedDays: summary.reservedDays + (day.isReserved ? 1 : 0),
    }),
    { capacityTotal: 0, booked: 0, remaining: 0, blockedCapacity: 0, unavailableDays: 0, fullDays: 0, weekendDays: 0, reservedDays: 0 },
  );

  return { dailyStats, monthSummary };
}

function capacityTimesForService(rows: any[], serviceArea: ServiceArea, weekday: number) {
  return [...new Set(rows.filter((row) => row.service_area === serviceArea && Number(row.weekday) === weekday).map((row) => String(row.time)))].sort();
}

function maxSharedCapacity(rows: any[], therapistId: string, serviceArea: ServiceArea, weekday: number, time: string) {
  const subtypes = VALID_SUBTYPES[serviceArea];
  let max = 0;
  for (const subtype of subtypes) {
    const subtypeRows = rows.filter((row) => row.service_area === serviceArea && row.subtype === subtype && Number(row.weekday) === weekday && row.time === time);
    max = Math.max(max, capacityFor(buildCapacityMap(subtypeRows), therapistId, weekday, time));
  }
  return max;
}

function buildCapacityMap(rows: any[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(capKey(row.therapist_id || "", Number(row.weekday), String(row.time)), Number(row.capacity) || 0);
  }
  return map;
}

function capKey(therapistId: string, weekday: number, time: string) {
  return `${therapistId}|${weekday}|${time}`;
}

function capacityFor(map: Map<string, number>, therapistId: string, weekday: number, time: string) {
  return map.get(capKey(therapistId, weekday, time)) ?? map.get(capKey("", weekday, time)) ?? 0;
}

function isUnavailable(blocks: any[], therapistId: string, date: string, time: string) {
  return blocks.some((block) => {
    if (block.therapist_id !== therapistId) return false;
    if (date < block.start_date || date > block.end_date) return false;
    if (Number(block.all_day)) return true;
    return time >= block.start_time && time < block.end_time;
  });
}

function aliasMap(therapists: Therapist[], seed: string) {
  const sorted = [...therapists].sort((a, b) => hash(`${seed}-${a.id}`) - hash(`${seed}-${b.id}`));
  return new Map(sorted.map((therapist, index) => [therapist.id, `物理治療師${index + 1}`]));
}

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, monthNumber, 0));
  return [start, endDate.toISOString().slice(0, 10)] as const;
}

function monthDaysList(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: total }, (_, index) => `${year}-${String(monthNumber).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`);
}

function nextBookableDates(start: string, weeks: number) {
  const dates: string[] = [];
  const base = new Date(`${start}T00:00:00Z`);
  for (let index = 0; index < weeks * 7; index += 1) {
    const current = new Date(base);
    current.setUTCDate(base.getUTCDate() + index);
    const key = current.toISOString().slice(0, 10);
    if ([2, 3, 4, 5].includes(weekdayNumber(key))) dates.push(key);
  }
  return dates;
}

function weekdayNumber(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function weekKey(date: string) {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - weekdayNumber(date) + 1);
  return base.toISOString().slice(0, 10);
}

function daysBetween(left: string, right: string) {
  const leftTime = new Date(`${left}T00:00:00Z`).getTime();
  const rightTime = new Date(`${right}T00:00:00Z`).getTime();
  return Math.round((rightTime - leftTime) / 86_400_000);
}

function normalizeServiceArea(value: unknown): ServiceArea | null {
  return value === "ELE" || value === "GYM" ? value : null;
}

function normalizeGender(value: unknown): Gender {
  return value === "male" || value === "female" || value === "unknown" ? value : "unknown";
}

function normalizeGenderPreference(value: unknown): GenderPreference {
  return value === "male" || value === "female" || value === "any" ? value : "any";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
