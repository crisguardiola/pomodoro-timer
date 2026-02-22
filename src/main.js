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
let clockHandEl;
let clockFaceEl;

/** AudioContext for notification sound (created on first use / user gesture). */
let audioContext = null;

// --- Helpers -----------------------------------------------------------------

/**
 * Plays a short notification beep when the timer switches mode.
 * Uses Web Audio API so no external sound file is needed.
 */
function playNotificationSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (_) {
    // Ignore if audio is blocked (e.g. autoplay policy)
  }
}

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
  const previousMode = currentMode;
  currentMode = currentMode === "work" ? "break" : "work";
  timeRemaining = getDuration(currentMode);
  playNotificationSound();
  // Notify user (non-blocking on-screen message)
  const message =
    previousMode === "work"
      ? "Work session over — time for a break!"
      : "Break over — back to work!";
  showTimerNotification(message);
}

/**
 * Shows a short on-screen message when the timer ends. Auto-dismisses; no permission needed.
 * @param {string} message
 */
function showTimerNotification(message) {
  const toast = document.createElement("div");
  toast.className = "timer-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("timer-toast-visible"));
  setTimeout(() => {
    toast.classList.remove("timer-toast-visible");
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// --- Actions (called by UI) ---------------------------------------------------

/** Toggles between running and paused. */
function startPause() {
  // Create/unlock audio on user gesture so notification can play when timer hits zero
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
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
    switchMode(); // also shows on-screen notification
  }
  updateDisplay();
}

// --- Display -----------------------------------------------------------------

/**
 * Updates the DOM: countdown text, analog clock hand & ticks, Start/Pause label, mode label, and theme.
 */
function updateDisplay() {
  if (!displayEl || !modeLabelEl || !startPauseBtn || !rootEl) return;
  const totalDuration = getDuration(currentMode);
  displayEl.textContent = formatMMSS(timeRemaining);
  modeLabelEl.textContent = currentMode === "work" ? "Work" : "Break";
  startPauseBtn.textContent = isRunning ? "Pause" : "Start";
  rootEl.setAttribute("data-mode", currentMode);
  document.body.setAttribute("data-mode", currentMode);

  // Analog clock: hand at 12 o'clock when full, sweeps clockwise as time counts down
  if (clockHandEl && totalDuration > 0) {
    const angle = (1 - timeRemaining / totalDuration) * 360;
    clockHandEl.style.transform = `rotate(${angle}deg)`;
  }
  // Second ticks: one per second of current session, positioned around the circle
  if (clockFaceEl) {
    const ticks = clockFaceEl.querySelectorAll(".analog-clock-tick");
    ticks.forEach((tick, i) => {
      if (i < totalDuration) {
        tick.style.display = "";
        const tickAngle = (i / totalDuration) * 360;
        tick.style.transform = `rotate(${tickAngle}deg)`;
      } else {
        tick.style.display = "none";
      }
    });
  }
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

  // --- Analog clock: face, second ticks, hand ---------------------------------
  const clockWrap = document.createElement("div");
  clockWrap.className = "analog-clock-wrap";
  clockWrap.setAttribute("aria-hidden", "true");

  clockFaceEl = document.createElement("div");
  clockFaceEl.className = "analog-clock-face";
  for (let i = 0; i < 20; i++) {
    const tick = document.createElement("div");
    tick.className = "analog-clock-tick" + (i % 5 === 0 ? " analog-clock-tick-major" : "");
    tick.setAttribute("data-tick-index", String(i));
    clockFaceEl.appendChild(tick);
  }
  clockHandEl = document.createElement("div");
  clockHandEl.className = "analog-clock-hand";
  clockFaceEl.appendChild(clockHandEl);

  displayEl = document.createElement("div");
  displayEl.className = "countdown";
  displayEl.setAttribute("aria-live", "polite");
  clockFaceEl.appendChild(displayEl);

  clockWrap.appendChild(clockFaceEl);

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

  // --- Keyboard shortcuts legend (used inside settings panel) -----------------
  const legendEl = document.createElement("section");
  legendEl.className = "shortcuts-legend";
  legendEl.setAttribute("aria-label", "Keyboard shortcuts");
  const legendTitle = document.createElement("div");
  legendTitle.className = "shortcuts-legend-title";
  legendTitle.textContent = "Keyboard shortcuts";
  const legendList = document.createElement("div");
  legendList.className = "shortcuts-legend-list";
  const spaceRow = document.createElement("div");
  spaceRow.className = "shortcuts-legend-row";
  const spaceKbd = document.createElement("kbd");
  spaceKbd.textContent = "Space";
  spaceRow.append(spaceKbd, document.createTextNode(" — Start / Pause"));
  const rRow = document.createElement("div");
  rRow.className = "shortcuts-legend-row";
  const rKbd = document.createElement("kbd");
  rKbd.textContent = "R";
  rRow.append(rKbd, document.createTextNode(" — Reset"));
  legendList.append(spaceRow, rRow);
  legendEl.append(legendTitle, legendList);

  // --- Settings entry: corner trigger + dropdown panel -----------------------
  const settingsCorner = document.createElement("div");
  settingsCorner.className = "settings-corner";

  const settingsTrigger = document.createElement("button");
  settingsTrigger.type = "button";
  settingsTrigger.className = "settings-trigger";
  settingsTrigger.setAttribute("aria-label", "Open settings");
  settingsTrigger.setAttribute("aria-expanded", "false");
  settingsTrigger.setAttribute("aria-haspopup", "true");
  settingsTrigger.textContent = "Settings";

  const settingsPanel = document.createElement("div");
  settingsPanel.className = "settings-panel";
  settingsPanel.setAttribute("role", "dialog");
  settingsPanel.setAttribute("aria-label", "Timer settings");
  const panelTitle = document.createElement("div");
  panelTitle.className = "settings-panel-title";
  panelTitle.textContent = "Work & break";
  settingsPanel.append(panelTitle, settingsEl, legendEl);

  settingsTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = settingsPanel.classList.toggle("is-open");
    settingsTrigger.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", () => {
    if (settingsPanel.classList.contains("is-open")) {
      settingsPanel.classList.remove("is-open");
      settingsTrigger.setAttribute("aria-expanded", "false");
    }
  });
  settingsPanel.addEventListener("click", (e) => e.stopPropagation());

  settingsCorner.append(settingsTrigger, settingsPanel);

  rootEl.append(modeLabelEl, clockWrap, controls);
  app.append(settingsCorner, rootEl);
}

/**
 * Returns true if the active element is a form control we should not trigger shortcuts in.
 */
function isFormControlFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName && el.tagName.toLowerCase();
  if (tag === "input" || tag === "select" || tag === "textarea") return true;
  if (el.getAttribute("contenteditable") === "true") return true;
  return false;
}

/**
 * Handles global keyboard shortcuts: Space = Start/Pause, R = Reset.
 * Ignored when focus is in a form control.
 */
function handleKeyboardShortcuts(e) {
  if (isFormControlFocused()) return;
  if (e.key === " ") {
    e.preventDefault();
    startPause();
    return;
  }
  if (e.key === "r" || e.key === "R") {
    reset();
  }
}

// --- Init --------------------------------------------------------------------

function init() {
  createUI();
  updateDisplay();
  document.addEventListener("keydown", handleKeyboardShortcuts);
  setInterval(tick, 1000);
}

init();
