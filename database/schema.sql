-- SQLite schema for Sleep Diary (variant 25).
-- The application currently runs in one browser profile and has no accounts/server.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sleep_entries (
    sleep_entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sleep_date TEXT NOT NULL
        CHECK (date(sleep_date) IS NOT NULL AND date(sleep_date) = sleep_date),
    bed_time TEXT NOT NULL
        CHECK (strftime('%H:%M', bed_time) IS NOT NULL AND strftime('%H:%M', bed_time) = bed_time),
    wake_time TEXT NOT NULL
        CHECK (strftime('%H:%M', wake_time) IS NOT NULL AND strftime('%H:%M', wake_time) = wake_time),
    sleep_quality INTEGER NOT NULL
        CHECK (sleep_quality BETWEEN 1 AND 5),
    notes TEXT
        CHECK (notes IS NULL OR length(notes) <= 500),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (bed_time <> wake_time)
);

-- One singleton row stores application-wide preferences.
-- Store target duration as integer minutes to avoid floating-point precision issues.
CREATE TABLE IF NOT EXISTS app_settings (
    settings_id INTEGER PRIMARY KEY CHECK (settings_id = 1),
    target_sleep_minutes INTEGER NOT NULL DEFAULT 480
        CHECK (
            target_sleep_minutes BETWEEN 60 AND 960
            AND target_sleep_minutes % 30 = 0
        ),
    reminder_enabled INTEGER NOT NULL DEFAULT 0
        CHECK (reminder_enabled IN (0, 1)),
    reminder_time TEXT NOT NULL DEFAULT '22:30'
        CHECK (strftime('%H:%M', reminder_time) IS NOT NULL
            AND strftime('%H:%M', reminder_time) = reminder_time),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sleep_entries_sleep_date
    ON sleep_entries (sleep_date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_entries_date_quality
    ON sleep_entries (sleep_date, sleep_quality);

INSERT OR IGNORE INTO app_settings (settings_id) VALUES (1);
