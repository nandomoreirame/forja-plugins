// =============================================
// Forja Plugin: Git Manager
// Visual branch graph, commit history, diff viewer, and branch management.
//
// Theme integration is handled automatically by Forja's PluginHost.
// All --forja-* CSS variables are injected on load and updated on
// theme changes. Plugins should NOT manually apply theme colors.
// =============================================

(function () {
  "use strict";

  // --- Constants ---
  var POLL_INTERVAL = 5000;
  var HISTORY_LIMIT = 50;

  // --- State ---
  var state = {
    activeTab: "branches",
    loading: false,
    error: null,
    projectPath: null,
    projectName: null,
    hasGit: false,
    branches: {
      local: [],
      remote: [],
      current: "",
    },
    history: {
      commits: [],
      expandedHash: null,
      limit: HISTORY_LIMIT,
    },
    changes: {
      staged: [],
      unstaged: [],
      untracked: [],
      dirtyCount: 0,
      isClean: true,
      selectedFile: null,
      selectedDiff: null,
    },
    graph: {
      nodes: [],
      edges: [],
      maxColumns: 0,
    },
  };

  var pollTimer = null;
  var renderGuard = 0;

  // --- DOM refs ---
  var dom = {
    app: document.getElementById("app"),
    projectName: document.getElementById("project-name"),
    currentBranchBadge: document.getElementById("current-branch-badge"),
    tabs: document.querySelectorAll(".tab"),
    panelBranches: document.getElementById("panel-branches"),
    panelHistory: document.getElementById("panel-history"),
    panelChanges: document.getElementById("panel-changes"),
    branchGraphSvg: document.getElementById("branch-graph-svg"),
    branchList: document.getElementById("branch-list"),
    branchCreateForm: document.getElementById("branch-create-form"),
    branchNameInput: document.getElementById("branch-name-input"),
    historyRefreshBtn: document.getElementById("history-refresh-btn"),
    commitList: document.getElementById("commit-list"),
    historyEmpty: document.getElementById("history-empty"),
    changesRefreshBtn: document.getElementById("changes-refresh-btn"),
    changesContent: document.getElementById("changes-content"),
    stagedSection: document.getElementById("staged-section"),
    stagedCount: document.getElementById("staged-count"),
    stagedList: document.getElementById("staged-list"),
    unstagedSection: document.getElementById("unstaged-section"),
    unstagedCount: document.getElementById("unstaged-count"),
    unstagedList: document.getElementById("unstaged-list"),
    untrackedSection: document.getElementById("untracked-section"),
    untrackedCount: document.getElementById("untracked-count"),
    untrackedList: document.getElementById("untracked-list"),
    diffViewer: document.getElementById("diff-viewer"),
    diffFilename: document.getElementById("diff-filename"),
    diffCloseBtn: document.getElementById("diff-close-btn"),
    diffContent: document.getElementById("diff-content"),
    changesEmpty: document.getElementById("changes-empty"),
    noProjectState: document.getElementById("no-project-state"),
    noGitState: document.getElementById("no-git-state"),
    loadingState: document.getElementById("loading-state"),
    confirmDialog: document.getElementById("confirm-dialog"),
    confirmMessage: document.getElementById("confirm-message"),
    confirmYesBtn: document.getElementById("confirm-yes-btn"),
    confirmNoBtn: document.getElementById("confirm-no-btn"),
    statusRegion: document.getElementById("status-region"),
  };

  // --- Git API wrapper ---
  var gitApi = {
    available: typeof forja !== "undefined",

    getStatus: function () {
      if (!gitApi.available) return Promise.resolve(null);
      return forja.git.status().catch(function () { return null; });
    },

    getLog: function (limit) {
      if (!gitApi.available) return Promise.resolve(null);
      return forja.git.log({ limit: limit || HISTORY_LIMIT }).catch(function () { return null; });
    },

    getDiff: function (file) {
      if (!gitApi.available) return Promise.resolve(null);
      return forja.git.diff({ file: file }).catch(function () { return null; });
    },

    execute: function (cmd) {
      if (!gitApi.available) return Promise.reject(new Error("Forja API not available"));
      return forja.terminal.execute(cmd);
    },

    notify: function (title, body) {
      if (!gitApi.available) return;
      forja.notifications.show({ title: title, body: body }).catch(function () {});
    },

    setBadge: function (text) {
      if (!gitApi.available || !forja.sidebar) return;
      try { forja.sidebar.setBadge(text); } catch (_) {}
    },

    getProject: function () {
      if (!gitApi.available) return Promise.resolve(null);
      return forja.project.getActive().catch(function () { return null; });
    },
  };

  // --- Announce to screen readers ---
  function announce(message) {
    if (dom.statusRegion) {
      dom.statusRegion.textContent = message;
    }
  }

  // --- Tab switching ---
  function switchTab(tabName) {
    state.activeTab = tabName;
    var panels = { branches: dom.panelBranches, history: dom.panelHistory, changes: dom.panelChanges };

    for (var i = 0; i < dom.tabs.length; i++) {
      var tab = dom.tabs[i];
      var isActive = tab.getAttribute("data-tab") === tabName;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    }

    var panelKeys = Object.keys(panels);
    for (var j = 0; j < panelKeys.length; j++) {
      var panel = panels[panelKeys[j]];
      if (panel) {
        if (panelKeys[j] === tabName) {
          panel.removeAttribute("hidden");
        } else {
          panel.setAttribute("hidden", "");
        }
      }
    }

    refreshActivePanel();
  }

  for (var t = 0; t < dom.tabs.length; t++) {
    (function (tab) {
      tab.addEventListener("click", function () {
        switchTab(tab.getAttribute("data-tab"));
      });
    })(dom.tabs[t]);
  }

  // --- Keyboard navigation ---
  var tabNames = ["branches", "history", "changes"];

  document.addEventListener("keydown", function (e) {
    // Escape closes diff viewer or confirm dialog
    if (e.key === "Escape") {
      if (!dom.confirmDialog.hasAttribute("hidden")) {
        hideConfirm();
        return;
      }
      if (!dom.diffViewer.hasAttribute("hidden")) {
        closeDiff();
        return;
      }
    }

    // Arrow keys for tab navigation when a tab is focused
    if (e.target && e.target.classList && e.target.classList.contains("tab")) {
      var currentIdx = tabNames.indexOf(e.target.getAttribute("data-tab"));
      if (currentIdx === -1) return;

      var nextIdx = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        nextIdx = (currentIdx + 1) % tabNames.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        nextIdx = (currentIdx - 1 + tabNames.length) % tabNames.length;
      }

      if (nextIdx !== -1) {
        e.preventDefault();
        switchTab(tabNames[nextIdx]);
        dom.tabs[nextIdx].focus();
      }
    }
  });

  // --- Global state rendering ---
  function updateGlobalStates() {
    dom.projectName.textContent = state.projectName || "No project";
    dom.currentBranchBadge.textContent = state.branches.current || "";

    var hasProject = !!state.projectPath;

    if (dom.noProjectState) {
      if (!hasProject) {
        dom.noProjectState.removeAttribute("hidden");
      } else {
        dom.noProjectState.setAttribute("hidden", "");
      }
    }
    if (dom.noGitState) {
      if (hasProject && !state.hasGit) {
        dom.noGitState.removeAttribute("hidden");
      } else {
        dom.noGitState.setAttribute("hidden", "");
      }
    }
    if (dom.loadingState) {
      if (state.loading) {
        dom.loadingState.removeAttribute("hidden");
      } else {
        dom.loadingState.setAttribute("hidden", "");
      }
    }

    // Hide panels when no project or no git
    var panelsVisible = hasProject && state.hasGit && !state.loading;
    var tabBar = document.querySelector(".tab-bar");
    if (tabBar) {
      tabBar.style.display = panelsVisible ? "" : "none";
    }
    if (dom.panelBranches) dom.panelBranches.style.display = panelsVisible && state.activeTab === "branches" ? "" : "none";
    if (dom.panelHistory) dom.panelHistory.style.display = panelsVisible && state.activeTab === "history" ? "" : "none";
    if (dom.panelChanges) dom.panelChanges.style.display = panelsVisible && state.activeTab === "changes" ? "" : "none";
  }

  // --- Refresh logic ---
  function refreshActivePanel() {
    if (!state.projectPath || !state.hasGit) return;

    var guard = ++renderGuard;

    if (state.activeTab === "changes") {
      renderChanges(guard);
    } else if (state.activeTab === "history") {
      renderHistory(guard);
    } else if (state.activeTab === "branches") {
      renderBranches(guard);
    }
  }

  function refreshStatus() {
    if (!state.projectPath) return;

    gitApi.getStatus().then(function (raw) {
      if (!raw) {
        state.hasGit = false;
        updateGlobalStates();
        return;
      }

      state.hasGit = true;
      var parsed = GitUtils.parseStatus(raw);
      state.changes.staged = parsed.staged;
      state.changes.unstaged = parsed.unstaged;
      state.changes.untracked = parsed.untracked;
      state.changes.dirtyCount = parsed.dirtyCount;
      state.changes.isClean = parsed.isClean;
      state.branches.current = parsed.branch;

      gitApi.setBadge(parsed.dirtyCount > 0 ? String(parsed.dirtyCount) : "");
      dom.currentBranchBadge.textContent = parsed.branch;

      updateGlobalStates();
    });
  }

  // --- Confirmation dialog ---
  var pendingConfirm = null;

  function showConfirm(message, onConfirm) {
    pendingConfirm = onConfirm;
    dom.confirmMessage.textContent = message;
    dom.confirmDialog.removeAttribute("hidden");
    dom.confirmYesBtn.focus();
  }

  function hideConfirm() {
    pendingConfirm = null;
    dom.confirmDialog.setAttribute("hidden", "");
  }

  dom.confirmYesBtn.addEventListener("click", function () {
    var fn = pendingConfirm;
    hideConfirm();
    if (fn) fn();
  });

  dom.confirmNoBtn.addEventListener("click", hideConfirm);

  // --- Status badge color class ---
  var STATUS_BADGE_CLASS = {
    M: "badge-modified",
    A: "badge-added",
    D: "badge-deleted",
    R: "badge-renamed",
    "?": "badge-untracked",
  };

  function createFileItem(file, isUntracked) {
    var el = document.createElement("div");
    el.className = "file-item";
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");

    var statusCode = isUntracked ? "?" : (file.status || "M");
    var badge = document.createElement("span");
    badge.className = "file-status-badge " + (STATUS_BADGE_CLASS[statusCode] || "");
    badge.textContent = statusCode;
    badge.title = GitUtils.statusLabel(statusCode);

    var name = document.createElement("span");
    name.className = "file-name";
    name.textContent = isUntracked ? file : file.path;

    el.appendChild(badge);
    el.appendChild(name);

    var filePath = isUntracked ? file : file.path;
    function openDiff() {
      state.changes.selectedFile = filePath;
      fetchAndShowDiff(filePath);
    }
    el.addEventListener("click", openDiff);
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDiff();
      }
    });

    return el;
  }

  function renderFileList(container, countEl, files, isUntracked) {
    container.textContent = "";
    if (countEl) countEl.textContent = files.length;
    for (var i = 0; i < files.length; i++) {
      container.appendChild(createFileItem(files[i], isUntracked));
    }
  }

  function renderChanges(guard) {
    gitApi.getStatus().then(function (raw) {
      if (guard !== renderGuard) return;

      var parsed = GitUtils.parseStatus(raw);
      state.changes.staged = parsed.staged;
      state.changes.unstaged = parsed.unstaged;
      state.changes.untracked = parsed.untracked;
      state.changes.dirtyCount = parsed.dirtyCount;
      state.changes.isClean = parsed.isClean;
      state.branches.current = parsed.branch;

      gitApi.setBadge(parsed.dirtyCount > 0 ? String(parsed.dirtyCount) : "");
      dom.currentBranchBadge.textContent = parsed.branch;

      // Staged
      if (parsed.staged.length > 0) {
        dom.stagedSection.removeAttribute("hidden");
        renderFileList(dom.stagedList, dom.stagedCount, parsed.staged, false);
      } else {
        dom.stagedSection.setAttribute("hidden", "");
      }

      // Unstaged
      if (parsed.unstaged.length > 0) {
        dom.unstagedSection.removeAttribute("hidden");
        renderFileList(dom.unstagedList, dom.unstagedCount, parsed.unstaged, false);
      } else {
        dom.unstagedSection.setAttribute("hidden", "");
      }

      // Untracked
      if (parsed.untracked.length > 0) {
        dom.untrackedSection.removeAttribute("hidden");
        renderFileList(dom.untrackedList, dom.untrackedCount, parsed.untracked, true);
      } else {
        dom.untrackedSection.setAttribute("hidden", "");
      }

      // Empty state
      if (parsed.isClean) {
        dom.changesEmpty.removeAttribute("hidden");
        dom.changesContent.setAttribute("hidden", "");
      } else {
        dom.changesEmpty.setAttribute("hidden", "");
        dom.changesContent.removeAttribute("hidden");
      }
    }).catch(function () {
      if (guard !== renderGuard) return;
      dom.changesEmpty.removeAttribute("hidden");
      dom.changesContent.setAttribute("hidden", "");
    });
  }

  // --- Diff viewer ---
  function fetchAndShowDiff(filePath) {
    dom.diffFilename.textContent = filePath;
    dom.diffContent.textContent = "Loading...";
    dom.diffViewer.removeAttribute("hidden");

    gitApi.getDiff(filePath).then(function (diffText) {
      if (!diffText) {
        dom.diffContent.textContent = "No diff available.";
        return;
      }

      renderDiff(diffText);
      announce("Diff loaded for " + filePath);
    }).catch(function () {
      dom.diffContent.textContent = "Failed to load diff.";
    });
  }

  function renderDiff(diffText) {
    dom.diffContent.textContent = "";

    var lines = GitUtils.parseDiffLines(diffText);

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var span = document.createElement("span");
      span.className = "diff-line diff-line-" + line.type;
      span.textContent = line.text;
      dom.diffContent.appendChild(span);
      dom.diffContent.appendChild(document.createTextNode("\n"));
    }
  }

  function closeDiff() {
    dom.diffViewer.setAttribute("hidden", "");
    state.changes.selectedFile = null;
    state.changes.selectedDiff = null;
  }

  dom.diffCloseBtn.addEventListener("click", closeDiff);

  // --- Refresh button handlers ---
  dom.changesRefreshBtn.addEventListener("click", function () {
    renderChanges(++renderGuard);
  });

  dom.historyRefreshBtn.addEventListener("click", function () {
    renderHistory(++renderGuard);
  });

  function renderHistory(guard) {
    gitApi.getLog(state.history.limit).then(function (raw) {
      if (guard !== renderGuard) return;

      var commits = GitUtils.parseLog(raw);
      state.history.commits = commits;

      dom.commitList.textContent = "";

      if (commits.length === 0) {
        dom.historyEmpty.removeAttribute("hidden");
        return;
      }

      dom.historyEmpty.setAttribute("hidden", "");

      for (var i = 0; i < commits.length; i++) {
        dom.commitList.appendChild(createCommitItem(commits[i]));
      }
    }).catch(function () {
      if (guard !== renderGuard) return;
      dom.historyEmpty.removeAttribute("hidden");
    });
  }

  function createCommitItem(commit) {
    var el = document.createElement("div");
    el.className = "commit-item";

    var summary = document.createElement("div");
    summary.className = "commit-summary";
    summary.setAttribute("role", "button");
    summary.setAttribute("tabindex", "0");
    summary.setAttribute("aria-expanded", "false");

    var hashSpan = document.createElement("span");
    hashSpan.className = "commit-hash";
    hashSpan.textContent = commit.shortHash;

    var msgSpan = document.createElement("span");
    msgSpan.className = "commit-message";
    msgSpan.textContent = commit.subject;

    var metaSpan = document.createElement("span");
    metaSpan.className = "commit-meta";

    var authorSpan = document.createElement("span");
    authorSpan.className = "commit-author";
    authorSpan.textContent = commit.author;

    var dateSpan = document.createElement("span");
    dateSpan.className = "commit-date";
    dateSpan.textContent = GitUtils.formatRelativeDate(commit.date);

    metaSpan.appendChild(authorSpan);
    metaSpan.appendChild(document.createTextNode(" \u00b7 "));
    metaSpan.appendChild(dateSpan);

    summary.appendChild(hashSpan);
    summary.appendChild(msgSpan);

    // Ref badges
    if (commit.refs) {
      var refs = commit.refs.split(",");
      for (var r = 0; r < refs.length; r++) {
        var refText = refs[r].trim();
        if (refText) {
          var refBadge = document.createElement("span");
          refBadge.className = "commit-ref-badge";
          refBadge.textContent = refText;
          summary.appendChild(refBadge);
        }
      }
    }

    summary.appendChild(metaSpan);

    // Detail (expandable)
    var detail = document.createElement("div");
    detail.className = "commit-detail";
    detail.setAttribute("hidden", "");

    var fullHash = document.createElement("div");
    fullHash.className = "commit-detail-row";
    var fullHashLabel = document.createElement("span");
    fullHashLabel.className = "commit-detail-label";
    fullHashLabel.textContent = "Hash: ";
    var fullHashValue = document.createElement("span");
    fullHashValue.className = "commit-detail-value";
    fullHashValue.textContent = commit.hash;
    fullHash.appendChild(fullHashLabel);
    fullHash.appendChild(fullHashValue);
    detail.appendChild(fullHash);

    if (commit.body) {
      var bodyEl = document.createElement("pre");
      bodyEl.className = "commit-detail-body";
      bodyEl.textContent = commit.body;
      detail.appendChild(bodyEl);
    }

    if (commit.isMerge) {
      var mergeEl = document.createElement("div");
      mergeEl.className = "commit-detail-row";
      var mergeLabel = document.createElement("span");
      mergeLabel.className = "commit-detail-label";
      mergeLabel.textContent = "Parents: ";
      var mergeValue = document.createElement("span");
      mergeValue.className = "commit-detail-value";
      mergeValue.textContent = commit.parentHashes.map(function (h) { return h.slice(0, 7); }).join(", ");
      mergeEl.appendChild(mergeLabel);
      mergeEl.appendChild(mergeValue);
      detail.appendChild(mergeEl);
    }

    // Toggle expand
    function toggleDetail() {
      var isHidden = detail.hasAttribute("hidden");
      if (isHidden) {
        detail.removeAttribute("hidden");
        summary.setAttribute("aria-expanded", "true");
        state.history.expandedHash = commit.hash;
      } else {
        detail.setAttribute("hidden", "");
        summary.setAttribute("aria-expanded", "false");
        state.history.expandedHash = null;
      }
    }

    summary.addEventListener("click", toggleDetail);
    summary.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleDetail();
      }
    });

    el.appendChild(summary);
    el.appendChild(detail);
    return el;
  }

  // --- SVG Graph constants ---
  var GRAPH_COLUMN_WIDTH = 16;
  var GRAPH_ROW_HEIGHT = 28;
  var GRAPH_NODE_RADIUS = 4;
  var GRAPH_COLORS = [
    "var(--forja-accent)",
    "var(--forja-magenta)",
    "var(--forja-cyan)",
    "var(--forja-green)",
    "var(--forja-yellow)",
    "var(--forja-blue)",
    "var(--forja-red)",
  ];

  function svgEl(tag, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (attrs) {
      var keys = Object.keys(attrs);
      for (var i = 0; i < keys.length; i++) {
        el.setAttribute(keys[i], attrs[keys[i]]);
      }
    }
    return el;
  }

  function renderSvgGraph(commits) {
    var layout = GitUtils.computeGraphLayout(commits);
    state.graph = layout;

    var svg = dom.branchGraphSvg;
    svg.textContent = "";

    if (layout.nodes.length === 0) return;

    var padLeft = 8;
    var padTop = 14;
    var width = padLeft + layout.maxColumns * GRAPH_COLUMN_WIDTH + 8;
    var height = padTop + layout.nodes.length * GRAPH_ROW_HEIGHT;

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);

    // Draw edges
    for (var e = 0; e < layout.edges.length; e++) {
      var edge = layout.edges[e];
      var x1 = padLeft + edge.fromColumn * GRAPH_COLUMN_WIDTH;
      var y1 = padTop + edge.fromRow * GRAPH_ROW_HEIGHT;
      var x2 = padLeft + edge.toColumn * GRAPH_COLUMN_WIDTH;
      var y2 = padTop + edge.toRow * GRAPH_ROW_HEIGHT;
      var color = GRAPH_COLORS[edge.toColumn % GRAPH_COLORS.length];

      var d;
      if (edge.fromColumn === edge.toColumn) {
        d = "M " + x1 + " " + y1 + " L " + x2 + " " + y2;
      } else {
        var midY = (y1 + y2) / 2;
        d = "M " + x1 + " " + y1 + " C " + x1 + " " + midY + " " + x2 + " " + midY + " " + x2 + " " + y2;
      }

      svg.appendChild(svgEl("path", {
        d: d,
        stroke: color,
        "stroke-width": "1.5",
        fill: "none",
      }));
    }

    // Draw nodes
    for (var n = 0; n < layout.nodes.length; n++) {
      var node = layout.nodes[n];
      var cx = padLeft + node.column * GRAPH_COLUMN_WIDTH;
      var cy = padTop + node.row * GRAPH_ROW_HEIGHT;
      var nodeColor = GRAPH_COLORS[node.column % GRAPH_COLORS.length];

      svg.appendChild(svgEl("circle", {
        cx: cx,
        cy: cy,
        r: GRAPH_NODE_RADIUS,
        fill: nodeColor,
      }));
    }
  }

  function renderBranches(guard) {
    // Fetch log for graph and status for branch list
    Promise.all([
      gitApi.getLog(state.history.limit),
      gitApi.getStatus(),
    ]).then(function (results) {
      if (guard !== renderGuard) return;

      var logRaw = results[0];
      var statusRaw = results[1];

      // Graph
      var commits = GitUtils.parseLog(logRaw);
      state.history.commits = commits;
      renderSvgGraph(commits);

      // Branch list
      var parsed = GitUtils.parseStatus(statusRaw);
      state.branches.current = parsed.branch;
      dom.currentBranchBadge.textContent = parsed.branch;

      dom.branchList.textContent = "";

      // Extract branch names from log refs
      var branchNames = [];
      var seen = {};
      for (var i = 0; i < commits.length; i++) {
        if (commits[i].refs) {
          var refs = commits[i].refs.split(",");
          for (var r = 0; r < refs.length; r++) {
            var ref = refs[r].trim();
            // Extract branch name from "HEAD -> branch" or just "branch"
            var arrowMatch = ref.match(/HEAD -> (.+)/);
            var name = arrowMatch ? arrowMatch[1] : ref;
            // Skip tags and remote tracking
            if (name && !name.startsWith("tag:") && !seen[name]) {
              seen[name] = true;
              branchNames.push(name);
            }
          }
        }
      }

      // Ensure current branch is always listed
      if (parsed.branch && !seen[parsed.branch]) {
        branchNames.unshift(parsed.branch);
      }

      for (var b = 0; b < branchNames.length; b++) {
        dom.branchList.appendChild(createBranchItem(branchNames[b], parsed.branch));
      }
    }).catch(function () {
      if (guard !== renderGuard) return;
      dom.branchList.textContent = "";
    });
  }

  function createBranchItem(name, currentBranch) {
    var el = document.createElement("div");
    el.className = "branch-item" + (name === currentBranch ? " branch-current" : "");

    var nameSpan = document.createElement("span");
    nameSpan.className = "branch-name";
    nameSpan.textContent = name;

    var actions = document.createElement("div");
    actions.className = "branch-actions";

    if (name !== currentBranch) {
      var switchBtn = document.createElement("button");
      switchBtn.type = "button";
      switchBtn.className = "btn btn-ghost btn-small";
      switchBtn.textContent = "Switch";
      switchBtn.setAttribute("aria-label", "Switch to " + name);
      switchBtn.addEventListener("click", function () {
        switchToBranch(name);
      });
      actions.appendChild(switchBtn);

      var deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-ghost btn-small btn-danger";
      deleteBtn.textContent = "Delete";
      deleteBtn.setAttribute("aria-label", "Delete branch " + name);
      deleteBtn.addEventListener("click", function () {
        deleteBranch(name);
      });
      actions.appendChild(deleteBtn);
    }

    el.appendChild(nameSpan);
    el.appendChild(actions);
    return el;
  }

  // --- Branch CRUD ---
  function switchToBranch(name) {
    var cmd = GitUtils.buildCheckoutCommand(name);
    gitApi.execute(cmd).then(function () {
      gitApi.notify("Branch Switched", "Now on " + name);
      announce("Switched to branch " + name);
      refreshAllPanels();
    }).catch(function (err) {
      gitApi.notify("Switch Failed", err.message || "Could not switch branch.");
      announce("Failed to switch branch");
    });
  }

  function deleteBranch(name) {
    showConfirm("Delete branch \"" + name + "\"?", function () {
      var cmd = GitUtils.buildDeleteBranchCommand(name, false);
      gitApi.execute(cmd).then(function () {
        gitApi.notify("Branch Deleted", name + " has been deleted.");
        announce("Deleted branch " + name);
        refreshAllPanels();
      }).catch(function () {
        // Try force delete
        var forceCmd = GitUtils.buildDeleteBranchCommand(name, true);
        gitApi.execute(forceCmd).then(function () {
          gitApi.notify("Branch Deleted", name + " has been force-deleted.");
          announce("Force-deleted branch " + name);
          refreshAllPanels();
        }).catch(function (err) {
          gitApi.notify("Delete Failed", err.message || "Could not delete branch.");
          announce("Failed to delete branch");
        });
      });
    });
  }

  dom.branchCreateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = dom.branchNameInput.value.trim();
    if (!name) return;

    if (!GitUtils.isValidBranchName(name)) {
      gitApi.notify("Invalid Name", "Branch name contains invalid characters.");
      announce("Invalid branch name");
      return;
    }

    var cmd = GitUtils.buildCreateBranchCommand(name);
    gitApi.execute(cmd).then(function () {
      gitApi.notify("Branch Created", "Created and switched to " + name);
      announce("Created branch " + name);
      dom.branchNameInput.value = "";
      refreshAllPanels();
    }).catch(function (err) {
      gitApi.notify("Create Failed", err.message || "Could not create branch.");
      announce("Failed to create branch");
    });
  });

  function refreshAllPanels() {
    refreshStatus();
    refreshActivePanel();
  }

  // --- Poll ---
  function startPoll() {
    stopPoll();
    pollTimer = setInterval(refreshStatus, POLL_INTERVAL);
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // --- Init ---
  function init(project) {
    if (project && project.path) {
      state.projectPath = project.path;
      state.projectName = project.name || null;
      state.loading = true;
      updateGlobalStates();

      gitApi.getStatus().then(function (raw) {
        state.loading = false;
        if (!raw) {
          state.hasGit = false;
          updateGlobalStates();
          return;
        }

        state.hasGit = true;
        var parsed = GitUtils.parseStatus(raw);
        state.changes.staged = parsed.staged;
        state.changes.unstaged = parsed.unstaged;
        state.changes.untracked = parsed.untracked;
        state.changes.dirtyCount = parsed.dirtyCount;
        state.changes.isClean = parsed.isClean;
        state.branches.current = parsed.branch;

        gitApi.setBadge(parsed.dirtyCount > 0 ? String(parsed.dirtyCount) : "");

        updateGlobalStates();
        switchTab(state.activeTab);
        startPoll();
      }).catch(function (err) {
        state.loading = false;
        state.hasGit = false;
        state.error = err.message || "Failed to load git status";
        updateGlobalStates();
      });
    } else {
      state.loading = false;
      updateGlobalStates();
    }
  }

  if (gitApi.available) {
    gitApi.getProject().then(function (project) {
      init(project);
    });

    forja.on("project-changed", function (payload) {
      stopPoll();
      state.projectPath = payload.path || null;
      state.projectName = payload.name || null;
      state.hasGit = false;
      state.branches = { local: [], remote: [], current: "" };
      state.history = { commits: [], expandedHash: null, limit: HISTORY_LIMIT };
      state.changes = { staged: [], unstaged: [], untracked: [], dirtyCount: 0, isClean: true, selectedFile: null, selectedDiff: null };
      state.graph = { nodes: [], edges: [], maxColumns: 0 };
      init(payload);
    });
  } else {
    updateGlobalStates();
  }

  window.addEventListener("beforeunload", function () {
    stopPoll();
  });
})();
