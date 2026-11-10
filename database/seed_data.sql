-- Demonstration data only. These records are fictional.
-- Run schema.sql before this script.
PRAGMA foreign_keys = ON;

INSERT INTO sleep_entries
    (sleep_date, bed_time, wake_time, sleep_quality, notes)
VALUES
    ('2026-11-01', '23:10', '07:00', 4, 'Пример: спокойная ночь'),
    ('2026-11-02', '00:05', '06:45', 3, 'Пример: поздно лёг спать'),
    ('2026-11-03', '22:40', '06:50', 5, 'Пример: хорошо выспался'),
    ('2026-11-04', '23:30', '06:15', 2, 'Пример: часто просыпался'),
    ('2026-11-05', '22:55', '07:05', 4, 'Пример: обычный сон');

UPDATE app_settings
SET target_sleep_minutes = 480,
    reminder_enabled = 1,
    reminder_time = '22:30',
    updated_at = datetime('now')
WHERE settings_id = 1;
