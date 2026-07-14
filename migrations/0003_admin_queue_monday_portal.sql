ALTER TABLE patients ADD COLUMN queue_priority TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE patients ADD COLUMN notification_due_date TEXT;
ALTER TABLE patients ADD COLUMN original_wait_weeks INTEGER NOT NULL DEFAULT 4;
ALTER TABLE patients ADD COLUMN notification_deferral_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE patients ADD COLUMN notification_deferral_reason TEXT;
ALTER TABLE patients ADD COLUMN monday_only INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS portal_settings (
  id TEXT PRIMARY KEY,
  manual_state TEXT NOT NULL DEFAULT 'auto',
  manual_until TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO portal_settings (id) VALUES ('default');

CREATE TABLE IF NOT EXISTS public_holidays (
  date TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transfer_batches (
  id TEXT PRIMARY KEY,
  source_therapist_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  unavailable_block_id TEXT,
  reason TEXT NOT NULL,
  transferred_count INTEGER NOT NULL DEFAULT 0,
  unresolved_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transfer_items (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  booking_event_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  source_therapist_id TEXT NOT NULL,
  target_therapist_id TEXT,
  status TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_transfer_items_batch ON transfer_items(batch_id);

INSERT OR IGNORE INTO slot_capacities (id,therapist_id,service_area,subtype,weekday,time,capacity,source)
SELECT
  'mon-' || service_area || '-' || REPLACE(REPLACE(subtype, '/', '-'), ' ', '') || '-' || REPLACE(time, ':', ''),
  NULL,
  service_area,
  subtype,
  1,
  time,
  1,
  'monday-default'
FROM slot_capacities
WHERE therapist_id IS NULL
  AND weekday = 2
  AND SUBSTR(time, 4, 2) = '30';

WITH ranked AS (
  SELECT
    id,
    service_area,
    ROW_NUMBER() OVER (PARTITION BY service_area ORDER BY created_at, id) AS row_no,
    COUNT(*) OVER (PARTITION BY service_area) AS total_no
  FROM patients
  WHERE status IN ('draft', 'pending')
)
UPDATE patients
SET
  queue_priority = CASE WHEN (SELECT row_no FROM ranked WHERE ranked.id = patients.id) <= ((SELECT total_no FROM ranked WHERE ranked.id = patients.id) + 4) / 5 THEN 'urgent' ELSE 'normal' END,
  original_wait_weeks = CASE WHEN (SELECT row_no FROM ranked WHERE ranked.id = patients.id) <= ((SELECT total_no FROM ranked WHERE ranked.id = patients.id) + 4) / 5 THEN 2 ELSE 4 END,
  notification_due_date = date(created_at, CASE WHEN (SELECT row_no FROM ranked WHERE ranked.id = patients.id) <= ((SELECT total_no FROM ranked WHERE ranked.id = patients.id) + 4) / 5 THEN '+14 days' ELSE '+28 days' END),
  notification_deferral_count = 0,
  notification_deferral_reason = NULL
WHERE id IN (SELECT id FROM ranked);
