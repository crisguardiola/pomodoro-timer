// =============================================================================
// Pomodoro Timer — Stage 1: Core timer with work/break modes (vanilla JS)
// =============================================================================

// --- Constants (durations in seconds) ---------------------------------------
const WORK_DURATION = 25 * 60;   // 25 minutes
const BREAK_DURATION = 5 * 60;   // 5 minutes

// --- State (single source of truth) ------------------------------------------
/** Time left in the current session, in seconds */
let timeRemaining = WORK_DURATION;
/** Whether the countdown is currently running */
let isRunning = false;
/** Current session type: "work" or "break" */
let currentMode = "work";

// --- DOM references (set in init) --------------------------------------------
let displayEl;
let modeLabelEl;
let startPauseBtn;
let rootEl;

// --- Helpers -----------------------------------------------------------------

/**
 * Returns the duration in seconds for the given mode.
 * @param {"work" | "break"} mode
 * @returns {number}
 */
function getDuration(mode) {
  return mode === "work" ? WORK_DURATION : BREAK_DURATION;
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
  rootEl.append(modeLabelEl, displayEl, controls);
  app.append(rootEl);
}

// --- Init --------------------------------------------------------------------

function init() {
  createUI();
  updateDisplay();
  setInterval(tick, 1000);
}

init();
