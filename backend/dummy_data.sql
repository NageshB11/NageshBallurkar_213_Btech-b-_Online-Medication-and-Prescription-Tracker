USE med_system;

-- Appointments
INSERT INTO appointments (appointment_date, doctor_id, patient_id, notes, status) VALUES 
(DATE_SUB(NOW(), INTERVAL 5 DAY), 2, 3, 'Regular checkup for hypertension', 'COMPLETED'),
(DATE_ADD(NOW(), INTERVAL 2 DAY), 2, 4, 'Follow-up for diabetes management', 'APPROVED'),
(DATE_SUB(NOW(), INTERVAL 10 DAY), 5, 4, 'Consultation for minor headache and fever', 'COMPLETED'),
(DATE_ADD(NOW(), INTERVAL 5 DAY), 5, 3, 'Routine physical examination', 'REQUESTED');

-- Prescriptions
INSERT INTO prescriptions (created_at, is_dispensed, is_draft, status, doctor_id, patient_id, pharmacist_id, expiry_date, audit_version, version) VALUES 
(DATE_SUB(NOW(), INTERVAL 5 DAY), 1, 0, 'DISPENSED', 2, 3, 7, DATE_ADD(NOW(), INTERVAL 25 DAY), '1.0', 1);
SET @presc1 = LAST_INSERT_ID();

INSERT INTO prescription_items (dosage, dosage_timing, end_date, medicine_name, quantity, start_date, prescription_id, frequency, days_of_week, food_instruction, meal_slots) VALUES 
('50mg', 'MORNING', DATE_ADD(NOW(), INTERVAL 25 DAY), 'Metoprolol', 30, DATE_SUB(NOW(), INTERVAL 5 DAY), @presc1, 'DAILY', 'ALL', 'AFTER_MEAL', 'BREAKFAST');

INSERT INTO prescriptions (created_at, is_dispensed, is_draft, status, doctor_id, patient_id, pharmacist_id, expiry_date, audit_version, version) VALUES 
(DATE_SUB(NOW(), INTERVAL 10 DAY), 1, 0, 'DISPENSED', 5, 4, 7, DATE_ADD(NOW(), INTERVAL 20 DAY), '1.0', 1);
SET @presc2 = LAST_INSERT_ID();

INSERT INTO prescription_items (dosage, dosage_timing, end_date, medicine_name, quantity, start_date, prescription_id, frequency, days_of_week, food_instruction, meal_slots) VALUES 
('500mg', 'NIGHT', DATE_ADD(NOW(), INTERVAL 20 DAY), 'Paracetamol', 20, DATE_SUB(NOW(), INTERVAL 10 DAY), @presc2, 'DAILY', 'ALL', 'AFTER_MEAL', 'DINNER');

INSERT INTO prescriptions (created_at, is_dispensed, is_draft, status, doctor_id, patient_id, pharmacist_id, expiry_date, audit_version, version) VALUES 
(DATE_SUB(NOW(), INTERVAL 1 DAY), 0, 0, 'PROCEEDED_TO_PHARMACIST', 2, 4, 7, DATE_ADD(NOW(), INTERVAL 29 DAY), '1.0', 1);
SET @presc3 = LAST_INSERT_ID();

INSERT INTO prescription_items (dosage, dosage_timing, end_date, medicine_name, quantity, start_date, prescription_id, frequency, days_of_week, food_instruction, meal_slots) VALUES 
('10mg', 'MORNING', DATE_ADD(NOW(), INTERVAL 29 DAY), 'Lisinopril', 30, DATE_SUB(NOW(), INTERVAL 1 DAY), @presc3, 'DAILY', 'ALL', 'BEFORE_MEAL', 'BREAKFAST');

-- Medication Schedules
INSERT INTO medication_schedules (created_at, end_date, schedule_name, start_date, status, updated_at, version, patient_id, prescription_id) VALUES 
(NOW(), DATE_ADD(NOW(), INTERVAL 25 DAY), 'Hypertension Meds', DATE_SUB(NOW(), INTERVAL 5 DAY), 'ACTIVE', NOW(), 1, 3, @presc1);
SET @sched1 = LAST_INSERT_ID();

INSERT INTO schedule_items (dosage, duration_days, food_instruction, frequency, medicine_name, meal_slots, schedule_id) VALUES 
('50mg', 30, 'AFTER_MEAL', 'DAILY', 'Metoprolol', 'BREAKFAST', @sched1);
SET @sched_item1 = LAST_INSERT_ID();

INSERT INTO medication_schedules (created_at, end_date, schedule_name, start_date, status, updated_at, version, patient_id, prescription_id) VALUES 
(NOW(), DATE_ADD(NOW(), INTERVAL 20 DAY), 'Fever Meds', DATE_SUB(NOW(), INTERVAL 10 DAY), 'ACTIVE', NOW(), 1, 4, @presc2);
SET @sched2 = LAST_INSERT_ID();

INSERT INTO schedule_items (dosage, duration_days, food_instruction, frequency, medicine_name, meal_slots, schedule_id) VALUES 
('500mg', 30, 'AFTER_MEAL', 'DAILY', 'Paracetamol', 'DINNER', @sched2);
SET @sched_item2 = LAST_INSERT_ID();

-- Adherence Logs
INSERT INTO adherence_logs (log_date, patient_id, prescription_id) VALUES 
(DATE_SUB(NOW(), INTERVAL 4 DAY), 3, @presc1),
(DATE_SUB(NOW(), INTERVAL 3 DAY), 3, @presc1),
(DATE_SUB(NOW(), INTERVAL 2 DAY), 3, @presc1),
(DATE_SUB(NOW(), INTERVAL 1 DAY), 3, @presc1),
(DATE_SUB(NOW(), INTERVAL 9 DAY), 4, @presc2),
(DATE_SUB(NOW(), INTERVAL 8 DAY), 4, @presc2),
(DATE_SUB(NOW(), INTERVAL 7 DAY), 4, @presc2);

-- Dose Logs
INSERT INTO dose_logs (date, is_taken, meal, meal_slot, status, patient_id, prescription_id_obj, schedule_item_id, scheduled_time, actual_time, snooze_count) VALUES 
(DATE_SUB(NOW(), INTERVAL 4 DAY), 1, 'BREAKFAST', 'BREAKFAST', 'TAKEN', 3, @presc1, @sched_item1, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), 0),
(DATE_SUB(NOW(), INTERVAL 3 DAY), 1, 'BREAKFAST', 'BREAKFAST', 'TAKEN', 3, @presc1, @sched_item1, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 0),
(DATE_SUB(NOW(), INTERVAL 2 DAY), 1, 'BREAKFAST', 'BREAKFAST', 'TAKEN', 3, @presc1, @sched_item1, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 0),
(DATE_SUB(NOW(), INTERVAL 1 DAY), 1, 'BREAKFAST', 'BREAKFAST', 'TAKEN', 3, @presc1, @sched_item1, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 0),
(DATE_SUB(NOW(), INTERVAL 9 DAY), 1, 'DINNER', 'DINNER', 'TAKEN', 4, @presc2, @sched_item2, DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_SUB(NOW(), INTERVAL 9 DAY), 0),
(DATE_SUB(NOW(), INTERVAL 8 DAY), 1, 'DINNER', 'DINNER', 'TAKEN', 4, @presc2, @sched_item2, DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY), 0),
(DATE_SUB(NOW(), INTERVAL 7 DAY), 1, 'DINNER', 'DINNER', 'TAKEN', 4, @presc2, @sched_item2, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), 0);

-- Health Vitals
INSERT INTO health_vitals (patient_id, record_date, systolicbp, diastolicbp, heart_rate, oxygen_level, temperature) VALUES 
(3, DATE_SUB(NOW(), INTERVAL 5 DAY), 140, 90, 78, 98, 36.6),
(3, DATE_SUB(NOW(), INTERVAL 2 DAY), 130, 85, 75, 99, 36.5),
(4, DATE_SUB(NOW(), INTERVAL 10 DAY), 120, 80, 85, 98, 38.5),
(4, DATE_SUB(NOW(), INTERVAL 5 DAY), 118, 79, 72, 99, 37.0);
