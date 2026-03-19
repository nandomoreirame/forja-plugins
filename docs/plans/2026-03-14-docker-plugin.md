# Docker Manager Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Forja plugin that lets users manage Docker containers, images, and Compose services directly from the IDE sidebar.

**Architecture:** The plugin uses `forja.terminal.execute()` to run Docker CLI commands and parses their JSON output. A utility module (`docker.js`) contains all pure functions (command builders, output parsers) and is fully testable via vitest. The main application (`app.js`) handles state, rendering, and Forja API integration. Tabs separate Containers, Images, and Compose views. Auto-refresh polling keeps the UI in sync.

**Tech Stack:** Vanilla JS (IIFE pattern, no modules/build), Forja Plugin API (`terminal.execute`, `project.active`, `fs.read`, `theme.current`, `notifications`, `sidebar.setBadge`), vitest (for testing pure utility functions)

---

## Architecture Overview

```
plugins/forja-plugin-docker/
  manifest.json       # Plugin metadata with terminal.execute permission
  index.html          # Entry point: loads styles.css, docker.js, app.js
  styles.css          # All styling via --forja-* CSS variables
  docker.js           # Pure utility functions (testable)
  app.js              # Main IIFE: state, render, events, Forja API
tests/
  docker.test.mjs     # vitest tests for docker.js utilities
```

### Permission Model

| Permission | Usage | Risk |
|---|---|---|
| `terminal.execute` | Run docker/docker-compose CLI commands | Critical |
| `project.active` | Detect docker-compose.yml in project root | Low |
| `fs.read` | Read docker-compose.yml to list services | Low-Medium |
| `theme.current` | Theme integration | Low |
| `notifications` | Alert on container state changes | Low |

### Security Constraints

- **Command whitelist only**: Only `docker` and `docker-compose`/`docker compose` commands are built programmatically. Never interpolate raw user input into shell commands.
- **Output sanitization**: All Docker output is rendered via `textContent`, never `innerHTML`. Log viewer uses pre-formatted text elements.
- **No eval/Function**: All parsing uses `JSON.parse` on Docker's `--format json` output.

### UI Tabs

1. **Containers** (default): Running/stopped containers with actions (start, stop, restart, remove)
2. **Images**: Local images with size info
3. **Compose**: Detected compose services with up/down controls (only visible when docker-compose.yml exists)

---

## Task 1: Set Up Test Infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.mjs`

**Step 1: Install vitest**

Run: `pnpm add -D vitest`

**Step 2: Add vitest config**

Create `vitest.config.mjs`:

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.mjs"],
  },
});
```

**Step 3: Add test script to package.json**

Add to `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: Verify vitest works**

Run: `pnpm test`
Expected: 0 test files found (no failures)

**Step 5: Commit**

```bash
git add vitest.config.mjs package.json pnpm-lock.yaml
git commit -m "chore: add vitest for plugin utility testing"
```

---

## Task 2: Scaffold Plugin Structure

**Files:**
- Create: `plugins/forja-plugin-docker/manifest.json`
- Create: `plugins/forja-plugin-docker/index.html`
- Create: `plugins/forja-plugin-docker/styles.css`
- Create: `plugins/forja-plugin-docker/docker.js`
- Create: `plugins/forja-plugin-docker/app.js`

**Step 1: Create manifest.json**

```json
{
  "name": "forja-plugin-docker",
  "version": "1.0.6",
  "displayName": "Docker Manager",
  "description": "Manage Docker containers, images, and Compose services from the sidebar",
  "author": "Forja Team",
  "icon": "Container",
  "entry": "index.html",
  "tags": ["devops", "docker", "containers"],
  "permissions": [
    "terminal.execute",
    "project.active",
    "fs.read",
    "theme.current",
    "notifications"
  ],
  "minForjaVersion": "1.6.0"
}
```

**Step 2: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Docker Manager</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="app">

    <!-- Header -->
    <header class="plugin-header">
      <div class="header-top">
        <div>
          <h1 class="plugin-title">Docker</h1>
          <p id="docker-status" class="plugin-subtitle">Checking...</p>
        </div>
        <span id="container-badge" class="header-badge"></span>
      </div>
    </header>

    <!-- Tabs -->
    <nav class="tab-bar" role="tablist">
      <button class="tab active" data-tab="containers" role="tab" aria-selected="true">Containers</button>
      <button class="tab" data-tab="images" role="tab" aria-selected="false">Images</button>
      <button class="tab" data-tab="compose" role="tab" aria-selected="false">Compose</button>
    </nav>

    <!-- Container list -->
    <main id="panel-containers" class="panel active">
      <div class="panel-toolbar">
        <div class="filter-group">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="running">Running</button>
          <button class="filter-btn" data-filter="stopped">Stopped</button>
        </div>
        <button id="btn-refresh" class="icon-btn" title="Refresh" aria-label="Refresh containers">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
        </button>
      </div>
      <div id="container-list" class="item-list"></div>
      <div id="container-empty" class="empty-state" style="display:none">
        <div class="empty-icon">&#128230;</div>
        <div class="empty-title">No containers found</div>
        <div class="empty-description">Docker containers will appear here</div>
      </div>
      <div id="container-loading" class="loading-state" style="display:none">Loading...</div>
    </main>

    <!-- Image list -->
    <section id="panel-images" class="panel" style="display:none">
      <div id="image-list" class="item-list"></div>
      <div id="image-empty" class="empty-state" style="display:none">
        <div class="empty-icon">&#128451;</div>
        <div class="empty-title">No images found</div>
        <div class="empty-description">Docker images will appear here</div>
      </div>
    </section>

    <!-- Compose panel -->
    <section id="panel-compose" class="panel" style="display:none">
      <div id="compose-no-file" class="empty-state">
        <div class="empty-icon">&#128221;</div>
        <div class="empty-title">No Compose file</div>
        <div class="empty-description">Open a project with docker-compose.yml</div>
      </div>
      <div id="compose-controls" style="display:none">
        <div class="compose-actions">
          <button id="btn-compose-up" class="btn btn-primary btn-small">Up</button>
          <button id="btn-compose-down" class="btn btn-ghost btn-small">Down</button>
          <button id="btn-compose-restart" class="btn btn-ghost btn-small">Restart</button>
        </div>
        <div id="compose-services" class="item-list"></div>
      </div>
    </section>

    <!-- Log viewer (overlay) -->
    <div id="log-viewer" class="log-viewer" style="display:none">
      <div class="log-header">
        <span id="log-title" class="log-title">Logs</span>
        <div class="log-actions">
          <button id="btn-log-refresh" class="icon-btn" title="Refresh logs" aria-label="Refresh logs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          </button>
          <button id="btn-log-close" class="icon-btn" title="Close" aria-label="Close logs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <pre id="log-content" class="log-content"></pre>
    </div>

  </div>

  <script src="docker.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

**Step 3: Create empty docker.js stub**

```js
// Docker utility functions (command builders + output parsers)
// Loaded before app.js. Exported for both browser and vitest.
(function (root) {
  "use strict";

  var DockerUtils = {};

  // Export
  if (typeof module !== "undefined" && module.exports) {
    module.exports = DockerUtils;
  } else {
    root.DockerUtils = DockerUtils;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
```

**Step 4: Create empty app.js stub**

```js
// Forja Plugin: Docker Manager
// Requires docker.js to be loaded first.
(function () {
  "use strict";
  // TODO: implement
})();
```

**Step 5: Create minimal styles.css**

```css
/* Forja Plugin: Docker Manager
 * MANDATORY: All colors via --forja-* CSS variables. */

:root {
  --radius: 6px;
  --radius-lg: 8px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: "Geist Sans", "Inter", system-ui, -apple-system, sans-serif;
  background: var(--forja-bg-base);
  color: var(--forja-text);
  font-size: 13px;
  line-height: 1.5;
  height: 100vh;
  overflow: hidden;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 12px;
}
```

**Step 6: Validate manifest**

Run: `pnpm run validate`
Expected: All plugins valid (including forja-plugin-docker)

**Step 7: Commit**

```bash
git add plugins/forja-plugin-docker/
git commit -m "feat(docker): scaffold plugin structure with manifest and entry point"
```

---

## Task 3: Docker Command Builders (TDD)

**Files:**
- Create: `tests/docker.test.mjs`
- Modify: `plugins/forja-plugin-docker/docker.js`

**Step 1: Write failing tests for command builders**

Create `tests/docker.test.mjs`:

```js
import { describe, it, expect } from "vitest";
const DockerUtils = require("../plugins/forja-plugin-docker/docker.js");

describe("DockerUtils.buildPsCommand", () => {
  it("returns command for all containers with JSON format", () => {
    const cmd = DockerUtils.buildPsCommand({ all: true });
    expect(cmd).toBe("docker ps -a --format '{{json .}}' --no-trunc");
  });

  it("returns command for running containers only", () => {
    const cmd = DockerUtils.buildPsCommand({ all: false });
    expect(cmd).toBe("docker ps --format '{{json .}}' --no-trunc");
  });
});

describe("DockerUtils.buildImagesCommand", () => {
  it("returns command for listing images with JSON format", () => {
    const cmd = DockerUtils.buildImagesCommand();
    expect(cmd).toBe("docker images --format '{{json .}}'");
  });
});

describe("DockerUtils.buildLogsCommand", () => {
  it("returns command for fetching last N lines of logs", () => {
    const cmd = DockerUtils.buildLogsCommand("my-container", { tail: 200 });
    expect(cmd).toBe("docker logs --tail 200 --timestamps my-container");
  });

  it("defaults to 100 lines", () => {
    const cmd = DockerUtils.buildLogsCommand("my-container");
    expect(cmd).toBe("docker logs --tail 100 --timestamps my-container");
  });

  it("rejects container names with shell metacharacters", () => {
    expect(() => DockerUtils.buildLogsCommand("foo;rm -rf /")).toThrow();
    expect(() => DockerUtils.buildLogsCommand("foo$(evil)")).toThrow();
    expect(() => DockerUtils.buildLogsCommand("foo|bar")).toThrow();
  });
});

describe("DockerUtils.buildActionCommand", () => {
  it("builds start command", () => {
    const cmd = DockerUtils.buildActionCommand("start", "my-nginx");
    expect(cmd).toBe("docker start my-nginx");
  });

  it("builds stop command", () => {
    const cmd = DockerUtils.buildActionCommand("stop", "my-nginx");
    expect(cmd).toBe("docker stop my-nginx");
  });

  it("builds restart command", () => {
    const cmd = DockerUtils.buildActionCommand("restart", "my-nginx");
    expect(cmd).toBe("docker restart my-nginx");
  });

  it("builds rm command with force flag", () => {
    const cmd = DockerUtils.buildActionCommand("rm", "my-nginx");
    expect(cmd).toBe("docker rm -f my-nginx");
  });

  it("rejects unknown actions", () => {
    expect(() => DockerUtils.buildActionCommand("exec", "my-nginx")).toThrow();
  });

  it("rejects container names with shell metacharacters", () => {
    expect(() => DockerUtils.buildActionCommand("start", "foo;evil")).toThrow();
  });
});

describe("DockerUtils.buildComposeCommand", () => {
  it("builds compose up command", () => {
    const cmd = DockerUtils.buildComposeCommand("up");
    expect(cmd).toBe("docker compose up -d");
  });

  it("builds compose down command", () => {
    const cmd = DockerUtils.buildComposeCommand("down");
    expect(cmd).toBe("docker compose down");
  });

  it("builds compose ps command with JSON format", () => {
    const cmd = DockerUtils.buildComposeCommand("ps");
    expect(cmd).toBe("docker compose ps --format json");
  });

  it("builds compose restart command", () => {
    const cmd = DockerUtils.buildComposeCommand("restart");
    expect(cmd).toBe("docker compose restart");
  });

  it("rejects unknown compose actions", () => {
    expect(() => DockerUtils.buildComposeCommand("exec")).toThrow();
  });
});

describe("DockerUtils.buildVersionCommand", () => {
  it("returns docker version check command", () => {
    const cmd = DockerUtils.buildVersionCommand();
    expect(cmd).toBe("docker version --format '{{.Server.Version}}'");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: All tests FAIL (functions not defined)

**Step 3: Implement command builders**

Update `plugins/forja-plugin-docker/docker.js`:

```js
// Docker utility functions (command builders + output parsers)
// Loaded before app.js. Exported for both browser and vitest.
(function (root) {
  "use strict";

  var DockerUtils = {};

  // --- Security ---

  var SAFE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.\-\/\:]*$/;

  function assertSafeName(name) {
    if (!name || !SAFE_NAME_RE.test(name)) {
      throw new Error("Invalid container/image name: " + name);
    }
  }

  var ALLOWED_ACTIONS = { start: true, stop: true, restart: true, rm: true };
  var ALLOWED_COMPOSE = { up: true, down: true, ps: true, restart: true };

  // --- Command Builders ---

  DockerUtils.buildPsCommand = function (opts) {
    var flags = opts && opts.all ? " -a" : "";
    return "docker ps" + flags + " --format '{{json .}}' --no-trunc";
  };

  DockerUtils.buildImagesCommand = function () {
    return "docker images --format '{{json .}}'";
  };

  DockerUtils.buildLogsCommand = function (containerName, opts) {
    assertSafeName(containerName);
    var tail = (opts && opts.tail) || 100;
    return "docker logs --tail " + tail + " --timestamps " + containerName;
  };

  DockerUtils.buildActionCommand = function (action, containerName) {
    if (!ALLOWED_ACTIONS[action]) {
      throw new Error("Unknown docker action: " + action);
    }
    assertSafeName(containerName);
    var extra = action === "rm" ? " -f" : "";
    return "docker " + action + extra + " " + containerName;
  };

  DockerUtils.buildComposeCommand = function (action) {
    if (!ALLOWED_COMPOSE[action]) {
      throw new Error("Unknown compose action: " + action);
    }
    var suffix = "";
    if (action === "up") suffix = " -d";
    if (action === "ps") suffix = " --format json";
    return "docker compose " + action + suffix;
  };

  DockerUtils.buildVersionCommand = function () {
    return "docker version --format '{{.Server.Version}}'";
  };

  // Export
  if (typeof module !== "undefined" && module.exports) {
    module.exports = DockerUtils;
  } else {
    root.DockerUtils = DockerUtils;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add tests/docker.test.mjs plugins/forja-plugin-docker/docker.js
git commit -m "feat(docker): add command builders with shell injection protection"
```

---

## Task 4: Docker Output Parsers (TDD)

**Files:**
- Modify: `tests/docker.test.mjs`
- Modify: `plugins/forja-plugin-docker/docker.js`

**Step 1: Write failing tests for parsers**

Append to `tests/docker.test.mjs`:

```js
describe("DockerUtils.parseContainers", () => {
  it("parses NDJSON output from docker ps", () => {
    const output = [
      '{"ID":"abc123","Names":"my-nginx","Image":"nginx:latest","State":"running","Status":"Up 2 hours","Ports":"0.0.0.0:80->80/tcp"}',
      '{"ID":"def456","Names":"my-redis","Image":"redis:7","State":"exited","Status":"Exited (0) 3 hours ago","Ports":""}',
    ].join("\n");

    const containers = DockerUtils.parseContainers(output);
    expect(containers).toHaveLength(2);
    expect(containers[0]).toEqual({
      id: "abc123",
      name: "my-nginx",
      image: "nginx:latest",
      state: "running",
      status: "Up 2 hours",
      ports: "0.0.0.0:80->80/tcp",
    });
    expect(containers[1].state).toBe("exited");
  });

  it("returns empty array for empty output", () => {
    expect(DockerUtils.parseContainers("")).toEqual([]);
    expect(DockerUtils.parseContainers("\n")).toEqual([]);
  });

  it("skips malformed JSON lines", () => {
    const output = '{"ID":"abc","Names":"ok","Image":"img","State":"running","Status":"Up","Ports":""}\nnot json\n';
    const containers = DockerUtils.parseContainers(output);
    expect(containers).toHaveLength(1);
  });
});

describe("DockerUtils.parseImages", () => {
  it("parses NDJSON output from docker images", () => {
    const output = [
      '{"ID":"sha256:abc","Repository":"nginx","Tag":"latest","Size":"187MB","CreatedSince":"2 weeks ago"}',
      '{"ID":"sha256:def","Repository":"redis","Tag":"7-alpine","Size":"30MB","CreatedSince":"3 months ago"}',
    ].join("\n");

    const images = DockerUtils.parseImages(output);
    expect(images).toHaveLength(2);
    expect(images[0]).toEqual({
      id: "sha256:abc",
      repository: "nginx",
      tag: "latest",
      size: "187MB",
      created: "2 weeks ago",
    });
  });

  it("returns empty array for empty output", () => {
    expect(DockerUtils.parseImages("")).toEqual([]);
  });

  it("filters out <none> images", () => {
    const output = '{"ID":"sha256:xxx","Repository":"\\u003cnone\\u003e","Tag":"\\u003cnone\\u003e","Size":"0B","CreatedSince":"1 day ago"}';
    const images = DockerUtils.parseImages(output);
    expect(images).toHaveLength(0);
  });
});

describe("DockerUtils.parseComposeServices", () => {
  it("parses JSON array output from docker compose ps", () => {
    const output = JSON.stringify([
      { Name: "project-web-1", Service: "web", State: "running", Status: "Up 5 minutes", Publishers: [{ PublishedPort: 3000, TargetPort: 3000, Protocol: "tcp" }] },
      { Name: "project-db-1", Service: "db", State: "running", Status: "Up 5 minutes", Publishers: [{ PublishedPort: 5432, TargetPort: 5432, Protocol: "tcp" }] },
    ]);

    const services = DockerUtils.parseComposeServices(output);
    expect(services).toHaveLength(2);
    expect(services[0]).toEqual({
      name: "project-web-1",
      service: "web",
      state: "running",
      status: "Up 5 minutes",
      ports: "3000:3000/tcp",
    });
  });

  it("handles NDJSON format (one object per line)", () => {
    const output = [
      '{"Name":"web-1","Service":"web","State":"running","Status":"Up","Publishers":[]}',
      '{"Name":"db-1","Service":"db","State":"exited","Status":"Exited","Publishers":[]}',
    ].join("\n");

    const services = DockerUtils.parseComposeServices(output);
    expect(services).toHaveLength(2);
  });

  it("returns empty array for empty output", () => {
    expect(DockerUtils.parseComposeServices("")).toEqual([]);
  });
});

describe("DockerUtils.stateToCategory", () => {
  it("maps running state", () => {
    expect(DockerUtils.stateToCategory("running")).toBe("running");
  });

  it("maps exited/dead to stopped", () => {
    expect(DockerUtils.stateToCategory("exited")).toBe("stopped");
    expect(DockerUtils.stateToCategory("dead")).toBe("stopped");
  });

  it("maps paused state", () => {
    expect(DockerUtils.stateToCategory("paused")).toBe("paused");
  });

  it("maps other states to other", () => {
    expect(DockerUtils.stateToCategory("created")).toBe("other");
    expect(DockerUtils.stateToCategory("restarting")).toBe("other");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: New tests FAIL

**Step 3: Implement parsers in docker.js**

Add before the export block in `docker.js`:

```js
  // --- Output Parsers ---

  function parseNDJSON(output) {
    if (!output || !output.trim()) return [];
    var lines = output.trim().split("\n");
    var results = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      try {
        results.push(JSON.parse(line));
      } catch (_) {
        // skip malformed lines
      }
    }
    return results;
  }

  DockerUtils.parseContainers = function (output) {
    var raw = parseNDJSON(output);
    var containers = [];
    for (var i = 0; i < raw.length; i++) {
      var c = raw[i];
      containers.push({
        id: c.ID || "",
        name: c.Names || "",
        image: c.Image || "",
        state: (c.State || "").toLowerCase(),
        status: c.Status || "",
        ports: c.Ports || "",
      });
    }
    return containers;
  };

  DockerUtils.parseImages = function (output) {
    var raw = parseNDJSON(output);
    var images = [];
    for (var i = 0; i < raw.length; i++) {
      var img = raw[i];
      var repo = img.Repository || "";
      if (repo === "<none>" || repo === "\\u003cnone\\u003e") continue;
      images.push({
        id: img.ID || "",
        repository: repo,
        tag: img.Tag || "",
        size: img.Size || "",
        created: img.CreatedSince || "",
      });
    }
    return images;
  };

  DockerUtils.parseComposeServices = function (output) {
    if (!output || !output.trim()) return [];

    var raw;
    var trimmed = output.trim();

    // docker compose ps --format json may output a JSON array or NDJSON
    if (trimmed.charAt(0) === "[") {
      try {
        raw = JSON.parse(trimmed);
      } catch (_) {
        return [];
      }
    } else {
      raw = parseNDJSON(trimmed);
    }

    var services = [];
    for (var i = 0; i < raw.length; i++) {
      var s = raw[i];
      var ports = "";
      if (s.Publishers && s.Publishers.length > 0) {
        var parts = [];
        for (var j = 0; j < s.Publishers.length; j++) {
          var p = s.Publishers[j];
          parts.push(p.PublishedPort + ":" + p.TargetPort + "/" + (p.Protocol || "tcp"));
        }
        ports = parts.join(", ");
      }
      services.push({
        name: s.Name || "",
        service: s.Service || "",
        state: (s.State || "").toLowerCase(),
        status: s.Status || "",
        ports: ports,
      });
    }
    return services;
  };

  DockerUtils.stateToCategory = function (state) {
    switch (state) {
      case "running": return "running";
      case "exited":
      case "dead": return "stopped";
      case "paused": return "paused";
      default: return "other";
    }
  };
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add tests/docker.test.mjs plugins/forja-plugin-docker/docker.js
git commit -m "feat(docker): add output parsers for containers, images, and compose services"
```

---

## Task 5: Styles

**Files:**
- Modify: `plugins/forja-plugin-docker/styles.css`

**Step 1: Write complete styles**

Replace `styles.css` with the full stylesheet. Follow existing plugin conventions (forja-plugin-tasks/styles.css as reference):

```css
/* Forja Plugin: Docker Manager
 * MANDATORY: All colors via --forja-* CSS variables. */

:root {
  --radius: 6px;
  --radius-lg: 8px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--forja-bg-overlay); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--forja-text-muted); }

html { height: 100%; overflow: hidden; }

body {
  font-family: "Geist Sans", "Inter", system-ui, -apple-system, sans-serif;
  background: var(--forja-bg-base);
  color: var(--forja-text);
  font-size: 13px;
  line-height: 1.5;
  height: 100%;
  overflow: hidden;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
}

/* --- Header --- */

.plugin-header { margin-bottom: 10px; }

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plugin-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--forja-text);
}

.plugin-subtitle {
  font-size: 11px;
  color: var(--forja-text-muted);
}

.header-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--forja-success);
  background: var(--forja-bg-surface);
  padding: 2px 8px;
  border-radius: 10px;
  display: none;
}

.header-badge.visible { display: inline-block; }

/* --- Tabs --- */

.tab-bar {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--forja-bg-surface);
  border-radius: var(--radius-lg);
  margin-bottom: 10px;
}

.tab {
  flex: 1;
  padding: 5px 4px;
  border: none;
  border-radius: var(--radius);
  background: transparent;
  color: var(--forja-text-muted);
  font-size: 11px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tab:hover { color: var(--forja-text-sub); background: var(--forja-bg-overlay); }
.tab.active { background: var(--forja-bg-overlay); color: var(--forja-text); font-weight: 600; }

/* --- Panels --- */

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.filter-group { display: flex; gap: 2px; }

.filter-btn {
  padding: 3px 8px;
  border: none;
  border-radius: var(--radius);
  background: transparent;
  color: var(--forja-text-muted);
  font-size: 10px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.12s ease;
}

.filter-btn:hover { color: var(--forja-text-sub); background: var(--forja-bg-surface); }
.filter-btn.active { background: var(--forja-bg-overlay); color: var(--forja-text); }

.icon-btn {
  border: none;
  background: transparent;
  color: var(--forja-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
}

.icon-btn:hover { background: var(--forja-bg-surface); color: var(--forja-text-sub); }

/* --- Item list (shared between containers, images, compose) --- */

.item-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  margin-right: -4px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: var(--radius);
  transition: background 0.1s ease;
  cursor: default;
}

.list-item:hover { background: var(--forja-bg-surface); }

/* Status dot */
.status-dot {
  width: 7px;
  height: 7px;
  min-width: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.running { background: var(--forja-success); }
.status-dot.stopped { background: var(--forja-error); }
.status-dot.paused { background: var(--forja-warning); }
.status-dot.other { background: var(--forja-info); }

/* Item content */
.item-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.item-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--forja-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  font-size: 10px;
  color: var(--forja-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Item actions */
.item-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.1s ease;
}

.list-item:hover .item-actions { opacity: 1; }

.action-btn {
  border: none;
  background: transparent;
  color: var(--forja-text-muted);
  cursor: pointer;
  padding: 3px 5px;
  border-radius: 3px;
  font-size: 11px;
  font-family: inherit;
  transition: all 0.1s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover { background: var(--forja-bg-overlay); color: var(--forja-text); }
.action-btn.danger:hover { color: var(--forja-error); }

/* --- Image list extras --- */

.image-size {
  font-size: 10px;
  color: var(--forja-text-muted);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* --- Compose --- */

.compose-actions {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.btn {
  padding: 6px 14px;
  border-radius: var(--radius);
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-primary {
  background: var(--forja-accent);
  color: var(--forja-bg-base);
  border-color: var(--forja-accent);
}

.btn-primary:hover:not(:disabled) { background: var(--forja-accent-hover); }

.btn-ghost {
  background: transparent;
  color: var(--forja-text-sub);
  border-color: var(--forja-bg-overlay);
}

.btn-ghost:hover:not(:disabled) { background: var(--forja-bg-surface); }

.btn-small { padding: 4px 10px; font-size: 11px; }

/* --- Empty / Loading states --- */

.empty-state {
  text-align: center;
  padding: 32px 16px;
}

.empty-icon { font-size: 28px; margin-bottom: 6px; opacity: 0.5; }
.empty-title { font-size: 12px; font-weight: 500; color: var(--forja-text-sub); margin-bottom: 3px; }
.empty-description { font-size: 11px; color: var(--forja-text-muted); }

.loading-state {
  text-align: center;
  padding: 24px;
  font-size: 12px;
  color: var(--forja-text-muted);
}

/* --- Log Viewer (overlay) --- */

.log-viewer {
  position: absolute;
  inset: 0;
  background: var(--forja-bg-base);
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--forja-bg-overlay);
  flex-shrink: 0;
}

.log-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--forja-text);
}

.log-actions { display: flex; gap: 4px; }

.log-content {
  flex: 1;
  overflow: auto;
  padding: 10px 12px;
  font-family: "Geist Mono", "JetBrains Mono", "Fira Code", monospace;
  font-size: 11px;
  line-height: 1.6;
  color: var(--forja-text-sub);
  white-space: pre;
  tab-size: 4;
  margin: 0;
}

/* Spinning animation for refresh button */
@keyframes spin { to { transform: rotate(360deg); } }
.icon-btn.spinning svg { animation: spin 0.6s linear infinite; }
```

**Step 2: Commit**

```bash
git add plugins/forja-plugin-docker/styles.css
git commit -m "feat(docker): add complete styles using forja theme variables"
```

---

## Task 6: Application Logic - State, Tabs, Container List

**Files:**
- Modify: `plugins/forja-plugin-docker/app.js`

**Step 1: Implement the main application**

Replace `app.js` with the complete application:

```js
// =============================================
// Forja Plugin: Docker Manager
// Manages Docker containers, images, and Compose services.
//
// Requires docker.js (DockerUtils) to be loaded first.
// Theme integration is handled automatically by Forja's PluginHost.
// =============================================

(function () {
  "use strict";

  var DU = typeof DockerUtils !== "undefined" ? DockerUtils : {};
  var REFRESH_INTERVAL = 8000; // ms

  // --- State ---
  var state = {
    dockerAvailable: false,
    activeTab: "containers",
    filter: "all", // all | running | stopped
    containers: [],
    images: [],
    composeServices: [],
    hasComposeFile: false,
    projectPath: null,
    logContainer: null, // container name whose logs are shown
  };

  var refreshTimer = null;

  // --- DOM Refs ---
  var dockerStatus = document.getElementById("docker-status");
  var containerBadge = document.getElementById("container-badge");

  var tabs = document.querySelectorAll(".tab");
  var panels = {
    containers: document.getElementById("panel-containers"),
    images: document.getElementById("panel-images"),
    compose: document.getElementById("panel-compose"),
  };

  var filterBtns = document.querySelectorAll(".filter-btn");
  var btnRefresh = document.getElementById("btn-refresh");

  var containerList = document.getElementById("container-list");
  var containerEmpty = document.getElementById("container-empty");
  var containerLoading = document.getElementById("container-loading");

  var imageList = document.getElementById("image-list");
  var imageEmpty = document.getElementById("image-empty");

  var composeNoFile = document.getElementById("compose-no-file");
  var composeControls = document.getElementById("compose-controls");
  var composeServices = document.getElementById("compose-services");
  var btnComposeUp = document.getElementById("btn-compose-up");
  var btnComposeDown = document.getElementById("btn-compose-down");
  var btnComposeRestart = document.getElementById("btn-compose-restart");

  var logViewer = document.getElementById("log-viewer");
  var logTitle = document.getElementById("log-title");
  var logContent = document.getElementById("log-content");
  var btnLogRefresh = document.getElementById("btn-log-refresh");
  var btnLogClose = document.getElementById("btn-log-close");

  // --- Helpers ---

  function exec(cmd) {
    if (typeof forja === "undefined" || !forja.terminal) {
      return Promise.reject(new Error("forja.terminal not available"));
    }
    return forja.terminal.execute(cmd);
  }

  function escapeText(str) {
    return String(str || "");
  }

  // --- Docker availability check ---

  function checkDocker() {
    exec(DU.buildVersionCommand())
      .then(function (output) {
        state.dockerAvailable = true;
        dockerStatus.textContent = "Docker " + (output || "").trim();
        startRefreshLoop();
        refreshAll();
      })
      .catch(function () {
        state.dockerAvailable = false;
        dockerStatus.textContent = "Docker not available";
      });
  }

  // --- Data Fetching ---

  function fetchContainers() {
    return exec(DU.buildPsCommand({ all: true }))
      .then(function (output) {
        state.containers = DU.parseContainers(output || "");
        renderContainers();
        updateBadge();
      })
      .catch(function () {
        state.containers = [];
        renderContainers();
      });
  }

  function fetchImages() {
    return exec(DU.buildImagesCommand())
      .then(function (output) {
        state.images = DU.parseImages(output || "");
        renderImages();
      })
      .catch(function () {
        state.images = [];
        renderImages();
      });
  }

  function fetchComposeServices() {
    if (!state.hasComposeFile) return Promise.resolve();
    return exec(DU.buildComposeCommand("ps"))
      .then(function (output) {
        state.composeServices = DU.parseComposeServices(output || "");
        renderCompose();
      })
      .catch(function () {
        state.composeServices = [];
        renderCompose();
      });
  }

  function detectComposeFile() {
    if (!state.projectPath || typeof forja === "undefined") {
      state.hasComposeFile = false;
      renderCompose();
      return;
    }
    // Try common compose file names
    var files = ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"];
    var attempts = files.map(function (f) {
      return forja.fs.readFile(f)
        .then(function () { return true; })
        .catch(function () { return false; });
    });
    Promise.all(attempts).then(function (results) {
      state.hasComposeFile = results.some(function (r) { return r; });
      renderCompose();
      if (state.hasComposeFile) fetchComposeServices();
    });
  }

  function refreshAll() {
    if (!state.dockerAvailable) return;
    fetchContainers();
    if (state.activeTab === "images") fetchImages();
    if (state.activeTab === "compose") fetchComposeServices();
  }

  function startRefreshLoop() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(function () {
      if (!state.dockerAvailable) return;
      fetchContainers();
      if (state.activeTab === "compose" && state.hasComposeFile) {
        fetchComposeServices();
      }
    }, REFRESH_INTERVAL);
  }

  // --- Badge ---

  function updateBadge() {
    var running = 0;
    for (var i = 0; i < state.containers.length; i++) {
      if (state.containers[i].state === "running") running++;
    }

    if (running > 0) {
      containerBadge.textContent = running + " running";
      containerBadge.classList.add("visible");
    } else {
      containerBadge.classList.remove("visible");
    }

    // Sidebar badge
    if (typeof forja !== "undefined" && forja.sidebar) {
      try {
        forja.sidebar.setBadge(running > 0 ? String(running) : "");
      } catch (_) { /* ignore */ }
    }
  }

  // --- Rendering: Containers ---

  function renderContainers() {
    var filtered = state.containers;
    if (state.filter === "running") {
      filtered = filtered.filter(function (c) { return c.state === "running"; });
    } else if (state.filter === "stopped") {
      filtered = filtered.filter(function (c) { return c.state !== "running"; });
    }

    containerList.innerHTML = "";
    containerEmpty.style.display = filtered.length === 0 ? "" : "none";

    for (var i = 0; i < filtered.length; i++) {
      containerList.appendChild(createContainerEl(filtered[i]));
    }
  }

  function createContainerEl(container) {
    var el = document.createElement("div");
    el.className = "list-item";

    var dot = document.createElement("span");
    dot.className = "status-dot " + DU.stateToCategory(container.state);

    var info = document.createElement("div");
    info.className = "item-info";

    var name = document.createElement("div");
    name.className = "item-name";
    name.textContent = escapeText(container.name);

    var meta = document.createElement("div");
    meta.className = "item-meta";
    var metaParts = [escapeText(container.image)];
    if (container.ports) metaParts.push(escapeText(container.ports));
    meta.textContent = metaParts.join(" \u00b7 ");

    info.appendChild(name);
    info.appendChild(meta);

    var actions = document.createElement("div");
    actions.className = "item-actions";

    if (container.state === "running") {
      actions.appendChild(createActionBtn("Stop", "stop", container.name));
      actions.appendChild(createActionBtn("Restart", "restart", container.name));
    } else {
      actions.appendChild(createActionBtn("Start", "start", container.name));
    }
    actions.appendChild(createLogBtn(container.name));
    actions.appendChild(createActionBtn("Remove", "rm", container.name, true));

    el.appendChild(dot);
    el.appendChild(info);
    el.appendChild(actions);

    return el;
  }

  function createActionBtn(label, action, containerName, isDanger) {
    var btn = document.createElement("button");
    btn.className = "action-btn" + (isDanger ? " danger" : "");
    btn.textContent = label;
    btn.title = label + " " + containerName;
    btn.setAttribute("aria-label", label + " " + containerName);
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      execContainerAction(action, containerName);
    });
    return btn;
  }

  function createLogBtn(containerName) {
    var btn = document.createElement("button");
    btn.className = "action-btn";
    btn.textContent = "Logs";
    btn.title = "View logs for " + containerName;
    btn.setAttribute("aria-label", "View logs for " + containerName);
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      showLogs(containerName);
    });
    return btn;
  }

  function execContainerAction(action, containerName) {
    var cmd = DU.buildActionCommand(action, containerName);
    exec(cmd)
      .then(function () {
        // Show notification for destructive actions
        if (action === "rm" && typeof forja !== "undefined") {
          forja.notifications.show({
            title: "Container Removed",
            body: containerName + " has been removed",
          }).catch(function () { /* ignore */ });
        }
        // Refresh after action
        setTimeout(fetchContainers, 500);
      })
      .catch(function (err) {
        console.error("[Docker] Action failed:", action, containerName, err);
      });
  }

  // --- Rendering: Images ---

  function renderImages() {
    imageList.innerHTML = "";
    imageEmpty.style.display = state.images.length === 0 ? "" : "none";

    for (var i = 0; i < state.images.length; i++) {
      imageList.appendChild(createImageEl(state.images[i]));
    }
  }

  function createImageEl(image) {
    var el = document.createElement("div");
    el.className = "list-item";

    var info = document.createElement("div");
    info.className = "item-info";

    var name = document.createElement("div");
    name.className = "item-name";
    name.textContent = escapeText(image.repository) + ":" + escapeText(image.tag);

    var meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = escapeText(image.created);

    info.appendChild(name);
    info.appendChild(meta);

    var size = document.createElement("span");
    size.className = "image-size";
    size.textContent = escapeText(image.size);

    el.appendChild(info);
    el.appendChild(size);

    return el;
  }

  // --- Rendering: Compose ---

  function renderCompose() {
    composeNoFile.style.display = state.hasComposeFile ? "none" : "";
    composeControls.style.display = state.hasComposeFile ? "" : "none";

    if (!state.hasComposeFile) return;

    composeServices.innerHTML = "";
    for (var i = 0; i < state.composeServices.length; i++) {
      composeServices.appendChild(createComposeServiceEl(state.composeServices[i]));
    }
  }

  function createComposeServiceEl(service) {
    var el = document.createElement("div");
    el.className = "list-item";

    var dot = document.createElement("span");
    dot.className = "status-dot " + DU.stateToCategory(service.state);

    var info = document.createElement("div");
    info.className = "item-info";

    var name = document.createElement("div");
    name.className = "item-name";
    name.textContent = escapeText(service.service);

    var meta = document.createElement("div");
    meta.className = "item-meta";
    var metaParts = [escapeText(service.status)];
    if (service.ports) metaParts.push(escapeText(service.ports));
    meta.textContent = metaParts.join(" \u00b7 ");

    info.appendChild(name);
    info.appendChild(meta);

    el.appendChild(dot);
    el.appendChild(info);

    return el;
  }

  // --- Logs ---

  function showLogs(containerName) {
    state.logContainer = containerName;
    logTitle.textContent = "Logs: " + containerName;
    logContent.textContent = "Loading...";
    logViewer.style.display = "flex";

    fetchLogs(containerName);
  }

  function fetchLogs(containerName) {
    var cmd = DU.buildLogsCommand(containerName, { tail: 200 });
    exec(cmd)
      .then(function (output) {
        logContent.textContent = output || "(no logs)";
        logContent.scrollTop = logContent.scrollHeight;
      })
      .catch(function (err) {
        logContent.textContent = "Error fetching logs: " + err.message;
      });
  }

  function closeLogs() {
    state.logContainer = null;
    logViewer.style.display = "none";
    logContent.textContent = "";
  }

  // --- Compose Actions ---

  function execComposeAction(action) {
    var cmd = DU.buildComposeCommand(action);
    btnComposeUp.disabled = true;
    btnComposeDown.disabled = true;
    btnComposeRestart.disabled = true;

    exec(cmd)
      .then(function () {
        if (typeof forja !== "undefined") {
          forja.notifications.show({
            title: "Docker Compose",
            body: "compose " + action + " completed",
          }).catch(function () { /* ignore */ });
        }
        setTimeout(function () {
          fetchComposeServices();
          fetchContainers();
          btnComposeUp.disabled = false;
          btnComposeDown.disabled = false;
          btnComposeRestart.disabled = false;
        }, 1000);
      })
      .catch(function (err) {
        console.error("[Docker] Compose action failed:", action, err);
        btnComposeUp.disabled = false;
        btnComposeDown.disabled = false;
        btnComposeRestart.disabled = false;
      });
  }

  // --- Tab switching ---

  function switchTab(tabName) {
    state.activeTab = tabName;

    tabs.forEach(function (t) {
      var isActive = t.getAttribute("data-tab") === tabName;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    Object.keys(panels).forEach(function (key) {
      panels[key].style.display = key === tabName ? "" : "none";
    });

    // Lazy-load data for tab
    if (tabName === "images" && state.images.length === 0) {
      fetchImages();
    }
    if (tabName === "compose") {
      detectComposeFile();
    }
  }

  // --- Event Handlers ---

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      switchTab(this.getAttribute("data-tab"));
    });
  });

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.filter = this.getAttribute("data-filter");
      filterBtns.forEach(function (b) { b.classList.remove("active"); });
      this.classList.add("active");
      renderContainers();
    });
  });

  btnRefresh.addEventListener("click", function () {
    btnRefresh.classList.add("spinning");
    refreshAll();
    setTimeout(function () { btnRefresh.classList.remove("spinning"); }, 600);
  });

  btnLogRefresh.addEventListener("click", function () {
    if (state.logContainer) fetchLogs(state.logContainer);
  });

  btnLogClose.addEventListener("click", closeLogs);

  btnComposeUp.addEventListener("click", function () { execComposeAction("up"); });
  btnComposeDown.addEventListener("click", function () { execComposeAction("down"); });
  btnComposeRestart.addEventListener("click", function () { execComposeAction("restart"); });

  // Keyboard: Escape closes log viewer
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && state.logContainer) {
      closeLogs();
    }
  });

  // --- Forja Integration ---

  if (typeof forja !== "undefined") {
    forja.project.getActive()
      .then(function (project) {
        if (project && project.path) {
          state.projectPath = project.path;
        }
        checkDocker();
      })
      .catch(function () {
        checkDocker();
      });

    forja.on("project-changed", function (payload) {
      state.projectPath = payload.path || null;
      if (state.activeTab === "compose") {
        detectComposeFile();
      }
    });
  } else {
    console.warn("[Docker Manager] forja API not available");
    dockerStatus.textContent = "Forja API unavailable";
  }

  // --- Cleanup on unload ---
  window.addEventListener("beforeunload", function () {
    if (refreshTimer) clearInterval(refreshTimer);
  });
})();
```

**Step 2: Commit**

```bash
git add plugins/forja-plugin-docker/app.js
git commit -m "feat(docker): implement main application with containers, images, compose, and logs"
```

---

## Task 7: Validate and Build Registry

**Files:**
- Modify: `public/registry.json` (generated)

**Step 1: Run validation**

Run: `pnpm run validate`
Expected: All 3 plugins pass validation

**Step 2: Build registry**

Run: `pnpm run build:registry`
Expected: `public/registry.json` updated with `forja-plugin-docker` entry

**Step 3: Verify registry**

Run: `node -e "const r = require('./public/registry.json'); console.log(r.plugins.map(p => p.name))"`
Expected: Array contains `forja-plugin-docker`

**Step 4: Run all tests**

Run: `pnpm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add public/registry.json
git commit -m "chore(docker): update registry with docker plugin entry"
```

---

## Task 8: Final Review and Polish

**Step 1: Verify all files exist**

```
plugins/forja-plugin-docker/
  manifest.json
  index.html
  styles.css
  docker.js
  app.js
tests/
  docker.test.mjs
```

**Step 2: Verify full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 3: Verify validation**

Run: `pnpm run validate`
Expected: All 3 plugins valid

**Step 4: Manual checklist**

- [ ] manifest.json version matches package.json (1.0.6)
- [ ] All CSS uses `--forja-*` variables, no hardcoded colors
- [ ] No `innerHTML` assignments with user/docker data (XSS safe)
- [ ] All docker commands built via `DockerUtils` (no raw string interpolation)
- [ ] Container names validated via `assertSafeName` (injection safe)
- [ ] `typeof forja !== "undefined"` guard before all API calls
- [ ] Log viewer uses `textContent` (not `innerHTML`) for output

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(docker): complete Docker Manager plugin with container, image, and compose management"
```

---

## Summary

| Task | Description | Test Coverage |
|------|-------------|---------------|
| 1 | vitest setup | Infrastructure |
| 2 | Plugin scaffold (manifest, HTML, stubs) | Manifest validation |
| 3 | Command builders (TDD) | 12 tests |
| 4 | Output parsers (TDD) | 12 tests |
| 5 | Complete CSS styles | Visual |
| 6 | Main application (state, render, events, Forja API) | Integration |
| 7 | Validate + build registry | Validation script |
| 8 | Final review + polish | Manual checklist |

**Permissions required:** `terminal.execute` (Critical), `project.active`, `fs.read`, `theme.current`, `notifications`

**Security measures:**
- Command whitelist (only `docker` subcommands: ps, start, stop, restart, rm, logs, images, compose)
- Container name validation regex (rejects shell metacharacters: `;`, `$`, `|`, `&`, backticks)
- Output rendered via `textContent` only (no XSS vectors)
- No `eval`, `Function`, or `innerHTML` with dynamic data
