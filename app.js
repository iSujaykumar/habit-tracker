/* =====================================================
   HABIT TRACKER — CLEAN JS (TIMEZONE SAFE)
===================================================== */

console.log("Habit Tracker JS - Stable Build");

async function loadData() {
  // Try IndexedDB first
  const idbHabits = await idbGet("habits", "list");
  const idbState = await idbGet("state", "tracker");

  if (idbHabits && idbState) {
    habits = idbHabits;
    store = idbState;
    return;
  }

  // MIGRATION FROM localStorage (ONE TIME)
  const lsHabits = JSON.parse(localStorage.getItem("habits")) || [];
  const lsState = JSON.parse(localStorage.getItem("tracker")) || {};

  habits = lsHabits.length
    ? lsHabits
    : [
        { id: crypto.randomUUID(), name: "Drink water" },
        { id: crypto.randomUUID(), name: "Exercise 30 min" },
        { id: crypto.randomUUID(), name: "Healthy breakfast" },
        { id: crypto.randomUUID(), name: "Take breaks" },
        { id: crypto.randomUUID(), name: "Read 20 min" },
        { id: crypto.randomUUID(), name: "Meditation" },
        { id: crypto.randomUUID(), name: "Skincare" },
        { id: crypto.randomUUID(), name: "Journal" },
      ];

  store = lsState;

  await idbSet("habits", "list", habits);
  await idbSet("state", "tracker", store);
}

/* =====================================================
   STATE
===================================================== */

// Load habits or defaults
let habits = [];

// Tracker data
let store = {};
// Current date (LOCAL, midnight-safe)
let currentDate = new Date();
currentDate.setHours(0, 0, 0, 0);

/* =====================================================
   DATE HELPERS (NO UTC — FIXES FRIDAY/SATURDAY BUG)
===================================================== */

function getDateKey(date = currentDate) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function moveDateBy(days) {
  currentDate.setDate(currentDate.getDate() + days);
  loadDay();
}

// Monday as week start
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* =====================================================
   STORAGE
===================================================== */

function saveStore() {
  idbSet("state", "tracker", store);
}

function saveHabits() {
  idbSet("habits", "list", habits);
}

function ensureDay(key) {
  if (!store[key]) {
    store[key] = { habits: {}, mood: null, notes: "" };
  }
  return store[key];
}

/* =====================================================
   DOM REFERENCES
===================================================== */

const els = {
  monthFlip: document.getElementById("monthFlip"),
  dateFlip: document.getElementById("dateFlip"),

  dateRow: document.getElementById("dateRow"),
  habitRows: document.getElementById("habitRows"),

  progressFill: document.getElementById("progressFill"),
  streakCount: document.getElementById("streakCount"),

  trackerView: document.getElementById("trackerView"),
  weeklyView: document.getElementById("weeklyView"),
  monthlyAnalytics: document.getElementById("monthlyAnalytics"),

  weeklyMoodWave: document.getElementById("weeklyMoodWave"),
  weeklyBars: document.getElementById("weeklyBars"),
  weekRange: document.getElementById("weekRange"),

  analyticsMonth: document.getElementById("analyticsMonth"),
  monthCompletion: document.getElementById("monthCompletion"),
  monthCompletionText: document.getElementById("monthCompletionText"),
  habitAnalytics: document.getElementById("habitAnalytics"),
  weeklyAnalytics: document.getElementById("weeklyAnalytics"),

  prevDay: document.getElementById("prevDay"),
  nextDay: document.getElementById("nextDay"),
  openWeekly: document.getElementById("openWeekly"),
  openMonthly: document.getElementById("openMonthly"),
  backToTracker: document.getElementById("backToTracker"),
  backToTrackerFromMonthly: document.getElementById("backToTrackerFromMonthly"),
  jumpToday: document.getElementById("jumpToday"),

  resetBtn: document.getElementById("resetBtn"),
  addHabitBtn: document.getElementById("addHabitBtn"),
};

/* =====================================================
   VIEW SWITCHING
===================================================== */

function showView(target) {
  [els.trackerView, els.weeklyView, els.monthlyAnalytics].forEach((v) =>
    v.classList.remove("active"),
  );
  target.classList.add("active");
}

els.openWeekly.onclick = () => {
  showView(els.weeklyView);
  renderWeekly();
};

els.openMonthly.onclick = () => {
  showView(els.monthlyAnalytics);
  renderMonthly();
};

els.backToTracker.onclick = els.backToTrackerFromMonthly.onclick = () =>
  showView(els.trackerView);

// els.jumpToday.onclick = () => {
//   currentDate = new Date();
//   currentDate.setHours(0, 0, 0, 0);
//   loadDay();
// };

/* =====================================================
   HABIT GRID
===================================================== */

function buildHabitGrid() {
  const key = getDateKey();
  ensureDay(key);

  els.habitRows.innerHTML = "";
  els.dateRow.innerHTML = "";

  const weekStart = getWeekStart(currentDate);

  // Dates row
  els.dateRow.appendChild(document.createElement("div"));
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);

    const cell = document.createElement("div");
    cell.textContent = d.getDate();

    if (d.toDateString() === currentDate.toDateString()) {
      cell.classList.add("current");
    }
    els.dateRow.appendChild(cell);
  }

  // Habit rows
  habits.forEach((habit) => {
    const row = document.createElement("div");
    row.className = "habit-row";

    const name = document.createElement("div");
    name.className = "habit-name";
    name.textContent = habit.name;

    name.ondblclick = () => {
      const choice = prompt(`RENAME or DELETE "${habit.name}"?`)
        ?.trim()
        .toUpperCase();

      if (choice === "DELETE") {
        if (confirm("Confirm delete habit?")) {
          habits = habits.filter((h) => h.id !== habit.id);
          saveHabits();
          buildHabitGrid();
        }
        return;
      }

      if (choice === "RENAME") {
        const newName = prompt("New name:", habit.name)?.trim();
        if (newName) {
          habit.name = newName;
          saveHabits();
          buildHabitGrid();
        }
      }
    };

    row.appendChild(name);

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dk = getDateKey(d);
      ensureDay(dk);

      const heart = document.createElement("div");
      heart.className = "heart";
      heart.textContent = "♥";

      if (store[dk].habits[habit.id]) {
        heart.classList.add("done");
      }

      heart.onclick = () => {
        store[dk].habits[habit.id] = !store[dk].habits[habit.id];
        heart.classList.toggle("done");
        saveStore();
        updateProgress();
      };

      row.appendChild(heart);
    }

    els.habitRows.appendChild(row);
  });

  updateProgress();
}

/* =====================================================
   PROGRESS & STREAK
===================================================== */

function updateProgress() {
  const key = getDateKey();
  const done = habits.filter((h) => store[key].habits[h.id]).length;
  const pct = habits.length ? Math.round((done / habits.length) * 100) : 0;
  els.progressFill.style.width = pct + "%";
  calcStreak();
}

function isDayComplete(date) {
  const k = getDateKey(date);
  return store[k] && habits.every((h) => store[k].habits[h.id]);
}

function calcStreak() {
  let streak = 0;
  let d = new Date(currentDate);

  while (isDayComplete(d)) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  els.streakCount.textContent = streak;
}

/* =====================================================
   MOOD
===================================================== */

document.querySelectorAll(".mood span").forEach((span) => {
  span.onclick = () => {
    const key = getDateKey();
    store[key].mood = span.dataset.mood;
    saveStore();

    document
      .querySelectorAll(".mood span")
      .forEach((s) => s.classList.remove("active"));

    span.classList.add("active");
  };
});

/* =====================================================
   WEEKLY VIEW
===================================================== */

function renderWeekly() {
  const start = getWeekStart(currentDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  els.weekRange.textContent =
    start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " - " +
    end.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const moods = { 1: "🙂", 2: "😍", 3: "😐", 4: "😞", null: "◌" };
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  els.weeklyMoodWave.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const k = getDateKey(d);
    const m = store[k]?.mood ?? null;

    const div = document.createElement("div");
    div.innerHTML = `
      <div class="emoji">${moods[m]}</div>
      <div class="day-label">${days[i]}</div>
    `;

    els.weeklyMoodWave.appendChild(div);
  }

  els.weeklyBars.innerHTML = "";

  habits.forEach((h) => {
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (store[getDateKey(d)]?.habits[h.id]) count++;
    }

    const pct = Math.round((count / 7) * 100);
    els.weeklyBars.innerHTML += `
      <div class="analytics-row">
        <span>${h.name}</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <span>${pct}%</span>
      </div>
    `;
  });
}

/* =====================================================
   MONTHLY VIEW
===================================================== */

function renderMonthly() {
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();

  let completed = 0;
  for (let d = 1; d <= lastDay; d++) {
    if (isDayComplete(new Date(y, m, d))) completed++;
  }

  const pct = Math.round((completed / lastDay) * 100) || 0;

  els.analyticsMonth.textContent = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  els.monthCompletion.style.width = pct + "%";
  els.monthCompletionText.textContent = pct + "%";

  els.habitAnalytics.innerHTML = "";

  habits.forEach((h) => {
    let c = 0;
    for (let d = 1; d <= lastDay; d++) {
      if (store[getDateKey(new Date(y, m, d))]?.habits[h.id]) c++;
    }
    const hp = Math.round((c / lastDay) * 100) || 0;

    els.habitAnalytics.innerHTML += `
      <div class="analytics-row">
        <span>${h.name}</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${hp}%"></div>
        </div>
        <span>${hp}%</span>
      </div>
    `;
  });

  els.weeklyAnalytics.innerHTML = "";

  let week = 1;
  let ws = new Date(y, m, 1);

  while (ws.getMonth() === m) {
    let done = 0;
    let total = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(ws);
      d.setDate(ws.getDate() + i);
      if (d.getMonth() !== m) continue;
      total++;
      if (isDayComplete(d)) done++;
    }

    const wp = total ? Math.round((done / total) * 100) : 0;

    els.weeklyAnalytics.innerHTML += `
      <div class="analytics-row">
        <span>Week ${week++}</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${wp}%"></div>
        </div>
        <span>${wp}%</span>
      </div>
    `;

    ws.setDate(ws.getDate() + 7);
  }
}

/* =====================================================
   CONTROLS
===================================================== */

els.resetBtn.onclick = () => {
  if (!confirm("Reset today?")) return;
  const key = getDateKey();
  store[key] = { habits: {}, mood: null, notes: "" };
  saveStore();
  loadDay();
};

els.addHabitBtn.onclick = () => {
  const name = prompt("New habit name?")?.trim();
  if (!name) return;
  habits.push({ id: crypto.randomUUID(), name });
  saveHabits();
  buildHabitGrid();
};

els.prevDay.onclick = () => moveDateBy(-1);
els.nextDay.onclick = () => moveDateBy(1);

/* =====================================================
   LOAD DAY
===================================================== */

function loadDay() {
  const key = getDateKey();
  ensureDay(key);

  els.monthFlip.textContent = currentDate.toLocaleString("default", {
    month: "long",
  });

  els.dateFlip.textContent = currentDate.getDate();

  document.querySelectorAll(".mood span").forEach((span) => {
    span.classList.toggle(
      "active",
      span.dataset.mood === String(store[key].mood),
    );
  });

  buildHabitGrid();
}

// INIT
loadData().then(loadDay);
