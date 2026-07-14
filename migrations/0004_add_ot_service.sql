INSERT OR IGNORE INTO therapists (id,name,service_area,code,gender,active) VALUES
  ('ot-01','OT治療師(1)','OT','OT1','unknown',1),
  ('ot-02','OT治療師(2)','OT','OT2','unknown',1),
  ('ot-03','OT治療師(3)','OT','OT3','unknown',1),
  ('ot-04','OT治療師(4)','OT','OT4','unknown',1),
  ('ot-05','OT治療師(5)','OT','OT5','unknown',1),
  ('ot-06','OT治療師(6)','OT','OT6','unknown',1),
  ('ot-07','OT治療師(7)','OT','OT7','unknown',1);

-- OT uses the standard half-hour GYM template, with one fixed subtype: OT.
INSERT OR IGNORE INTO slot_capacities (id,therapist_id,service_area,subtype,weekday,time,capacity,source)
SELECT
  'ot-' || id,
  therapist_id,
  'OT',
  'OT',
  weekday,
  time,
  capacity,
  'ot-default'
FROM slot_capacities
WHERE service_area='GYM' AND subtype='GYM-1';

-- Monday special-course slots use a one-hour interval and default capacity of one.
INSERT OR IGNORE INTO slot_capacities (id,therapist_id,service_area,subtype,weekday,time,capacity,source)
SELECT
  'ot-' || id,
  therapist_id,
  'OT',
  'OT',
  weekday,
  time,
  capacity,
  'monday-default'
FROM slot_capacities
WHERE service_area='GYM' AND subtype='GYM-1' AND weekday=1;
