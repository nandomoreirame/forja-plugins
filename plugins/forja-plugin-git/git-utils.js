// =============================================
// Forja Plugin: Git Manager - Utilities
// Pure functions for parsing, validation, and command building.
// UMD-lite export: works in browser (global) and Node (module.exports).
// =============================================

(function (root, factory) {
  var utils = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = utils;
  } else {
    root.GitUtils = utils;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var GitUtils = {};

  GitUtils.parseStatus = function (statusData) {
    if (!statusData) {
      return {
        staged: [],
        unstaged: [],
        untracked: [],
        branch: "",
        dirtyCount: 0,
        isClean: true,
      };
    }

    var staged = statusData.staged || [];
    var unstaged = statusData.unstaged || [];
    var untracked = statusData.untracked || [];
    var dirtyCount = staged.length + unstaged.length + untracked.length;

    return {
      staged: staged,
      unstaged: unstaged,
      untracked: untracked,
      branch: statusData.branch || "",
      dirtyCount: dirtyCount,
      isClean: dirtyCount === 0,
    };
  };

  GitUtils.shortHash = function (hash) {
    if (!hash) return "";
    return hash.slice(0, 7);
  };

  GitUtils.parseLog = function (logData) {
    if (!logData || !logData.length) return [];

    return logData.map(function (entry) {
      var parents = entry.parents ? entry.parents.trim().split(/\s+/) : [];
      if (parents.length === 1 && parents[0] === "") parents = [];

      return {
        hash: entry.hash || "",
        shortHash: GitUtils.shortHash(entry.hash),
        author: entry.author || "",
        date: entry.date || "",
        subject: entry.subject || "",
        body: entry.body || "",
        refs: entry.refs || "",
        parentHashes: parents,
        isMerge: parents.length > 1,
      };
    });
  };

  var STATUS_MAP = {
    M: "Modified",
    A: "Added",
    D: "Deleted",
    R: "Renamed",
    C: "Copied",
    "?": "Untracked",
  };

  GitUtils.statusLabel = function (code) {
    if (!code) return "";
    return STATUS_MAP[code] || code;
  };

  GitUtils.formatRelativeDate = function (dateStr) {
    if (!dateStr) return "";

    var now = Date.now();
    var then = new Date(dateStr).getTime();
    var diffSec = Math.floor((now - then) / 1000);

    if (diffSec < 60) return "just now";

    var diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + " min ago";

    var diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return diffHours + (diffHours === 1 ? " hour ago" : " hours ago");

    var diffDays = Math.floor(diffHours / 24);
    return diffDays + (diffDays === 1 ? " day ago" : " days ago");
  };

  var DANGEROUS_CHARS = /[;|&$`\s\\'"()<>{}!\x00-\x1f\x7f]/;
  var DOUBLE_DOT = /\.\./;

  GitUtils.isValidBranchName = function (name) {
    if (!name || typeof name !== "string") return false;
    if (DANGEROUS_CHARS.test(name)) return false;
    if (DOUBLE_DOT.test(name)) return false;
    return true;
  };

  function assertValidRef(name, label) {
    if (!GitUtils.isValidBranchName(name)) {
      throw new Error("Invalid " + (label || "branch") + " name: " + name);
    }
  }

  GitUtils.buildCheckoutCommand = function (name) {
    assertValidRef(name, "branch");
    return "git checkout " + name;
  };

  GitUtils.buildCreateBranchCommand = function (name, startPoint) {
    assertValidRef(name, "branch");
    if (startPoint) {
      assertValidRef(startPoint, "start point");
      return "git checkout -b " + name + " " + startPoint;
    }
    return "git checkout -b " + name;
  };

  GitUtils.buildDeleteBranchCommand = function (name, force) {
    assertValidRef(name, "branch");
    return "git branch " + (force ? "-D" : "-d") + " " + name;
  };

  GitUtils.computeGraphLayout = function (commits) {
    if (!commits || !commits.length) {
      return { nodes: [], edges: [], maxColumns: 0 };
    }

    var nodes = [];
    var edges = [];
    var lanes = []; // each lane holds the hash it expects next
    var hashToRow = {};
    var maxColumns = 0;

    for (var i = 0; i < commits.length; i++) {
      var commit = commits[i];
      var hash = commit.hash;
      var parents = commit.parentHashes || [];

      // Find which lane this commit belongs to
      var column = -1;
      for (var l = 0; l < lanes.length; l++) {
        if (lanes[l] === hash) {
          column = l;
          break;
        }
      }

      // If not found in any lane, allocate a new one
      if (column === -1) {
        column = lanes.length;
        lanes.push(hash);
      }

      hashToRow[hash] = i;
      nodes.push({ hash: hash, row: i, column: column });

      if (column + 1 > maxColumns) {
        maxColumns = column + 1;
      }

      // First parent continues in the same lane
      if (parents.length > 0) {
        lanes[column] = parents[0];
        edges.push({
          fromColumn: column,
          fromRow: i,
          toColumn: column,
          toRow: i + 1,
        });
      } else {
        // No parents - free this lane
        lanes[column] = null;
      }

      // Additional parents get their own lanes
      for (var p = 1; p < parents.length; p++) {
        var parentHash = parents[p];
        // Check if parent is already expected in an existing lane
        var parentLane = -1;
        for (var pl = 0; pl < lanes.length; pl++) {
          if (lanes[pl] === parentHash) {
            parentLane = pl;
            break;
          }
        }

        if (parentLane === -1) {
          // Allocate new lane for this parent
          parentLane = lanes.length;
          lanes.push(parentHash);
        }

        if (parentLane + 1 > maxColumns) {
          maxColumns = parentLane + 1;
        }

        edges.push({
          fromColumn: column,
          fromRow: i,
          toColumn: parentLane,
          toRow: i + 1,
        });
      }
    }

    // Fix edges: update toRow to point at actual parent rows when known
    for (var e = 0; e < edges.length; e++) {
      var edge = edges[e];
      var fromNode = nodes[edge.fromRow];
      if (fromNode) {
        var fromCommit = commits[edge.fromRow];
        var parentIdx = edge.toColumn === fromNode.column ? 0 : -1;
        if (parentIdx === -1) {
          // Find which parent this edge connects to
          for (var pp = 1; pp < fromCommit.parentHashes.length; pp++) {
            if (hashToRow[fromCommit.parentHashes[pp]] !== undefined) {
              var pRow = hashToRow[fromCommit.parentHashes[pp]];
              var pNode = nodes[pRow];
              if (pNode && pNode.column === edge.toColumn) {
                edge.toRow = pRow;
                break;
              }
            }
          }
        } else {
          var firstParent = fromCommit.parentHashes[0];
          if (firstParent && hashToRow[firstParent] !== undefined) {
            edge.toRow = hashToRow[firstParent];
          }
        }
      }
    }

    return { nodes: nodes, edges: edges, maxColumns: maxColumns };
  };

  GitUtils.parseDiffLines = function (diffText) {
    if (!diffText) return [];

    var lines = diffText.split("\n");
    var result = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var type = "context";

      if (line.indexOf("@@") === 0) {
        type = "hunk";
      } else if (line.indexOf("+") === 0) {
        type = "add";
      } else if (line.indexOf("-") === 0) {
        type = "del";
      }

      result.push({ text: line, type: type });
    }

    return result;
  };

  return GitUtils;
});
