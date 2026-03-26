# Clock Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a clock plugin for Forja that displays the current time with multiple visual themes (flip clock, digital, minimal) and configurable font, 24h/12h format, and show/hide seconds.

**Architecture:** Vanilla JS plugin with CSS-only flip animations for the flip theme, and clean typography for digital/minimal themes. Multiple Google Fonts loaded for each theme. Configuration persisted via localStorage. Updates every second.

**Tech Stack:** HTML5, CSS3 (3D transforms, animations), vanilla JavaScript, Google Fonts

---

### Task 1: Create plugin directory and manifest

**Files:**
- Create: `plugins/forja-plugin-clock/manifest.json`

**Step 1: Create the manifest file**

```json
{
  "name": "forja-plugin-clock",
  "version": "1.0.9",
  "displayName": "Clock",
  "description": "A customizable clock with multiple visual themes: flip clock, digital, and minimal.",
  "scope": "global",
  "author": "Forja Team",
  "icon": "Clock",
  "entry": "index.html",
  "tags": [
    "productivity",
    "time",
    "clock"
  ],
  "permissions": [
    "theme.current"
  ],
  "minForjaVersion": "1.6.0"
}
```

**Step 2: Validate manifest structure**

Run: `pnpm run validate`
Expected: ERROR because `index.html` does not exist yet. That is fine for now.

**Step 3: Commit**

```bash
git add plugins/forja-plugin-clock/manifest.json
git commit -m "feat(clock): add plugin manifest"
```

---

### Task 2: Create HTML entry point

**Files:**
- Create: `plugins/forja-plugin-clock/index.html`

**Step 1: Create the HTML file**

Load all theme fonts upfront via Google Fonts. The active font is controlled by a CSS class on the clock container.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Clock</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Orbitron:wght@400;700&family=JetBrains+Mono:wght@400;700&family=Inter:wght@300;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="app">

    <!-- CONTENT: Clock display (centered) -->
    <main class="plugin-content">
      <!-- Theme: flip (default) -->
      <div id="clock-flip" class="clock-view clock-flip">
        <div class="clock-container">
          <!-- Hours -->
          <div class="flip-group">
            <div class="flip-card" id="flip-h1" data-value="0">
              <div class="flip-top"><span class="digit">0</span></div>
              <div class="flip-bottom"><span class="digit">0</span></div>
            </div>
            <div class="flip-card" id="flip-h2" data-value="0">
              <div class="flip-top"><span class="digit">0</span></div>
              <div class="flip-bottom"><span class="digit">0</span></div>
            </div>
          </div>

          <span class="colon">:</span>

          <!-- Minutes -->
          <div class="flip-group">
            <div class="flip-card" id="flip-m1" data-value="0">
              <div class="flip-top"><span class="digit">0</span></div>
              <div class="flip-bottom"><span class="digit">0</span></div>
            </div>
            <div class="flip-card" id="flip-m2" data-value="0">
              <div class="flip-top"><span class="digit">0</span></div>
              <div class="flip-bottom"><span class="digit">0</span></div>
            </div>
          </div>

          <span class="colon colon-seconds">:</span>

          <!-- Seconds -->
          <div class="flip-group flip-group-seconds">
            <div class="flip-card flip-card-sm" id="flip-s1" data-value="0">
              <div class="flip-top"><span class="digit">0</span></div>
              <div class="flip-bottom"><span class="digit">0</span></div>
            </div>
            <div class="flip-card flip-card-sm" id="flip-s2" data-value="0">
              <div class="flip-top"><span class="digit">0</span></div>
              <div class="flip-bottom"><span class="digit">0</span></div>
            </div>
          </div>
        </div>
        <span id="ampm-flip" class="ampm-label" hidden></span>
      </div>

      <!-- Theme: digital -->
      <div id="clock-digital" class="clock-view clock-digital" hidden>
        <span id="digital-time" class="digital-time">00:00:00</span>
        <span id="ampm-digital" class="ampm-label" hidden></span>
      </div>

      <!-- Theme: minimal -->
      <div id="clock-minimal" class="clock-view clock-minimal" hidden>
        <span id="minimal-time" class="minimal-time">00:00</span>
        <span id="ampm-minimal" class="ampm-label" hidden></span>
      </div>
    </main>

    <!-- FOOTER: Settings -->
    <footer class="plugin-footer">
      <button id="btn-settings-toggle" class="settings-toggle" type="button" aria-expanded="false" aria-controls="config-panel">
        <svg class="settings-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        Settings
        <svg class="arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>

      <section id="config-panel" class="config-section" hidden>
        <!-- Theme selector -->
        <div class="config-row">
          <span class="config-label">Theme</span>
          <div class="theme-toggle">
            <button class="theme-btn active" data-theme="flip">Flip</button>
            <button class="theme-btn" data-theme="digital">Digital</button>
            <button class="theme-btn" data-theme="minimal">Minimal</button>
          </div>
        </div>

        <!-- Font selector -->
        <div class="config-row">
          <span class="config-label">Font</span>
          <div class="font-toggle">
            <button class="font-btn active" data-font="bebas-neue">Bebas</button>
            <button class="font-btn" data-font="orbitron">Orbitron</button>
            <button class="font-btn" data-font="jetbrains-mono">JetBrains</button>
            <button class="font-btn" data-font="inter">Inter</button>
          </div>
        </div>

        <!-- Time format -->
        <div class="config-row">
          <span class="config-label">Time format</span>
          <div class="format-toggle">
            <button class="format-btn active" id="btn-24h" data-format="24h">24h</button>
            <button class="format-btn" id="btn-12h" data-format="12h">12h</button>
          </div>
        </div>

        <!-- Show seconds -->
        <div class="config-row">
          <span class="config-label">Show seconds</span>
          <button class="toggle-switch" id="btn-show-seconds" aria-pressed="true">
            <span class="toggle-knob"></span>
          </button>
        </div>
      </section>
    </footer>

  </div>

  <script src="app.js"></script>
</body>
</html>
```

**Step 2: Validate manifest now passes**

Run: `pnpm run validate`
Expected: `forja-plugin-clock` passes (entry file exists).

**Step 3: Commit**

```bash
git add plugins/forja-plugin-clock/index.html
git commit -m "feat(clock): add HTML with flip, digital, and minimal clock views"
```

---

### Task 3: Create CSS styles

**Files:**
- Create: `plugins/forja-plugin-clock/styles.css`

**Step 1: Create the stylesheet**

The CSS covers three visual themes and four font families:

**1. Font classes** (applied on `.clock-view` via JS):

```css
.font-bebas-neue   { font-family: "Bebas Neue", "Arial Narrow", sans-serif; }
.font-orbitron     { font-family: "Orbitron", monospace; }
.font-jetbrains-mono { font-family: "JetBrains Mono", monospace; }
.font-inter        { font-family: "Inter", system-ui, sans-serif; }
```

**2. Flip theme** (`.clock-flip`):

- Flip card structure with top/bottom halves split by a 1px line
- Background: `--forja-bg-surface`, text: `--forja-text`
- `perspective: 300px`, `transform-style: preserve-3d`
- `.flipping` class triggers `@keyframes flipTop` / `@keyframes flipBottom` (300ms, `cubic-bezier(0.455, 0.030, 0.515, 0.955)`)
- Subtle `box-shadow` for depth using `--forja-shadow`
- Colon separator with `@keyframes pulse` (opacity 1 -> 0.3 -> 1, 1s)
- Card sizing: `clamp(48px, 12vw, 72px)` width, seconds cards smaller with `.flip-card-sm`

**3. Digital theme** (`.clock-digital`):

- Single text element, large font with `font-variant-numeric: tabular-nums`
- Slight text glow effect: `text-shadow: 0 0 20px color-mix(in srgb, var(--forja-accent) 30%, transparent)`
- Color: `--forja-accent`
- Font size: `clamp(56px, 14vw, 96px)`

**4. Minimal theme** (`.clock-minimal`):

- Clean, thin text (font-weight 300 for Inter, 400 for others)
- Color: `--forja-text-sub`
- Font size: `clamp(48px, 12vw, 80px)`
- No animation, no glow, just time

**5. Shared styles:**

- AM/PM label: `font-size: 14px`, `color: var(--forja-text-muted)`, positioned below clock
- Settings panel: same pattern as pomodoro plugin (settings-toggle, config-section, config-row)
- Theme/font/format toggle buttons: pill group with `.active` state using `--forja-accent`
- Toggle switch for show seconds: CSS-only using `aria-pressed`
- `.seconds-hidden .flip-group-seconds`, `.seconds-hidden .colon-seconds`: `display: none`

**Step 2: Commit**

```bash
git add plugins/forja-plugin-clock/styles.css
git commit -m "feat(clock): add CSS with flip/digital/minimal themes and font options"
```

---

### Task 4: Create JavaScript logic

**Files:**
- Create: `plugins/forja-plugin-clock/app.js`

**Step 1: Implement the clock logic**

Inside an IIFE (matching the pomodoro pattern):

**1. Config persistence** via localStorage key `clock:config`:

```js
var defaults = {
  theme: "flip",           // "flip" | "digital" | "minimal"
  font: "bebas-neue",      // "bebas-neue" | "orbitron" | "jetbrains-mono" | "inter"
  format: "24h",           // "24h" | "12h"
  showSeconds: true
};
```

**2. State:**

```js
var state = {
  theme: "flip",
  font: "bebas-neue",
  format: "24h",
  showSeconds: true,
  currentDigits: { h1: "", h2: "", m1: "", m2: "", s1: "", s2: "" }
};
```

**3. Core functions:**

- `getTimeDigits()` - returns `{ h1, h2, m1, m2, s1, s2, ampm }` based on current time and format setting
  - 24h: hours 0-23 padded to 2 digits
  - 12h: hours 1-12, ampm = "AM" or "PM"
  - Edge cases: midnight = 12:00 AM, noon = 12:00 PM

- `flipDigit(card, newValue)` - for flip theme only:
  ```js
  function flipDigit(card, newValue) {
    var current = card.getAttribute("data-value");
    if (current === newValue) return;
    card.setAttribute("data-value", newValue);
    var digits = card.querySelectorAll(".digit");
    digits.forEach(function(d) { d.textContent = newValue; });
    card.classList.add("flipping");
    setTimeout(function() { card.classList.remove("flipping"); }, 300);
  }
  ```

- `updateClock()` - called every second:
  - Gets time digits
  - If theme is "flip": calls `flipDigit` for each card
  - If theme is "digital": sets `digital-time` textContent to formatted string
  - If theme is "minimal": sets `minimal-time` textContent (no seconds by default)
  - Updates AM/PM label visibility and text
  - Updates sidebar badge every minute

- `setTheme(theme)` - switches active `.clock-view`, saves config
- `setFont(font)` - removes all `font-*` classes, adds new one on all `.clock-view` elements, saves config
- `setFormat(format)` - updates `state.format`, saves config, immediate `updateClock()`
- `setShowSeconds(show)` - toggles `.seconds-hidden` class on clock container, saves config

**4. Event listeners:**

- Theme buttons (`.theme-btn`): click calls `setTheme()`
- Font buttons (`.font-btn`): click calls `setFont()`
- Format buttons (`.format-btn`): click calls `setFormat()`
- Show seconds toggle: click calls `setShowSeconds()`
- Settings toggle: same pattern as pomodoro
- `setInterval(updateClock, 1000)` for the clock tick

**5. Forja integration:**

- `forja.sidebar.setBadge()` - show current time as badge (e.g., "14:30")
- Update badge on the minute change only (compare previous minute)

**Step 2: Commit**

```bash
git add plugins/forja-plugin-clock/app.js
git commit -m "feat(clock): add clock logic with themes, fonts, and 24h/12h toggle"
```

---

### Task 5: Validate and build registry

**Files:**
- Modify: `public/registry.json` (generated)

**Step 1: Validate all plugins**

Run: `pnpm run validate`
Expected: All plugins valid (including the new clock).

**Step 2: Build registry**

Run: `pnpm run build:registry`
Expected: `public/registry.json` updated with the new clock plugin entry.

**Step 3: Commit**

```bash
git add public/registry.json
git commit -m "chore(registry): add clock plugin to registry"
```

---

### Task 6: Polish and refine

**Files:**
- Modify: `plugins/forja-plugin-clock/styles.css`
- Modify: `plugins/forja-plugin-clock/app.js`

**Step 1: Refine the CSS flip effect**

- Add `backface-visibility: hidden` on animated elements
- Add gradient overlay on top half (darker at bottom edge) for split-flap shadow
- Fine-tune timing: `cubic-bezier(0.455, 0.030, 0.515, 0.955)`
- Ensure font changes look good on all three themes (some fonts work better on certain themes)

**Step 2: Test edge cases in JS**

- Midnight rollover (23:59:59 -> 00:00:00)
- 12h format noon (12:00 PM, not 00:00 PM)
- 12h format midnight (12:00 AM, not 00:00 AM)
- Seconds toggle hiding/showing without breaking layout
- Theme switching preserves time format and font settings
- Font switching applies immediately to all views

**Step 3: Commit**

```bash
git add plugins/forja-plugin-clock/styles.css plugins/forja-plugin-clock/app.js
git commit -m "refactor(clock): polish animations, fonts, and handle edge cases"
```

---

### Task 7: Create symlink for local testing

**Files:**
- Symlink: `~/.config/forja/plugins/forja-plugin-clock` -> `plugins/forja-plugin-clock`

**Step 1: Create symbolic link to local Forja installation**

```bash
ln -s /home/nandomoreira/dev/projects/forja-plugins/plugins/forja-plugin-clock /home/nandomoreira/.config/forja/plugins/forja-plugin-clock
```

**Step 2: Verify the symlink was created correctly**

```bash
ls -la ~/.config/forja/plugins/forja-plugin-clock
```

Expected: symlink pointing to the project directory.

**Step 3: Test in Forja**

Open Forja IDE and verify the Clock plugin appears in the sidebar plugin list. Confirm:
- Clock displays current time
- All three themes work (Flip, Digital, Minimal)
- All four fonts render correctly on each theme
- 24h/12h toggle works
- Show/hide seconds works
- Settings persist after closing/reopening
- Theme variables are applied correctly (test with dark/light theme)

No commit needed for this task (symlink is local to the machine, not tracked in git).

---

## Implementation Notes

### Font Options

| Font | Google Fonts | Style | Best For |
|------|-------------|-------|----------|
| **Bebas Neue** | `Bebas+Neue` | Bold condensed, retro | Flip theme |
| **Orbitron** | `Orbitron:wght@400;700` | Geometric, sci-fi | Digital theme |
| **JetBrains Mono** | `JetBrains+Mono:wght@400;700` | Monospaced, developer | Digital/Minimal |
| **Inter** | `Inter:wght@300;600` | Clean, modern | Minimal theme |

All fonts are free (Google Fonts, OFL license). Loaded via CDN `<link>` tag. Users can combine any font with any theme.

### Theme Visual Summary

| Theme | Layout | Animation | Default Font |
|-------|--------|-----------|-------------|
| **Flip** | Split-flap cards per digit | CSS 3D flip on change | Bebas Neue |
| **Digital** | Single text line, accent glow | None (text update) | Orbitron |
| **Minimal** | Single text line, clean | None (text update) | Inter |

### No Build Step Required

Following the project convention, the plugin is pure HTML/CSS/JS with no bundler, transpiler, or build step. Google Fonts are loaded directly from the CDN.

### Sidebar Badge

The plugin sets the sidebar badge to the current time (e.g., "14:30") using `forja.sidebar.setBadge()`. Updates every 60 seconds (on the minute change).
