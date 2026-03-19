# GitHub Issues Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Forja plugin that manages GitHub issues (CRUD + comments) using the `gh` CLI.

**Architecture:** Vanilla JS plugin (IIFE, no build step) that calls `gh` commands via `forja.terminal.execute()` with `--json` output. Three views: list, detail, create. All styling uses `--forja-*` CSS variables.

**Tech Stack:** Vanilla HTML/CSS/JS, `gh` CLI, Forja Plugin API (`forja.project`, `forja.terminal`, `forja.notifications`, `forja.on`)

**Design doc:** `docs/plans/2026-03-14-github-issues-plugin-design.md`

**Reference plugins:** `plugins/forja-plugin-tasks/` (project-bound, fs API, same UI patterns), `plugins/forja-plugin-pomodoro/` (IIFE structure, README documents full API)

**Important:** This project has no unit tests for plugins. Plugins are plain HTML/CSS/JS validated by `pnpm run validate` and `pnpm run build:registry`. The validation step replaces test runs.

---

### Task 1: Create manifest.json

**Files:**
- Create: `plugins/forja-plugin-github-issues/manifest.json`

**Step 1: Create the plugin directory and manifest**

```json
{
  "name": "forja-plugin-github-issues",
  "version": "1.0.6",
  "displayName": "GitHub Issues",
  "description": "Manage GitHub issues directly from Forja using the gh CLI.",
  "author": "Forja Team",
  "icon": "CircleDot",
  "entry": "index.html",
  "tags": ["productivity", "github", "project-management"],
  "permissions": [
    "project.active",
    "theme.current",
    "terminal.execute",
    "notifications"
  ],
  "minForjaVersion": "1.6.0"
}
```

**Step 2: Create a placeholder index.html so validation passes**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GitHub Issues</title>
</head>
<body>
  <div id="app"></div>
</body>
</html>
```

**Step 3: Validate**

Run: `pnpm run validate`
Expected: `All 3 plugin(s) valid.`

**Step 4: Commit**

```
feat(github-issues): add plugin manifest and placeholder entry
```

---

### Task 2: Create index.html with full markup

**Files:**
- Modify: `plugins/forja-plugin-github-issues/index.html`

**Step 1: Write the full HTML structure**

The HTML contains all three views (list, detail, create) as sections that are shown/hidden by JS. Follow the same pattern as `plugins/forja-plugin-tasks/index.html`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GitHub Issues</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="app">
    <header class="plugin-header">
      <div class="header-top">
        <h2 class="plugin-title">GitHub Issues</h2>
        <div id="stats" class="stats-badge">
          <span id="stats-text"></span>
        </div>
      </div>
      <span id="project-name" class="plugin-subtitle">No project</span>
    </header>

    <!-- No project state -->
    <div id="no-project-state" class="empty-state">
      <p class="empty-icon">&#128194;</p>
      <p class="empty-title">No project selected</p>
      <p class="empty-description">Open a project to view its issues.</p>
    </div>

    <!-- gh not found state -->
    <div id="gh-not-found-state" class="empty-state" style="display:none">
      <p class="empty-icon">&#9888;</p>
      <p class="empty-title">GitHub CLI not found</p>
      <p class="empty-description">Install <strong>gh</strong> and run <code>gh auth login</code>.</p>
    </div>

    <!-- Loading state -->
    <div id="loading-state" class="empty-state" style="display:none">
      <p class="empty-title">Loading...</p>
    </div>

    <!-- Error state -->
    <div id="error-state" class="empty-state" style="display:none">
      <p class="empty-icon">&#9888;</p>
      <p id="error-message" class="empty-title"></p>
      <button id="error-retry-btn" class="btn btn-ghost btn-small" type="button">Retry</button>
    </div>

    <!-- LIST VIEW -->
    <div id="list-view" style="display:none">
      <div class="filter-bar">
        <select id="filter-state" class="filter-select" aria-label="Filter by state">
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </select>
        <select id="filter-label" class="filter-select" aria-label="Filter by label">
          <option value="">All labels</option>
        </select>
        <button id="btn-refresh" class="btn btn-ghost btn-icon" type="button" aria-label="Refresh" title="Refresh">&#8635;</button>
        <button id="btn-new-issue" class="btn btn-primary btn-small" type="button">+ New</button>
      </div>
      <div id="issue-list" class="issue-list"></div>
      <div id="empty-issues-state" class="empty-state" style="display:none">
        <p class="empty-title">No issues found</p>
      </div>
    </div>

    <!-- DETAIL VIEW -->
    <div id="detail-view" style="display:none">
      <div class="detail-nav">
        <button id="btn-back-detail" class="btn btn-ghost btn-small" type="button">&larr; Back</button>
        <button id="btn-open-browser" class="btn btn-ghost btn-small" type="button">Open in browser</button>
      </div>
      <div id="detail-header" class="detail-header"></div>
      <div id="detail-meta" class="detail-meta"></div>
      <div id="detail-body" class="detail-body"></div>
      <div id="detail-comments" class="detail-comments"></div>
      <div class="comment-form">
        <textarea id="comment-input" class="input-field comment-textarea" placeholder="Add a comment..." rows="3"></textarea>
        <button id="btn-add-comment" class="btn btn-primary btn-small" type="button">Comment</button>
      </div>
      <div class="detail-actions">
        <button id="btn-close-reopen" class="btn btn-ghost btn-small" type="button"></button>
      </div>
    </div>

    <!-- CREATE VIEW -->
    <div id="create-view" style="display:none">
      <div class="detail-nav">
        <button id="btn-back-create" class="btn btn-ghost btn-small" type="button">&larr; Back</button>
      </div>
      <h3 class="view-title">New Issue</h3>
      <div class="create-form">
        <input id="create-title" class="input-field" type="text" placeholder="Issue title..." />
        <textarea id="create-body" class="input-field create-textarea" placeholder="Description (optional)..." rows="6"></textarea>
        <div id="create-labels" class="label-selector"></div>
        <button id="btn-create-submit" class="btn btn-primary" type="button">Create issue</button>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

**Step 2: Validate**

Run: `pnpm run validate`
Expected: `All 3 plugin(s) valid.`

**Step 3: Commit**

```
feat(github-issues): add full HTML markup for list, detail, and create views
```

---

### Task 3: Create base styles.css

**Files:**
- Create: `plugins/forja-plugin-github-issues/styles.css`

**Step 1: Write the stylesheet**

Follow the exact same patterns as `plugins/forja-plugin-tasks/styles.css`. Key rules:
- All colors from `--forja-*` CSS variables, zero hardcoded colors
- Same scrollbar, body, header, empty-state, input, button styles
- Custom styles for: filter-bar, issue-item, label badges, detail sections, comment form

Reference `plugins/forja-plugin-tasks/styles.css` for the base styles (scrollbar, body, header, empty-state, input-field, btn classes). Copy those verbatim and add plugin-specific styles below.

The plugin-specific additions:

```css
/* --- Filter Bar --- */
.filter-bar { display: flex; gap: 6px; align-items: center; margin-bottom: 12px; }
.filter-select {
  padding: 4px 8px; border-radius: var(--radius); border: 1px solid var(--forja-bg-overlay);
  background: var(--forja-bg-surface); color: var(--forja-text); font-size: 11px;
  font-family: inherit; outline: none; cursor: pointer; flex-shrink: 0;
}
.filter-select:focus { border-color: var(--forja-accent); }
.btn-icon { padding: 4px 6px; font-size: 14px; line-height: 1; }

/* --- Issue List --- */
.issue-list { flex: 1; overflow-y: auto; padding-right: 4px; margin-right: -4px; }
.issue-item {
  display: flex; align-items: flex-start; gap: 8px; padding: 8px;
  border-radius: var(--radius); cursor: pointer;
  transition: background 0.1s ease;
}
.issue-item:hover { background: var(--forja-bg-surface); }
.issue-number { font-size: 11px; color: var(--forja-text-muted); min-width: 32px; font-weight: 500; }
.issue-content { flex: 1; min-width: 0; }
.issue-title-text { font-size: 13px; color: var(--forja-text); word-break: break-word; }
.issue-item.closed .issue-title-text { color: var(--forja-text-muted); text-decoration: line-through; }
.issue-labels { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.label-badge {
  font-size: 10px; padding: 1px 6px; border-radius: 10px;
  font-weight: 500; line-height: 1.4;
}
.issue-assignees { font-size: 10px; color: var(--forja-text-muted); margin-top: 2px; }

/* --- Detail View --- */
.detail-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.detail-header { margin-bottom: 12px; }
.detail-issue-number { font-size: 14px; color: var(--forja-text-muted); font-weight: 500; }
.detail-issue-title { font-size: 15px; font-weight: 600; color: var(--forja-text); margin-top: 2px; }
.state-badge {
  display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 10px;
  font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-left: 8px;
}
.state-badge.open { background: var(--forja-green); color: var(--forja-bg-base); }
.state-badge.closed { background: var(--forja-red); color: var(--forja-bg-base); }
.detail-meta {
  font-size: 11px; color: var(--forja-text-muted); margin-bottom: 12px;
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
}
.detail-meta-item { display: flex; align-items: center; gap: 4px; }
.detail-body {
  font-size: 12px; color: var(--forja-text-sub); line-height: 1.6;
  white-space: pre-wrap; word-break: break-word;
  padding: 10px; border-radius: var(--radius); background: var(--forja-bg-surface);
  margin-bottom: 16px; max-height: 200px; overflow-y: auto;
}
.detail-body:empty { display: none; }

/* --- Labels in detail (editable) --- */
.detail-labels { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.detail-labels .label-badge { cursor: pointer; }
.detail-labels .label-badge:hover { opacity: 0.8; }
.label-add-btn {
  font-size: 10px; padding: 1px 6px; border-radius: 10px; border: 1px dashed var(--forja-bg-overlay);
  background: transparent; color: var(--forja-text-muted); cursor: pointer;
  transition: all 0.1s ease;
}
.label-add-btn:hover { border-color: var(--forja-accent); color: var(--forja-accent); }

/* --- Label Popover --- */
.label-popover {
  position: absolute; z-index: 10; background: var(--forja-bg-overlay);
  border: 1px solid var(--forja-border); border-radius: var(--radius);
  padding: 6px; max-height: 180px; overflow-y: auto; min-width: 140px;
  box-shadow: 0 4px 12px var(--forja-shadow);
}
.label-popover-item {
  display: flex; align-items: center; gap: 6px; padding: 4px 6px;
  border-radius: 3px; cursor: pointer; font-size: 11px; color: var(--forja-text);
}
.label-popover-item:hover { background: var(--forja-bg-surface); }
.label-popover-item.selected { font-weight: 600; }
.label-check { width: 12px; text-align: center; font-size: 10px; }

/* --- Comments --- */
.detail-comments { margin-bottom: 12px; }
.comments-title { font-size: 11px; font-weight: 600; color: var(--forja-text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
.comment-item {
  padding: 8px; border-radius: var(--radius); background: var(--forja-bg-surface);
  margin-bottom: 6px;
}
.comment-header { font-size: 10px; color: var(--forja-text-muted); margin-bottom: 4px; }
.comment-author { font-weight: 600; color: var(--forja-text-sub); }
.comment-body { font-size: 12px; color: var(--forja-text-sub); white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
.comment-form { margin-bottom: 10px; display: flex; flex-direction: column; gap: 6px; }
.comment-textarea { resize: vertical; min-height: 60px; }

/* --- Detail Actions --- */
.detail-actions { display: flex; gap: 6px; padding-top: 8px; border-top: 1px solid var(--forja-bg-overlay); }

/* --- Create View --- */
.view-title { font-size: 14px; font-weight: 600; color: var(--forja-text); margin-bottom: 12px; }
.create-form { display: flex; flex-direction: column; gap: 10px; }
.create-textarea { resize: vertical; min-height: 80px; }

/* --- Label Selector (Create View) --- */
.label-selector { display: flex; flex-wrap: wrap; gap: 6px; }
.label-selector-title { font-size: 11px; color: var(--forja-text-muted); width: 100%; margin-bottom: 2px; }
.label-option {
  display: flex; align-items: center; gap: 4px; padding: 3px 8px;
  border-radius: 10px; border: 1px solid var(--forja-bg-overlay);
  background: transparent; cursor: pointer; font-size: 11px;
  transition: all 0.1s ease;
}
.label-option.selected { border-color: var(--forja-accent); background: var(--forja-bg-surface); }
.label-option:hover { border-color: var(--forja-accent); }
```

**Step 2: Commit**

```
feat(github-issues): add base stylesheet with forja theme variables
```

---

### Task 4: Create app.js - Core infrastructure (state, gh check, Forja integration)

**Files:**
- Create: `plugins/forja-plugin-github-issues/app.js`

**Step 1: Write the IIFE with state, DOM refs, shell sanitizer, gh helper, and Forja integration**

This is the skeleton that handles:
- State object
- DOM references for all elements from index.html
- `sanitizeForShell()` security function
- `execGh(cmd)` wrapper that calls `forja.terminal.execute()` and parses JSON
- `checkGh()` to verify gh is installed
- `forja.project.getActive()` + `forja.on("project-changed")` integration
- `showView(name)` to toggle between list/detail/create views
- `renderError()` for error state display

```js
// =============================================
// Forja Plugin: GitHub Issues
// Manages GitHub issues using the gh CLI.
//
// Theme integration is handled automatically by Forja's PluginHost.
// All --forja-* CSS variables are injected on load and updated on
// theme changes. Plugins should NOT manually apply theme colors.
// =============================================

(function () {
  "use strict";

  // --- State ---
  var state = {
    view: "list",
    projectPath: null,
    projectName: null,
    ghAvailable: false,
    issues: [],
    filters: { state: "open", label: "" },
    labels: [],
    selectedIssue: null,
    loading: false,
    error: null,
  };

  // --- DOM refs ---
  // (list all getElementById calls for every element in index.html)

  // --- Security ---
  function sanitizeForShell(str) {
    if (!str) return "";
    return str.replace(/'/g, "'\\''");
  }

  // --- gh CLI helper ---
  function execGh(cmd) {
    return forja.terminal.execute("gh " + cmd).then(function (output) {
      var trimmed = (output || "").trim();
      if (!trimmed) return null;
      try { return JSON.parse(trimmed); }
      catch (_) { return trimmed; }
    });
  }

  function checkGh() {
    return forja.terminal.execute("gh --version").then(function () {
      state.ghAvailable = true;
    }).catch(function () {
      state.ghAvailable = false;
    });
  }

  // --- View management ---
  function showView(name) { /* toggle display of list-view, detail-view, create-view */ }

  // --- Forja integration ---
  // forja.project.getActive() -> checkGh() -> loadIssues()
  // forja.on("project-changed", ...) -> reload
}());
```

**Step 2: Validate**

Run: `pnpm run validate`
Expected: `All 3 plugin(s) valid.`

**Step 3: Commit**

```
feat(github-issues): add app.js core infrastructure and gh CLI integration
```

---

### Task 5: Implement list view (fetch issues, render, filters)

**Files:**
- Modify: `plugins/forja-plugin-github-issues/app.js`

**Step 1: Add list view functions**

Add these functions to app.js:

- `loadLabels()` - calls `gh label list --json name,color --limit 100`, populates `state.labels` and the filter dropdown
- `loadIssues()` - calls `gh issue list --json number,title,state,labels,assignees,createdAt --state {state.filters.state} --limit 50`, optionally with `--label` filter. Populates `state.issues`
- `renderList()` - clears `issue-list` div, creates `issue-item` elements for each issue with: number, title, label badges (colored background from label.color), assignee names. Click handler calls `viewIssue(number)`
- `renderLabelBadge(label)` - creates a span with `.label-badge` class and inline `background-color` from `#` + label.color, with contrasting text color (black or white based on luminance)
- Wire up filter dropdowns (`filter-state`, `filter-label`) with change events that call `loadIssues()`
- Wire up `btn-refresh` click to `loadIssues()`
- Wire up `btn-new-issue` click to `showView("create")`

**Helper for label text color contrast:**
```js
function contrastColor(hexColor) {
  var r = parseInt(hexColor.substr(0, 2), 16);
  var g = parseInt(hexColor.substr(2, 2), 16);
  var b = parseInt(hexColor.substr(4, 2), 16);
  var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}
```

**Step 2: Validate**

Run: `pnpm run validate`
Expected: `All 3 plugin(s) valid.`

**Step 3: Commit**

```
feat(github-issues): implement issue list view with filters and label badges
```

---

### Task 6: Implement detail view (view issue, comments, close/reopen)

**Files:**
- Modify: `plugins/forja-plugin-github-issues/app.js`

**Step 1: Add detail view functions**

- `viewIssue(number)` - calls `gh issue view {number} --json number,title,body,state,labels,assignees,comments,createdAt,author`, stores in `state.selectedIssue`, calls `renderDetail()`, shows detail view
- `renderDetail()` - populates:
  - `detail-header`: `#{number}` + title + state badge (open/closed)
  - `detail-meta`: author login, created date (formatted), assignee logins, label badges
  - `detail-body`: body text with `\n` preserved (textContent, not innerHTML)
  - `detail-comments`: list of comments, each with author + `createdAt` formatted + body
- `formatDate(isoString)` - returns "Mar 14, 2026" format
- Wire up `btn-back-detail` to go back to list view
- Wire up `btn-open-browser` to call `forja.terminal.execute("gh issue view {n} --web")`
- Wire up `btn-close-reopen`:
  - If issue is open: call `gh issue close {n}`, show notification, refresh
  - If issue is closed: call `gh issue reopen {n}`, show notification, refresh
- Wire up `btn-add-comment`:
  - Read `comment-input` textarea value
  - Call `gh issue comment {n} --body '{sanitized}'`
  - Show notification, clear input, reload issue detail

**Step 2: Validate**

Run: `pnpm run validate`
Expected: `All 3 plugin(s) valid.`

**Step 3: Commit**

```
feat(github-issues): implement issue detail view with comments and actions
```

---

### Task 7: Implement create view

**Files:**
- Modify: `plugins/forja-plugin-github-issues/app.js`

**Step 1: Add create view functions**

- `showCreateView()` - loads labels (if not cached), renders label checkboxes in `create-labels`, resets form inputs, shows create view
- `renderLabelSelector()` - for each label in `state.labels`, creates a button with `.label-option` class. Clicking toggles `.selected` class. Uses inline background color swatch.
- Wire up `btn-back-create` to go back to list view
- Wire up `btn-create-submit`:
  - Read title from `create-title` (required, show error if empty)
  - Read body from `create-body`
  - Collect selected labels from `.label-option.selected` elements
  - Build command: `gh issue create --title '{sanitized_title}' --body '{sanitized_body}'`
  - If labels selected: append `--label '{label1},{label2}'`
  - Execute, show notification "Issue created", navigate back to list view and refresh

**Step 2: Validate**

Run: `pnpm run validate`
Expected: `All 3 plugin(s) valid.`

**Step 3: Commit**

```
feat(github-issues): implement create issue view with label selection
```

---

### Task 8: Implement label and assignee editing in detail view

**Files:**
- Modify: `plugins/forja-plugin-github-issues/app.js`

**Step 1: Add label editing**

- In `renderDetail()`, after rendering labels, add a "+" button (`.label-add-btn`) that opens a popover
- `showLabelPopover(anchorEl)` - creates a `.label-popover` div positioned below the anchor. Lists all `state.labels` with checkboxes. Labels already on the issue are pre-checked. Clicking a label calls `toggleIssueLabel(number, labelName, isAdding)`
- `toggleIssueLabel(number, name, add)`:
  - If adding: `gh issue edit {n} --add-label '{name}'`
  - If removing: `gh issue edit {n} --remove-label '{name}'`
  - Reload issue detail after
- Click outside popover closes it

**Step 2: Add assignee editing**

- In `renderDetail()`, make assignee section clickable
- `toggleAssignee(number)`:
  - If current user is assigned: `gh issue edit {n} --remove-assignee @me`
  - If not: `gh issue edit {n} --add-assignee @me`
  - Reload issue detail after
- Keep assignee editing simple (toggle @me only, no user picker)

**Step 3: Validate**

Run: `pnpm run validate`
Expected: `All 3 plugin(s) valid.`

**Step 4: Commit**

```
feat(github-issues): add label popover and assignee toggle in detail view
```

---

### Task 9: Final validation and registry build

**Files:**
- Verify: all 4 files in `plugins/forja-plugin-github-issues/`

**Step 1: Run full validation**

Run: `pnpm run validate`
Expected: `All 3 plugin(s) valid.`

**Step 2: Build registry**

Run: `pnpm run build:registry`
Expected: `public/registry.json` updated with the new plugin entry

**Step 3: Verify registry contains the new plugin**

Read `public/registry.json` and confirm it includes an entry for `forja-plugin-github-issues` with correct version, name, and download URL.

**Step 4: Commit**

```
chore(github-issues): rebuild registry with new plugin
```
