# GitHub Issues Plugin Design

## Overview

A Forja IDE plugin that manages GitHub issues directly from the sidebar using the `gh` CLI. Supports full CRUD operations: list, view (with comments), create, edit (labels/assignees), close/reopen, and comment on issues.

## Decisions

- **Communication**: Uses `gh` CLI via `forja.terminal.execute()` with `--json` flag for structured output
- **Authentication**: Delegates entirely to `gh auth` (no token management in the plugin)
- **UI style**: Simple scrollable list with expandable detail view, consistent with existing plugins (tasks, pomodoro)
- **Permissions**: `project.active`, `theme.current`, `terminal.execute`, `notifications`

## Manifest

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
  "permissions": ["project.active", "theme.current", "terminal.execute", "notifications"],
  "minForjaVersion": "1.6.0"
}
```

## State Machine

```
NO_PROJECT  ->  CHECKING_GH  ->  GH_NOT_FOUND (dead end with install instructions)
                     |
                     v
                ISSUE_LIST  <->  ISSUE_DETAIL
                     |               |
                     v               v
                CREATE_ISSUE    ADD_COMMENT / EDIT_LABELS / EDIT_ASSIGNEES
```

### State Object

```js
var state = {
  view: "list",           // "list" | "detail" | "create"
  projectPath: null,
  projectName: null,
  ghAvailable: false,
  issues: [],
  filters: { state: "open", label: "" },
  labels: [],
  selectedIssue: null,
  loading: false,
  error: null
};
```

## gh CLI Commands

| Action | Command |
|--------|---------|
| Check gh | `gh --version` |
| List issues | `gh issue list --json number,title,state,labels,assignees,createdAt --state {state} --limit 50` |
| View issue | `gh issue view {n} --json number,title,body,state,labels,assignees,comments,createdAt,author` |
| Create issue | `gh issue create --title '{t}' --body '{b}' --label '{l}'` |
| Close issue | `gh issue close {n}` |
| Reopen issue | `gh issue reopen {n}` |
| Add comment | `gh issue comment {n} --body '{b}'` |
| Edit labels | `gh issue edit {n} --add-label '{l}' --remove-label '{l}'` |
| Edit assignees | `gh issue edit {n} --add-assignee '{u}' --remove-assignee '{u}'` |
| List labels | `gh label list --json name,color --limit 100` |

## Screens

### 1. List View (main)

- Header: plugin title + issue count badge + repo name
- Filter bar: state dropdown (open/closed/all), label dropdown, "+ New" button, refresh button
- Scrollable issue list: each item shows number, title, label badges (colored), assignee initials
- Click on issue navigates to detail view

### 2. Detail View

- Back button at top
- Issue header: `#{number} {title}` + state badge (open/closed)
- Metadata row: author, created date, assignees (clickable to edit), labels (clickable to edit)
- Body: plain text with line breaks preserved (no HTML rendering)
- Comments section: chronological list with author + date + body
- Footer: new comment input + submit button
- Action buttons: Close/Reopen, Open in browser (`gh issue view {n} --web`)

### 3. Create View

- Back button at top
- Title input (required)
- Body textarea
- Label selector: checkboxes from repo labels (fetched via `gh label list`)
- "Create issue" button

## Security

All user input passed to shell commands is sanitized:

```js
function sanitizeForShell(str) {
  return str.replace(/'/g, "'\\''");
}
```

No raw user input is concatenated into shell commands without escaping.

## File Structure

```
plugins/forja-plugin-github-issues/
  manifest.json
  index.html
  app.js
  styles.css
```

## Patterns

- IIFE wrapper (`(function() { "use strict"; ... })()`)
- Vanilla JS, no build step, no dependencies
- All colors via `--forja-*` CSS variables
- Event-driven: listens to `project-changed` from Forja
- Consistent with existing plugins (tasks, pomodoro)
