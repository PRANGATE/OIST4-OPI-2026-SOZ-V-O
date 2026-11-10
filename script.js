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
  resetForm();
  setMessage(wasEditing ? "Изменения сохранены." : "Запись о сне добавлена.", "success");
});

$("cancelEdit").addEventListener("click", () => {
  resetForm();
  setMessage("Редактирование отменено.");
});

loadEntries();
resetForm();
renderEntries();
