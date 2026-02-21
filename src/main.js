// =============================================================================
// Pomodoro Timer — Stage 2: Core timer + settings (custom durations)
// =============================================================================

// --- Constants ---------------------------------------------------------------
/** Allowed duration options in seconds (user can pick 5, 10, 15, or 20) */
const ALLOWED_DURATIONS = [5, 10, 15, 20];

// --- State (single source of truth) ------------------------------------------
/** Work session duration in seconds (one of ALLOWED_DURATIONS) */
let workDuration = 10;
/** Break session duration in seconds (one of ALLOWED_DURATIONS) */
let breakDuration = 5;
/** Time left in the current session, in seconds */
let timeRemaining = workDuration;
/** Whether the countdown is currently running */
let isRunning = false;
/** Current session type: "work" or "break" */
let currentMode = "work";

// --- DOM references (set in init) --------------------------------------------
let displayEl;
let modeLabelEl;
let startPauseBtn;
let rootEl;
let workDurationSelect;
let breakDurationSelect;

// --- Helpers -----------------------------------------------------------------

/**
 * Returns the duration in seconds for the given mode.
 * @param {"work" | "break"} mode
 * @returns {number}
 */
function getDuration(mode) {
  return mode === "work" ? workDuration : breakDuration;
}

/**
 * Formats seconds as "MM:SS" with leading zeros.
 * @param {number} seconds
 * @returns {string}
 */
function formatMMSS(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Switches to the other mode and resets timeRemaining to that mode's duration.
 */
function switchMode() {
  currentMode = currentMode === "work" ? "break" : "work";
  timeRemaining = getDuration(currentMode);
}

// --- Actions (called by UI) ---------------------------------------------------

/** Toggles between running and paused. */
function startPause() {
  isRunning = !isRunning;
  updateDisplay();
}

/** Stops the timer and resets timeRemaining to the current mode's duration. */
function reset() {
  isRunning = false;
  timeRemaining = getDuration(currentMode);
  updateDisplay();
}

/** Updates work or break duration from settings; resets current session if not running. */
function applyDurationSetting(mode, value) {
  const sec = parseInt(value, 10);
  if (!ALLOWED_DURATIONS.includes(sec)) return;
  if (mode === "work") workDuration = sec;
  else breakDuration = sec;
  if (!isRunning) {
    timeRemaining = getDuration(currentMode);
    updateDisplay();
  }
}

// --- Timer tick --------------------------------------------------------------
/** Single interval runs every second; we only decrement when isRunning. */
function tick() {
  if (!isRunning) return;
  timeRemaining -= 1;
  if (timeRemaining <= 0) {
    switchMode();
  }
  updateDisplay();
}

// --- Display -----------------------------------------------------------------

/**
 * Updates the DOM: countdown text, Start/Pause label, mode label, and theme.
 */
function updateDisplay() {
  if (!displayEl || !modeLabelEl || !startPauseBtn || !rootEl) return;
  displayEl.textContent = formatMMSS(timeRemaining);
  modeLabelEl.textContent = currentMode === "work" ? "Work" : "Break";
  startPauseBtn.textContent = isRunning ? "Pause" : "Start";
  rootEl.setAttribute("data-mode", currentMode);
  document.body.setAttribute("data-mode", currentMode);
}

/**
 * Builds the timer UI and attaches it to #app. Called once on load.
 */
function createUI() {
  const app = document.getElementById("app");
  if (!app) return;

  rootEl = document.createElement("div");
  rootEl.className = "timer-root";
  rootEl.setAttribute("data-mode", currentMode);

  modeLabelEl = document.createElement("div");
  modeLabelEl.className = "mode-label";
  modeLabelEl.setAttribute("aria-live", "polite");

  displayEl = document.createElement("div");
  displayEl.className = "countdown";
  displayEl.setAttribute("aria-live", "polite");

  const controls = document.createElement("div");
  controls.className = "controls";

  startPauseBtn = document.createElement("button");
  startPauseBtn.type = "button";
  startPauseBtn.className = "btn btn-primary";

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "btn btn-secondary";
  resetBtn.textContent = "Reset";

  startPauseBtn.addEventListener("click", startPause);
  resetBtn.addEventListener("click", reset);

  controls.append(startPauseBtn, resetBtn);

  // --- Settings: custom durations (5, 10, 15, 20 sec) ----------------------
  const settingsEl = document.createElement("div");
  settingsEl.className = "settings";
  settingsEl.setAttribute("aria-label", "Timer settings");

  const workLabel = document.createElement("label");
  workLabel.htmlFor = "work-duration";
  workLabel.textContent = "Work";
  workDurationSelect = document.createElement("select");
  workDurationSelect.id = "work-duration";
  workDurationSelect.className = "duration-select";
  workDurationSelect.setAttribute("aria-label", "Work duration");
  ALLOWED_DURATIONS.forEach((sec) => {
    const opt = document.createElement("option");
    opt.value = String(sec);
    opt.textContent = `${sec} sec`;
    if (sec === workDuration) opt.selected = true;
    workDurationSelect.appendChild(opt);
  });
  workDurationSelect.addEventListener("change", (e) => applyDurationSetting("work", e.target.value));

  const breakLabel = document.createElement("label");
  breakLabel.htmlFor = "break-duration";
  breakLabel.textContent = "Break";
  breakDurationSelect = document.createElement("select");
  breakDurationSelect.id = "break-duration";
  breakDurationSelect.className = "duration-select";
  breakDurationSelect.setAttribute("aria-label", "Break duration");
  ALLOWED_DURATIONS.forEach((sec) => {
    const opt = document.createElement("option");
    opt.value = String(sec);
    opt.textContent = `${sec} sec`;
    if (sec === breakDuration) opt.selected = true;
    breakDurationSelect.appendChild(opt);
  });
  breakDurationSelect.addEventListener("change", (e) => applyDurationSetting("break", e.target.value));

  const workRow = document.createElement("div");
  workRow.className = "settings-row";
  workRow.append(workLabel, workDurationSelect);
  const breakRow = document.createElement("div");
  breakRow.className = "settings-row";
  breakRow.append(breakLabel, breakDurationSelect);
  settingsEl.append(workRow, breakRow);

  rootEl.append(settingsEl, modeLabelEl, displayEl, controls);
  app.append(rootEl);
}

// --- Init --------------------------------------------------------------------

function init() {
  createUI();
  updateDisplay();
  setInterval(tick, 1000);
}

init();
