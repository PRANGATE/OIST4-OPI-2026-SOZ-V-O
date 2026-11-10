"use strict";

const STORAGE_KEY = "sleep-diary.entries.v1";
let entries = [];
let editingId = null;

const $ = (id) => document.getElementById(id);
const form = $("sleepForm");
const message = $("formMessage");

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = type ? `message ${type}` : "message";
}

function calculateDuration(bedTime, wakeTime) {
  const [bedHours, bedMinutes] = bedTime.split(":").map(Number);
  const [wakeHours, wakeMinutes] = wakeTime.split(":").map(Number);
  const start = bedHours * 60 + bedMinutes;
  let end = wakeHours * 60 + wakeMinutes;
  if (end === start) return 0;
  if (end < start) end += 24 * 60;
  return end - start;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} ч ${String(rest).padStart(2, "0")} мин`;
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    entries = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    entries = [];
    setMessage("Не удалось прочитать сохранённые записи. Новые записи можно создать заново.", "error");
  }
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch (error) {
    setMessage("Не удалось сохранить данные в браузере. Проверьте доступное место и настройки хранилища.", "error");
    return false;
  }
}

function resetForm() {
  form.reset();
  $("sleepDate").value = new Date().toISOString().slice(0, 10);
  $("quality").value = "3";
  editingId = null;
  $("cancelEdit").hidden = true;
  form.querySelector('button[type="submit"]').textContent = "Сохранить запись";
}

function renderEntries() {
  const container = $("entries");
  container.replaceChildren();

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Записей пока нет. Добавьте первую ночь сна.";
    container.append(empty);
    return;
  }

  [...entries].sort((a, b) => b.date.localeCompare(a.date)).forEach((entry) => {
    const card = document.createElement("article");
    card.className = "entry-card";

    const details = document.createElement("div");
    details.className = "entry-details";
    const title = document.createElement("h3");
    title.textContent = new Date(`${entry.date}T12:00:00`).toLocaleDateString("ru-RU", {
      day: "numeric", month: "long", year: "numeric"
    });
    const time = document.createElement("p");
    time.textContent = `${entry.bedTime} — ${entry.wakeTime} · ${formatDuration(entry.duration)}`;
    const quality = document.createElement("p");
    quality.className = "entry-quality";
    quality.textContent = `Качество: ${entry.quality}/5`;
    details.append(title, time, quality);
    if (entry.notes) {
      const note = document.createElement("p");
      note.className = "entry-note";
      note.textContent = entry.notes;
      details.append(note);
    }

    const actions = document.createElement("div");
    actions.className = "entry-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button secondary";
    edit.textContent = "Изменить";
    edit.addEventListener("click", () => startEditing(entry.id));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button danger";
    remove.textContent = "Удалить";
    remove.addEventListener("click", () => removeEntry(entry.id));
    actions.append(edit, remove);
    card.append(details, actions);
    container.append(card);
  });
}

function startEditing(id) {
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;
  editingId = id;
  $("sleepDate").value = entry.date;
  $("bedTime").value = entry.bedTime;
  $("wakeTime").value = entry.wakeTime;
  $("quality").value = String(entry.quality);
  $("notes").value = entry.notes || "";
  $("cancelEdit").hidden = false;
  form.querySelector('button[type="submit"]').textContent = "Сохранить изменения";
  $("sleepDate").focus();
  setMessage("Режим редактирования записи.");
}

function removeEntry(id) {
  if (!window.confirm("Удалить эту запись о сне?")) return;
  const previous = entries;
  entries = entries.filter((entry) => entry.id !== id);
  if (!saveEntries()) {
    entries = previous;
    return;
  }
  renderEntries();
  renderStatistics();
  renderGoalProgress();
  setMessage("Запись удалена.", "success");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const date = $("sleepDate").value;
  const bedTime = $("bedTime").value;
  const wakeTime = $("wakeTime").value;
  const quality = Number($("quality").value);
  const notes = $("notes").value.trim();

  if (!date || !bedTime || !wakeTime) {
    setMessage("Заполните дату, время отхода ко сну и пробуждения.", "error");
    return;
  }
  if (!Number.isInteger(quality) || quality < 1 || quality > 5) {
    setMessage("Оценка качества сна должна быть от 1 до 5.", "error");
    return;
  }
  const duration = calculateDuration(bedTime, wakeTime);
  if (duration === 0) {
    setMessage("Время пробуждения не должно совпадать со временем отхода ко сну.", "error");
    return;
  }

  const record = {
    id: editingId || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    date, bedTime, wakeTime, quality, notes, duration
  };
  const wasEditing = Boolean(editingId);
  const previous = entries;
  if (editingId) {
    entries = entries.map((entry) => entry.id === editingId ? record : entry);
  } else {
    entries = [...entries, record];
  }
  if (!saveEntries()) {
    entries = previous;
    return;
  }
  renderEntries();
  renderStatistics();
  renderGoalProgress();
  resetForm();
  setMessage(wasEditing ? "Изменения сохранены." : "Запись о сне добавлена.", "success");
});

$("cancelEdit").addEventListener("click", () => {
  resetForm();
  setMessage("Редактирование отменено.");
});



const GOAL_KEY = "sleep-diary.goal-hours.v1";
let goalHours = 8;

function loadGoal() {
  try {
    const stored = Number(localStorage.getItem(GOAL_KEY));
    if (Number.isFinite(stored) && stored >= 1 && stored <= 16) goalHours = stored;
  } catch (error) {
    setMessage("Не удалось прочитать сохранённую цель сна.", "error");
  }
  $("goalHours").value = String(goalHours);
}

function renderGoalProgress() {
  const targetMinutes = goalHours * 60;
  const latest = [...entries].sort((a, b) => b.date.localeCompare(a.date))[0];
  const container = $("goalProgress");
  container.replaceChildren();
  const label = document.createElement("p");
  label.textContent = latest
    ? `Последняя запись: ${formatDuration(latest.duration)} из ${goalHours} ч`
    : `Цель установлена: ${goalHours} ч. Добавьте запись, чтобы увидеть прогресс.`;
  container.append(label);
  if (!latest) return;
  const percentage = Math.min(100, Math.round(latest.duration / targetMinutes * 100));
  const track = document.createElement("div");
  track.className = "progress-track";
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-label", "Достижение цели сна по последней записи");
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", "100");
  track.setAttribute("aria-valuenow", String(percentage));
  const fill = document.createElement("div");
  fill.className = "progress-fill";
  fill.style.width = `${percentage}%`;
  track.append(fill);
  const detail = document.createElement("small");
  detail.textContent = percentage >= 100
    ? "Цель достигнута или превышена."
    : `Выполнено ${percentage}%. До цели осталось ${formatDuration(targetMinutes - latest.duration)}.`;
  container.append(track, detail);
}

$("goalForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = Number($("goalHours").value);
  if (!Number.isFinite(value) || value < 1 || value > 16 || value * 2 !== Math.round(value * 2)) {
    setMessage("Цель должна быть от 1 до 16 часов с шагом 0,5 часа.", "error");
    return;
  }
  try {
    localStorage.setItem(GOAL_KEY, String(value));
  } catch (error) {
    setMessage("Не удалось сохранить цель в браузере.", "error");
    return;
  }
  goalHours = value;
  renderGoalProgress();
  setMessage("Цель сна сохранена.", "success");
});

function renderStatistics() {
  const days = Number($("period").value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  const filtered = entries.filter((entry) => {
    const date = new Date(`${entry.date}T00:00:00`);
    return date >= start && date <= today;
  });
  const totalMinutes = filtered.reduce((sum, entry) => sum + entry.duration, 0);
  const averageMinutes = filtered.length ? Math.round(totalMinutes / filtered.length) : 0;
  const averageQuality = filtered.length
    ? (filtered.reduce((sum, entry) => sum + entry.quality, 0) / filtered.length).toFixed(1)
    : "—";

  const stats = $("stats");
  stats.replaceChildren();
  [
    ["Средняя длительность", filtered.length ? formatDuration(averageMinutes) : "Нет данных"],
    ["Среднее качество", filtered.length ? `${averageQuality} / 5` : "Нет данных"],
    ["Количество записей", String(filtered.length)]
  ].forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "stat-card";
    const caption = document.createElement("span");
    caption.textContent = label;
    const result = document.createElement("strong");
    result.textContent = value;
    card.append(caption, result);
    stats.append(card);
  });

  const chart = $("chart");
  chart.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "За выбранный период записей нет. Добавьте записи, чтобы увидеть график.";
    chart.append(empty);
    return;
  }
  const heading = document.createElement("h3");
  heading.textContent = "Продолжительность сна по дням";
  chart.append(heading);
  const bars = document.createElement("div");
  bars.className = "chart-bars";
  filtered.sort((a, b) => a.date.localeCompare(b.date)).forEach((entry) => {
    const item = document.createElement("div");
    item.className = "chart-item";
    const value = document.createElement("small");
    value.textContent = `${(entry.duration / 60).toFixed(1)} ч`;
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.style.height = `${Math.max(8, Math.min(100, entry.duration / 960 * 100))}%`;
    bar.title = `${entry.date}: ${formatDuration(entry.duration)}`;
    const label = document.createElement("span");
    label.textContent = new Date(`${entry.date}T12:00:00`).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    item.append(value, bar, label);
    bars.append(item);
  });
  chart.append(bars);
}

$("period").addEventListener("change", renderStatistics);


function exportCsv() {
  if (!entries.length) {
    setMessage("Нет записей для экспорта.", "error");
    return;
  }
  const columns = ["Дата", "Время отхода ко сну", "Время пробуждения", "Продолжительность (мин)", "Качество (1–5)", "Заметки"];
  const rows = entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => [entry.date, entry.bedTime, entry.wakeTime, entry.duration, entry.quality, entry.notes || ""]);
  const escapeCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [columns, ...rows].map((row) => row.map(escapeCell).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sleep_diary.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setMessage("Файл sleep_diary.csv подготовлен для скачивания.", "success");
}

$("exportCsv").addEventListener("click", exportCsv);

loadEntries();
loadGoal();
resetForm();
renderEntries();
renderStatistics();
renderGoalProgress();
