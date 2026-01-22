
/* =======================
   STATE
======================= */

let habits = JSON.parse(localStorage.getItem("habits")) || [
  "Drink water",
  "Exercise 30 min",
  "Healthy breakfast",
  "Take breaks",
  "Read 20 min",
  "Meditation",
  "Skincare",
  "Journal",
];

let store = JSON.parse(localStorage.getItem("tracker")) || {};
let currentDate = new Date("2026-01-03");  // Fixed starting date

/* =======================
   DOM
======================= */

const habitRows = document.getElementById("habitRows");
const monthFlip = document.getElementById("monthFlip");
const dateFlip = document.getElementById("dateFlip");
const streakEl = document.getElementById("streakCount");
const notesEl = document.getElementById("notes");
const progressFill = document.getElementById("progressFill");

const resetBtn = document.getElementById("resetBtn");
const addHabitBtn = document.getElementById("addHabitBtn");

const weeklyBars = document.getElementById("weeklyBars");
const weekRange = document.getElementById("weekRange");

const habitAnalytics = document.getElementById("habitAnalytics");
const weeklyAnalytics = document.getElementById("weeklyAnalytics");

const trackerView = document.getElementById("trackerView");
const weeklyView = document.getElementById("weeklyView");
const monthlyView = document.getElementById("monthlyAnalytics");

const openWeeklyBtn = document.getElementById("openWeekly");
const openMonthlyBtn = document.getElementById("openMonthly");
const backToTrackerBtn = document.getElementById("backToTracker");
const backToTrackerFromMonthly = document.getElementById("backToTrackerFromMonthly");
const jumpTodayBtn = document.getElementById("jumpToday");

/* =======================
   DATE (LOCAL SAFE)
======================= */

function getDateKey(date = currentDate) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function saveStore() {
  localStorage.setItem("tracker", JSON.stringify(store));
}

function saveHabits() {
  localStorage.setItem("habits", JSON.stringify(habits));
}

function ensureDay(key) {
  if (!store[key]) {
    store[key] = { habits: {}, mood: null, notes: "" };
  }
}

/* =======================
   VIEW SWITCHING
======================= */

function showTrackerView() {
  weeklyView.classList.remove("active");
  monthlyView.classList.remove("active");
  trackerView.classList.add("active");
}

function showWeeklyView() {
  trackerView.classList.remove("active");
  monthlyView.classList.remove("active");
  weeklyView.classList.add("active");
  renderWeekly();
}

function showMonthlyView() {
  trackerView.classList.remove("active");
  weeklyView.classList.remove("active");
  monthlyView.classList.add("active");
  renderMonthly();
}

/* =======================
   BUILD HABITS GRID
======================= */

function buildHabits() {
  habitRows.innerHTML = "";
  const key = getDateKey();
  ensureDay(key);

  const dayIndex = currentDate.getDay();

  habits.forEach((name, h) => {
    const row = document.createElement("div");
    row.className = "habit-row";
    row.dataset.index = h;

    const label = document.createElement("div");
    label.className = "habit-name";
    label.textContent = name;

    label.ondblclick = (e) => {
      e.stopPropagation();
      renameHabit(h);
    };

    label.oncontextmenu = (e) => {
      e.preventDefault();
      if (confirm(`Delete habit "${name}"?`)) {
        habits.splice(h, 1);
        saveHabits();
        buildHabits();
        if (monthlyView.classList.contains("active")) renderMonthly();
      }
    };

    row.appendChild(label);

    for (let d = 0; d < 7; d++) {
      const heart = document.createElement("div");
      heart.className = "heart";
      heart.textContent = "💛";
      heart.tabIndex = 0;

      const hk = `${h}-${d}`;
      if (store[key].habits[hk] === true) heart.classList.add("done");

      heart.onclick = heart.onkeydown = (e) => {
        if (e.type === "keydown" && !["Enter", " "].includes(e.key)) return;
        e.preventDefault();
        const newState = !heart.classList.contains("done");
        heart.classList.toggle("done", newState);
        store[key].habits[hk] = newState;
        saveStore();
        updateProgress();
        if (monthlyView.classList.contains("active")) renderMonthly();
      };

      row.appendChild(heart);
    }

    habitRows.appendChild(row);
  });

  updateProgress();
}

/* =======================
   HABIT CRUD
======================= */

function renameHabit(index) {
  const name = prompt("Rename habit:", habits[index]);
  if (name === null || name.trim() === "") return;
  habits[index] = name.trim();
  saveHabits();
  buildHabits();
  if (monthlyView.classList.contains("active")) renderMonthly();
}

addHabitBtn.onclick = () => {
  const name = prompt("New habit name:");
  if (name === null || name.trim() === "") return;
  habits.push(name.trim());
  saveHabits();
  buildHabits();
  if (monthlyView.classList.contains("active")) renderMonthly();
};

/* =======================
   DAILY PROGRESS
======================= */

function updateProgress() {
  const key = getDateKey();
  ensureDay(key);

  const dayIndex = currentDate.getDay();
  let done = 0;

  habits.forEach((_, h) => {
    if (store[key].habits[`${h}-${dayIndex}`] === true) done++;
  });

  const percent = habits.length ? Math.round((done / habits.length) * 100) : 0;

  if (progressFill) {
    progressFill.style.width = percent + "%";
    progressFill.parentElement.setAttribute("aria-valuenow", percent);
  }
  calcStreak();
}

/* =======================
   STREAK
======================= */

function isDayComplete(date) {
  const key = getDateKey(date);
  const data = store[key];
  if (!data) return false;
  const idx = date.getDay();
  return habits.every((_, h) => data.habits[`${h}-${idx}`] === true);
}

function calcStreak() {
  let streak = 0;
  let checkDate = new Date(currentDate);
  checkDate.setHours(0, 0, 0, 0);

  while (true) {
    if (isDayComplete(checkDate)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  if (streakEl) streakEl.textContent = streak;
}

/* =======================
   MOOD
======================= */

document.querySelectorAll(".mood span").forEach((el) => {
  el.onclick = el.onkeydown = (e) => {
    if (e.type === "keydown" && !["Enter", " "].includes(e.key)) return;
    e.preventDefault();
    const key = getDateKey();
    ensureDay(key);

    store[key].mood = el.dataset.mood;
    saveStore();

    document.querySelectorAll(".mood span").forEach((s) => {
      s.classList.remove("active");
      s.setAttribute("aria-checked", "false");
    });
    el.classList.add("active");
    el.setAttribute("aria-checked", "true");
  };
});

/* =======================
   WEEKLY ANALYTICS
======================= */

function renderWeekly() {
  if (!weeklyBars) return;
  weeklyBars.innerHTML = "";

  const start = new Date(currentDate);
  start.setDate(start.getDate() - start.getDay());

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  if (weekRange) {
    weekRange.textContent = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }

  const labels = ["S", "M", "T", "W", "T", "F", "S"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const percent = isDayComplete(d) ? 100 : 0;

    const row = document.createElement("div");
    row.innerHTML = `
      <span>${labels[i]}</span>
      <div class="progress-bar" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-fill" style="width: ${percent}%;"></div>
      </div>
    `;

    weeklyBars.appendChild(row);
  }
}

/* =======================
   MONTHLY ANALYTICS - CORRECTED OVERALL %
======================= */

function renderMonthly() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let totalPossible = 0;
  let totalCompleted = 0;

  // Calculate overall monthly completion as average of all habit instances
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const key = getDateKey(d);
    ensureDay(key);
    const dayIdx = d.getDay();

    habits.forEach((_, h) => {
      totalPossible++;
      if (store[key].habits[`${h}-${dayIdx}`] === true) totalCompleted++;
    });
  }

  const monthPercent = totalPossible ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  const analyticsMonth = document.getElementById("analyticsMonth");
  const monthCompletionText = document.getElementById("monthCompletionText");
  const monthCompletion = document.getElementById("monthCompletion");

  if (analyticsMonth) analyticsMonth.textContent = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  if (monthCompletionText) monthCompletionText.textContent = monthPercent + "%";
  if (monthCompletion) {
    monthCompletion.style.width = monthPercent + "%";
    monthCompletion.parentElement?.setAttribute("aria-valuenow", monthPercent);
  }

  // Habit-wise Progress
  let habitHTML = "";

  habits.forEach((name, h) => {
    let doneCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = getDateKey(d);
      const dayIdx = d.getDay();
      if (store[key]?.habits[`${h}-${dayIdx}`] === true) doneCount++;
    }

    const habitPct = daysInMonth ? Math.round((doneCount / daysInMonth) * 100) : 0;

    habitHTML += `
      <div class="analytics-row">
        <span class="analytics-label">${name}</span>
        <div class="progress-bar" role="progressbar" aria-valuenow="${habitPct}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" style="width: ${habitPct}%;"></div>
        </div>
        <span>${habitPct}%</span>
      </div>
    `;
  });

  if (habitAnalytics) habitAnalytics.innerHTML = habitHTML;

  // Weekly Breakdown
  let weekHTML = "";
  let weekStart = new Date(firstDay);
  let weekNum = 1;

  while (weekStart <= lastDay) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    let weekCompleted = 0;
    let weekDays = 0;

    let current = new Date(weekStart);
    while (current <= weekEnd && current <= lastDay) {
      if (current.getMonth() === month) {
        weekDays++;
        if (isDayComplete(current)) weekCompleted++;
      }
      current.setDate(current.getDate() + 1);
    }

    const weekPct = weekDays ? Math.round((weekCompleted / weekDays) * 100) : 0;

    weekHTML += `
      <div class="analytics-row">
        <span class="analytics-label">Week ${weekNum}</span>
        <div class="progress-bar" role="progressbar" aria-valuenow="${weekPct}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" style="width: ${weekPct}%;"></div>
        </div>
        <span>${weekPct}%</span>
      </div>
    `;

    weekStart.setDate(weekStart.getDate() + 7);
    weekNum++;
  }

  if (weeklyAnalytics) weeklyAnalytics.innerHTML = weekHTML;
}

/* =======================
   NAVIGATION
======================= */

document.getElementById("prevDay")?.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  loadDay();
});

document.getElementById("nextDay")?.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 1);
  loadDay();
});

jumpTodayBtn.onclick = () => {
  currentDate = new Date("2026-01-03");
  showTrackerView();
  loadDay();
};

resetBtn.onclick = () => {
  if (confirm("Reset all data for this day?")) {
    const key = getDateKey();
    store[key] = { habits: {}, mood: null, notes: "" };
    saveStore();
    loadDay();
    if (monthlyView.classList.contains("active")) renderMonthly();
  }
};

openWeeklyBtn.onclick = showWeeklyView;
openMonthlyBtn.onclick = showMonthlyView;
backToTrackerBtn.onclick = showTrackerView;
backToTrackerFromMonthly.onclick = showTrackerView;

/* =======================
   LOAD DAY
======================= */

function loadDay() {
  const key = getDateKey();
  ensureDay(key);

  if (monthFlip) monthFlip.textContent = currentDate.toLocaleString("default", { month: "long" });
  if (dateFlip) dateFlip.textContent = currentDate.getDate();

  if (notesEl) notesEl.value = store[key].notes || "";

  document.querySelectorAll(".mood span").forEach((s) => {
    const isActive = s.dataset.mood === String(store[key].mood);
    s.classList.toggle("active", isActive);
    s.setAttribute("aria-checked", isActive ? "true" : "false");
  });

  buildHabits();
  calcStreak();
}

/* =======================
   NOTES SAVE
======================= */

if (notesEl) {
  notesEl.oninput = () => {
    const key = getDateKey();
    ensureDay(key);
    store[key].notes = notesEl.value;
    saveStore();
  };
}

/* =======================
   INIT
======================= */

loadDay();







 