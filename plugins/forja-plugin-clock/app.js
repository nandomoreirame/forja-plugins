// =============================================
// Forja Plugin: Clock
// Demonstrates: sidebar badge, localStorage persistence, theme variants, font selection
//
// Theme integration is handled automatically by Forja's PluginHost.
// All --forja-* CSS variables are injected on load and updated on
// theme changes. Plugins should NOT manually apply theme colors.
//
// This plugin is GLOBAL — it does not bind to any specific project.
// It shows the current time in three visual styles: Flip, Digital, and Minimal.
// =============================================

(function () {
  "use strict";

  var STORAGE_KEY = "clock:config";

  // --- Default config ---
  var defaults = {
    theme: "flip",
    font: "bebas-neue",
    format: "24h",
    showSeconds: true
  };

  // --- Persistence helpers ---
  function loadConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return null;
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        theme: state.theme,
        font: state.font,
        format: state.format,
        showSeconds: state.showSeconds
      }));
    } catch (_) { /* ignore */ }
  }

  // --- Load persisted config ---
  var savedConfig = loadConfig();

  // --- State ---
  var state = {
    theme: (savedConfig && savedConfig.theme) || defaults.theme,
    font: (savedConfig && savedConfig.font) || defaults.font,
    format: (savedConfig && savedConfig.format) || defaults.format,
    showSeconds: savedConfig ? (savedConfig.showSeconds !== false) : defaults.showSeconds,
    currentDigits: { h1: "", h2: "", m1: "", m2: "", s1: "", s2: "" }
  };

  // --- DOM refs ---
  // Clock views
  var clockFlip    = document.getElementById("clock-flip");
  var clockDigital = document.getElementById("clock-digital");
  var clockMinimal = document.getElementById("clock-minimal");
  var views = { flip: clockFlip, digital: clockDigital, minimal: clockMinimal };

  // Flip cards
  var flipCards = {
    h1: document.getElementById("flip-h1"),
    h2: document.getElementById("flip-h2"),
    m1: document.getElementById("flip-m1"),
    m2: document.getElementById("flip-m2"),
    s1: document.getElementById("flip-s1"),
    s2: document.getElementById("flip-s2")
  };

  // Digital/minimal text
  var digitalTime = document.getElementById("digital-time");
  var minimalTime = document.getElementById("minimal-time");

  // AM/PM labels
  var ampmLabels = {
    flip:    document.getElementById("ampm-flip"),
    digital: document.getElementById("ampm-digital"),
    minimal: document.getElementById("ampm-minimal")
  };

  // Settings
  var btnSettingsToggle = document.getElementById("btn-settings-toggle");
  var configPanel       = document.getElementById("config-panel");
  var btnShowSeconds    = document.getElementById("btn-show-seconds");
  var themeBtns         = document.querySelectorAll(".theme-btn");
  var fontBtns          = document.querySelectorAll(".font-btn");
  var formatBtns        = document.querySelectorAll(".format-btn");

  // --- Core functions ---
  function getTimeDigits() {
    var now  = new Date();
    var h    = now.getHours();
    var m    = now.getMinutes();
    var s    = now.getSeconds();
    var ampm = "";

    if (state.format === "12h") {
      ampm = h >= 12 ? "PM" : "AM";
      h    = h % 12;
      if (h === 0) h = 12; // midnight and noon show as 12
    }

    var hStr = h.toString().padStart(2, "0");
    var mStr = m.toString().padStart(2, "0");
    var sStr = s.toString().padStart(2, "0");

    return {
      h1: hStr[0], h2: hStr[1],
      m1: mStr[0], m2: mStr[1],
      s1: sStr[0], s2: sStr[1],
      ampm: ampm
    };
  }

  function flipDigit(card, newValue) {
    var current = card.getAttribute("data-value");
    if (current === newValue) return;

    card.setAttribute("data-value", newValue);
    var digits = card.querySelectorAll(".digit");
    for (var i = 0; i < digits.length; i++) {
      digits[i].textContent = newValue;
    }

    card.classList.remove("flipping");
    // Force reflow to restart animation
    void card.offsetWidth;
    card.classList.add("flipping");
  }

  function updateClock() {
    var digits = getTimeDigits();

    if (state.theme === "flip") {
      flipDigit(flipCards.h1, digits.h1);
      flipDigit(flipCards.h2, digits.h2);
      flipDigit(flipCards.m1, digits.m1);
      flipDigit(flipCards.m2, digits.m2);
      flipDigit(flipCards.s1, digits.s1);
      flipDigit(flipCards.s2, digits.s2);
    }

    if (state.theme === "digital") {
      var timeStr = digits.h1 + digits.h2 + ":" + digits.m1 + digits.m2;
      if (state.showSeconds) timeStr += ":" + digits.s1 + digits.s2;
      digitalTime.textContent = timeStr;
    }

    if (state.theme === "minimal") {
      var minStr = digits.h1 + digits.h2 + ":" + digits.m1 + digits.m2;
      if (state.showSeconds) minStr += ":" + digits.s1 + digits.s2;
      minimalTime.textContent = minStr;
    }

    // Update AM/PM labels
    var keys = ["flip", "digital", "minimal"];
    for (var k = 0; k < keys.length; k++) {
      var label = ampmLabels[keys[k]];
      if (state.format === "12h" && digits.ampm) {
        label.textContent = digits.ampm;
        label.removeAttribute("hidden");
      } else {
        label.setAttribute("hidden", "");
      }
    }

  }

  // --- Settings functions ---
  function setTheme(theme) {
    state.theme = theme;
    var keys = ["flip", "digital", "minimal"];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] === theme) {
        views[keys[i]].removeAttribute("hidden");
      } else {
        views[keys[i]].setAttribute("hidden", "");
      }
    }

    // Update active button
    themeBtns.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-theme") === theme);
    });

    saveConfig();
    updateClock();
  }

  function setFont(font) {
    state.font = font;
    var allViews   = document.querySelectorAll(".clock-view");
    var fontClasses = ["font-bebas-neue", "font-orbitron", "font-jetbrains-mono", "font-inter"];

    allViews.forEach(function (view) {
      fontClasses.forEach(function (cls) { view.classList.remove(cls); });
      view.classList.add("font-" + font);
    });

    // Colons inherit font from the parent view class — no extra action needed

    // Update active button
    fontBtns.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-font") === font);
    });

    saveConfig();
  }

  function setFormat(format) {
    state.format = format;

    formatBtns.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-format") === format);
    });

    saveConfig();
    updateClock();
  }

  function setShowSeconds(show) {
    state.showSeconds = show;
    btnShowSeconds.setAttribute("aria-pressed", show ? "true" : "false");

    // Toggle seconds visibility for flip theme
    var container = clockFlip.querySelector(".clock-container");
    if (show) {
      container.classList.remove("seconds-hidden");
    } else {
      container.classList.add("seconds-hidden");
    }

    saveConfig();
    updateClock();
  }

  // --- Event listeners ---

  // Theme buttons
  themeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(this.getAttribute("data-theme"));
    });
  });

  // Font buttons
  fontBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setFont(this.getAttribute("data-font"));
    });
  });

  // Format buttons
  formatBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setFormat(this.getAttribute("data-format"));
    });
  });

  // Show seconds toggle
  btnShowSeconds.addEventListener("click", function () {
    setShowSeconds(state.showSeconds ? false : true);
  });

  // Settings toggle
  btnSettingsToggle.addEventListener("click", function () {
    var isHidden = configPanel.hasAttribute("hidden");
    if (isHidden) {
      configPanel.removeAttribute("hidden");
      btnSettingsToggle.setAttribute("aria-expanded", "true");
    } else {
      configPanel.setAttribute("hidden", "");
      btnSettingsToggle.setAttribute("aria-expanded", "false");
    }
  });

  // --- Init ---
  // Apply saved settings on load
  setTheme(state.theme);
  setFont(state.font);
  setFormat(state.format);
  setShowSeconds(state.showSeconds);

  // Start clock
  updateClock();
  setInterval(updateClock, 1000);
})();
