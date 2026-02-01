console.log("APP JS LOADED");

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
let currentDate = new Date("2026-01-03"); // Fixed starting date

/* =======================
   BADGE LOGIC
======================= */

const TOTAL_POSSIBLE_BADGES = 30;

function getMonthlyBadge(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Only award if the month is fully in the past (currentDate > lastDay)
  if (currentDate <= lastDay) return null;

  let completedDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    if (isDayComplete(d)) completedDays++;
  }

  if (completedDays === daysInMonth) {
    if (daysInMonth === 31) return "🥇 Perfect 31-Day Month";
    if (daysInMonth === 30) return "🥈 Perfect 30-Day Month";
    if (daysInMonth === 28 || daysInMonth === 29) return "🥉 Perfect February";
    return "🏆 Perfect Month";
  }

  return null;
}

function calculateTotalBadges() {
  let earned = 0;
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Scan past months (reasonable range, up to 30)
  for (let y = currentYear - 5; y <= currentYear; y++) { // Adjust range if needed
    const startMonth = (y === currentYear) ? 0 : 0;
    const endMonth = (y === currentYear) ? currentMonth - 1 : 11;

    for (let m = startMonth; m <= endMonth; m++) {
      if (getMonthlyBadge(y, m)) earned++;
      if (earned >= TOTAL_POSSIBLE_BADGES) return TOTAL_POSSIBLE_BADGES;
    }
  }
  return earned;
}

function updateBadges() {
  const prevMonth = new Date(currentDate);
  prevMonth.setMonth(prevMonth.getMonth() - 1);

  const monthlyBadge = getMonthlyBadge(prevMonth.getFullYear(), prevMonth.getMonth());
  const totalEarned = calculateTotalBadges();

  // Monthly badge (on monthly view)
  let monthlyEl = document.getElementById("monthlyBadge");
  if (!monthlyEl) {
    monthlyEl = document.createElement("div");
    monthlyEl.id = "monthlyBadge";
    monthlyEl.className = "monthly-badge-status";
    const monthlyContainer = document.querySelector("#monthlyAnalytics > .analytics-card:first-of-type") || monthlyView;
    if (monthlyContainer) monthlyContainer.prepend(monthlyEl);
  }
  if (monthlyBadge) {
    monthlyEl.textContent = monthlyBadge;
    monthlyEl.style.display = "block";
  } else {
    monthlyEl.style.display = "none";
  }

  // Total badges (on main tracker view)
  let totalEl = document.getElementById("totalBadges");
  if (!totalEl) {
    totalEl = document.createElement("div");
    totalEl.id = "totalBadges";
    totalEl.className = "total-badges";
    const trackerContainer = document.querySelector(".app") || trackerView;
    if (trackerContainer) trackerContainer.prepend(totalEl);
  }
  totalEl.textContent = `🏅 Total Badges: ${totalEarned} / ${TOTAL_POSSIBLE_BADGES} 🏅`;
  totalEl.style.display = "block";
}

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

const trackerView = document.getElementById("trackerView");
const weeklyView = document.getElementById("weeklyView");
const monthlyView = document.getElementById("monthlyAnalytics");

const openWeeklyBtn = document.getElementById("openWeekly");
const openMonthlyBtn = document.getElementById("openMonthly");
const backToTrackerBtn = document.getElementById("backToTracker");
const backToTrackerFromMonthly = document.getElementById(
  "backToTrackerFromMonthly"
);
const jumpTodayBtn = document.getElementById("jumpToday");

let moodChart = null;
let weeklyPolarChart = null;
let weeklyRadialChart = null;

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
  updateBadges();
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
  updateBadges(); // Show badges when viewing monthly
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

    // Long-press detection for delete (works on iPad touch)
    let longPressTimer = null;
    const longPressDuration = 600; // ms

    const startLongPress = (e) => {
      if (e.touches && e.touches.length > 1) return; // ignore multi-touch
      longPressTimer = setTimeout(() => {
        if (confirm(`Delete habit "${name}"?`)) {
          habits.splice(h, 1);
          saveHabits();
          buildHabits();
          if (monthlyView.classList.contains("active")) renderMonthly();
        }
      }, longPressDuration);
    };

    const cancelLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    // Touch events (for iPad/Safari)
    label.addEventListener("touchstart", startLongPress, { passive: true });
    label.addEventListener("touchend", cancelLongPress);
    label.addEventListener("touchmove", cancelLongPress);
    label.addEventListener("touchcancel", cancelLongPress);

    // Mouse events (for desktop fallback, also works with Apple Pencil)
    label.addEventListener("mousedown", startLongPress);
    label.addEventListener("mouseup", cancelLongPress);
    label.addEventListener("mousemove", cancelLongPress);
    label.addEventListener("mouseleave", cancelLongPress);

    // Prevent default context menu on long press (iPad)
    label.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    row.appendChild(label);

    for (let d = 0; d < 7; d++) {
      const heart = document.createElement("div");
      heart.className = "heart";
      heart.textContent = "❤️";
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
        updateBadges();
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
  updateBadges();
}

addHabitBtn.onclick = () => {
  const name = prompt("New habit name:");
  if (name === null || name.trim() === "") return;
  habits.push(name.trim());
  saveHabits();
  buildHabits();
  if (monthlyView.classList.contains("active")) renderMonthly();
  updateBadges();
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
  updateBadges();
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

    if (monthlyView.classList.contains("active")) renderMonthly();
  };
});

/* =======================
   WEEKLY ANALYTICS - FIXED HEADER + DUAL CHARTS
======================= */

function renderWeekly() {
  if (!weeklyBars) return;

  // Add header elements if not present (in case HTML doesn't have them)
  let header = weeklyView.querySelector(".weekly-completion");
  if (!header) {
    header = document.createElement("div");
    header.className = "weekly-completion";
    header.innerHTML = `
      <div class="weekly-percent">0%</div>
      <div class="weekly-subtext">0 / 7 days completed</div>
    `;
    weeklyView.insertBefore(header, weeklyView.querySelector("p"));
  }

  weeklyBars.innerHTML = `
    <div class="weekly-charts-row">
      <div class="weekly-chart-container">
        <canvas id="weeklyPolarChart"></canvas>
      </div>
      <div class="weekly-chart-container">
        <canvas id="weeklyRadialChart"></canvas>
      </div>
    </div>
    <div class="weekly-motivation">
      <p class="motivation-text">Keep going! You're building something amazing 🔥</p>
      <p class="motivation-sub">Every perfect day brings you closer to mastery.</p>
    </div>
  `;

  const start = new Date(currentDate);
  start.setDate(start.getDate() - start.getDay());

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  if (weekRange) {
    weekRange.textContent = `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
  }

  // Calculate completed days (only full 100% days)
  let completedDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    if (isDayComplete(d)) completedDays++;
  }
  const weekPercent = Math.round((completedDays / 7) * 100);

  // Update header
  weeklyView.querySelector(".weekly-percent").textContent = weekPercent + "%";
  weeklyView.querySelector(".weekly-subtext").textContent = `${completedDays} / 7 days completed`;

  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const data = [];
  const colors = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const pct = isDayComplete(d) ? 100 : 0; // Only 100% or 0% for consistency
    data.push(pct);
    colors.push(pct === 100 ? '#22c55e' : '#ff6b6b');
  }

  // Destroy old charts
  if (weeklyPolarChart) weeklyPolarChart.destroy();
  if (weeklyRadialChart) weeklyRadialChart.destroy();

  // Polar Area Chart
  const polarCtx = document.getElementById("weeklyPolarChart")?.getContext("2d");
  if (polarCtx) {
    weeklyPolarChart = new Chart(polarCtx, {
      type: "polarArea",
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.map(c => c + "99"),
          borderColor: colors,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { r: { ticks: { display: false }, grid: { color: "rgba(132,94,247,0.2)" } } },
        animation: { duration: 1500, easing: "easeOutBounce" }
      }
    });
  }

  // Doughnut Chart - Week Average (based on full days)
  const avg = weekPercent;
  const radialCtx = document.getElementById("weeklyRadialChart")?.getContext("2d");
  if (radialCtx) {
    weeklyRadialChart = new Chart(radialCtx, {
      type: "doughnut",
      data: {
        datasets: [{
          data: [avg, 100 - avg],
          backgroundColor: [avg >= 80 ? "#22c55e" : avg >= 50 ? "#a78bfa" : "#ff6b6b", "rgba(132,94,247,0.15)"],
          borderWidth: 0,
          cutout: "75%"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { duration: 1500, easing: "easeOutBounce" }
      },
      plugins: [{
        id: "centerText",
        afterDraw(chart) {
          const ctx = chart.ctx;
          const width = chart.width;
          const height = chart.height;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = "bold 32px sans-serif";
          ctx.fillStyle = avg >= 80 ? "#22c55e" : avg >= 50 ? "#a78bfa" : "#ff6b6b";
          ctx.fillText(avg + "%", width / 2, height / 2 - 10);
          ctx.font = "14px sans-serif";
          ctx.fillStyle = "var(--text-secondary)";
          ctx.fillText("Week Avg", width / 2, height / 2 + 15);
        }
      }]
    });
  }
}

/* =======================
   MONTHLY ANALYTICS
======================= */

function renderMonthly() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let totalPossible = 0;
  let totalCompleted = 0;

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

  const monthPercent = totalPossible
    ? Math.round((totalCompleted / totalPossible) * 100)
    : 0;

  const analyticsMonth = document.getElementById("analyticsMonth");
  const monthCompletionText = document.getElementById("monthCompletionText");
  const monthCompletion = document.getElementById("monthCompletion");

  if (analyticsMonth)
    analyticsMonth.textContent = currentDate.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
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

    const habitPct = daysInMonth
      ? Math.round((doneCount / daysInMonth) * 100)
      : 0;

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

  // Mood Summary
  if (moodSummary) {
    moodSummary.innerHTML = '<canvas id="moodChart" style="width:100%; height:200px; margin:16px 0;"></canvas>';

    const scoreMap = { "1": 3, "2": 4, "3": 2, "4": 1 }; // higher = better mood

    let dailyScores = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = getDateKey(d);
      const mood = store[key]?.mood;
      const score = mood ? scoreMap[mood] : null;
      dailyScores.push(score);
    }

    // Destroy previous chart if exists
    if (moodChart) moodChart.destroy();

    const ctx = document.getElementById('moodChart').getContext('2d');
    moodChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({length: daysInMonth}, (_, i) => i + 1),
        datasets: [{
          data: dailyScores,
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(132, 94, 247, 0.15)',
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            min: 0.5,
            max: 4.5,
            ticks: {
              stepSize: 1,
              callback: value => ['', '😞', '😐', '🙂', '😍'][value] || ''
            },
            grid: { display: false }
          },
          x: {
            ticks: { maxTicksLimit: 15 },
            grid: { display: false }
          }
        }
      }
    });
  }

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
  updateBadges();
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
    if (monthlyView.classList.contains("active")) {
      renderMonthly();
      updateBadges();
    }
  }
};

openWeeklyBtn.onclick = showWeeklyView;
openMonthlyBtn.onclick = showMonthlyView;
backToTrackerBtn.onclick = showTrackerView;
backToTrackerFromMonthly.onclick = showTrackerView;

const resetAllBtn = document.getElementById("resetAllBtn");

resetAllBtn.onclick = () => {
  if (confirm("Reset all data? This will clear everything.")) {
    store = {};
    habits = [];
    localStorage.clear();
    saveStore();
    saveHabits();
    loadDay();
    if (monthlyView.classList.contains("active")) renderMonthly();
    updateBadges();
  }
};

/* =======================
   LOAD DAY
======================= */

function loadDay() {
  const key = getDateKey();
  ensureDay(key);

  if (monthFlip)
    monthFlip.textContent = currentDate.toLocaleString("default", {
      month: "long",
    });
  if (dateFlip) dateFlip.textContent = currentDate.getDate();

  if (notesEl) notesEl.value = store[key].notes || "";

  document.querySelectorAll(".mood span").forEach((s) => {
    const isActive = s.dataset.mood === String(store[key].mood);
    s.classList.toggle("active", isActive);
    s.setAttribute("aria-checked", isActive ? "true" : "false");
  });

  buildHabits();
  calcStreak();
  updateBadges();
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