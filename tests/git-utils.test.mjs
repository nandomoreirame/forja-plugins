import { describe, it, expect } from "vitest";
import GitUtils from "../plugins/forja-plugin-git/git-utils.js";

describe("parseStatus", function () {
  it("parses status with staged, unstaged, and untracked files", function () {
    var statusData = {
      staged: [
        { path: "src/index.js", status: "M" },
        { path: "src/new.js", status: "A" },
      ],
      unstaged: [{ path: "README.md", status: "M" }],
      untracked: ["test.txt", "notes.md"],
      branch: "main",
    };

    var result = GitUtils.parseStatus(statusData);

    expect(result.staged).toEqual([
      { path: "src/index.js", status: "M" },
      { path: "src/new.js", status: "A" },
    ]);
    expect(result.unstaged).toEqual([{ path: "README.md", status: "M" }]);
    expect(result.untracked).toEqual(["test.txt", "notes.md"]);
    expect(result.branch).toBe("main");
    expect(result.dirtyCount).toBe(5);
    expect(result.isClean).toBe(false);
  });

  it("returns isClean true for clean status", function () {
    var statusData = {
      staged: [],
      unstaged: [],
      untracked: [],
      branch: "develop",
    };

    var result = GitUtils.parseStatus(statusData);

    expect(result.isClean).toBe(true);
    expect(result.dirtyCount).toBe(0);
    expect(result.branch).toBe("develop");
  });

  it("handles null input gracefully", function () {
    var result = GitUtils.parseStatus(null);

    expect(result.staged).toEqual([]);
    expect(result.unstaged).toEqual([]);
    expect(result.untracked).toEqual([]);
    expect(result.dirtyCount).toBe(0);
    expect(result.isClean).toBe(true);
    expect(result.branch).toBe("");
  });

  it("handles undefined input gracefully", function () {
    var result = GitUtils.parseStatus(undefined);

    expect(result.staged).toEqual([]);
    expect(result.unstaged).toEqual([]);
    expect(result.untracked).toEqual([]);
    expect(result.dirtyCount).toBe(0);
    expect(result.isClean).toBe(true);
  });
});

describe("shortHash", function () {
  it("truncates a 40-char hash to 7 characters", function () {
    expect(GitUtils.shortHash("abc1234def5678901234567890abcdef12345678")).toBe("abc1234");
  });

  it("returns the hash as-is if shorter than 7", function () {
    expect(GitUtils.shortHash("abc")).toBe("abc");
  });

  it("handles null input", function () {
    expect(GitUtils.shortHash(null)).toBe("");
  });

  it("handles empty string", function () {
    expect(GitUtils.shortHash("")).toBe("");
  });
});

describe("parseLog", function () {
  it("parses array of commit objects into structured data", function () {
    var logData = [
      {
        hash: "abc1234def5678901234567890abcdef12345678",
        author: "John Doe",
        date: "2025-01-15T10:30:00Z",
        subject: "feat: add login page",
        body: "Implements the login page with form validation.",
        refs: "HEAD -> main",
        parents: "def5678901234567890abcdef12345678abc12345",
      },
      {
        hash: "def5678901234567890abcdef12345678abc12345",
        author: "Jane Smith",
        date: "2025-01-14T09:00:00Z",
        subject: "fix: resolve crash on startup",
        body: "",
        refs: "",
        parents: "111222333444555666777888999000aaabbbcccddd",
      },
    ];

    var result = GitUtils.parseLog(logData);

    expect(result).toHaveLength(2);
    expect(result[0].hash).toBe("abc1234def5678901234567890abcdef12345678");
    expect(result[0].shortHash).toBe("abc1234");
    expect(result[0].subject).toBe("feat: add login page");
    expect(result[0].author).toBe("John Doe");
    expect(result[0].refs).toBe("HEAD -> main");
    expect(result[0].parentHashes).toEqual(["def5678901234567890abcdef12345678abc12345"]);
    expect(result[0].isMerge).toBe(false);
  });

  it("detects merge commits with multiple parents", function () {
    var logData = [
      {
        hash: "aaa1111222233334444555566667777888899990000",
        author: "Dev",
        date: "2025-01-16T12:00:00Z",
        subject: "Merge branch 'feature' into main",
        body: "",
        refs: "",
        parents: "bbb1111 ccc2222",
      },
    ];

    var result = GitUtils.parseLog(logData);

    expect(result[0].isMerge).toBe(true);
    expect(result[0].parentHashes).toEqual(["bbb1111", "ccc2222"]);
  });

  it("handles null input", function () {
    expect(GitUtils.parseLog(null)).toEqual([]);
  });

  it("handles empty array", function () {
    expect(GitUtils.parseLog([])).toEqual([]);
  });
});

describe("formatRelativeDate", function () {
  it("returns 'just now' for less than 60 seconds ago", function () {
    var now = new Date();
    var thirtySecsAgo = new Date(now.getTime() - 30 * 1000).toISOString();
    expect(GitUtils.formatRelativeDate(thirtySecsAgo)).toBe("just now");
  });

  it("returns 'N min ago' for minutes", function () {
    var now = new Date();
    var fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    expect(GitUtils.formatRelativeDate(fiveMinAgo)).toBe("5 min ago");
  });

  it("returns 'N hours ago' for hours", function () {
    var now = new Date();
    var threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(GitUtils.formatRelativeDate(threeHoursAgo)).toBe("3 hours ago");
  });

  it("returns '1 hour ago' for singular", function () {
    var now = new Date();
    var oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
    expect(GitUtils.formatRelativeDate(oneHourAgo)).toBe("1 hour ago");
  });

  it("returns 'N days ago' for days", function () {
    var now = new Date();
    var twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(GitUtils.formatRelativeDate(twoDaysAgo)).toBe("2 days ago");
  });

  it("returns '1 day ago' for singular", function () {
    var now = new Date();
    var oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
    expect(GitUtils.formatRelativeDate(oneDayAgo)).toBe("1 day ago");
  });

  it("handles null input", function () {
    expect(GitUtils.formatRelativeDate(null)).toBe("");
  });

  it("handles empty string", function () {
    expect(GitUtils.formatRelativeDate("")).toBe("");
  });
});

describe("statusLabel", function () {
  it("maps M to Modified", function () {
    expect(GitUtils.statusLabel("M")).toBe("Modified");
  });

  it("maps A to Added", function () {
    expect(GitUtils.statusLabel("A")).toBe("Added");
  });

  it("maps D to Deleted", function () {
    expect(GitUtils.statusLabel("D")).toBe("Deleted");
  });

  it("maps R to Renamed", function () {
    expect(GitUtils.statusLabel("R")).toBe("Renamed");
  });

  it("maps ? to Untracked", function () {
    expect(GitUtils.statusLabel("?")).toBe("Untracked");
  });

  it("returns the code itself for unknown status", function () {
    expect(GitUtils.statusLabel("X")).toBe("X");
  });

  it("handles null input", function () {
    expect(GitUtils.statusLabel(null)).toBe("");
  });
});

describe("isValidBranchName", function () {
  it("accepts standard branch names", function () {
    expect(GitUtils.isValidBranchName("main")).toBe(true);
    expect(GitUtils.isValidBranchName("develop")).toBe(true);
    expect(GitUtils.isValidBranchName("my-branch")).toBe(true);
    expect(GitUtils.isValidBranchName("my_branch")).toBe(true);
  });

  it("accepts feature/* style names", function () {
    expect(GitUtils.isValidBranchName("feature/login")).toBe(true);
    expect(GitUtils.isValidBranchName("bugfix/fix-crash")).toBe(true);
  });

  it("rejects empty or null", function () {
    expect(GitUtils.isValidBranchName("")).toBe(false);
    expect(GitUtils.isValidBranchName(null)).toBe(false);
    expect(GitUtils.isValidBranchName(undefined)).toBe(false);
  });

  it("rejects names with spaces", function () {
    expect(GitUtils.isValidBranchName("my branch")).toBe(false);
  });

  it("rejects shell metacharacters", function () {
    expect(GitUtils.isValidBranchName("branch;rm -rf")).toBe(false);
    expect(GitUtils.isValidBranchName("branch|cat")).toBe(false);
    expect(GitUtils.isValidBranchName("branch&bg")).toBe(false);
    expect(GitUtils.isValidBranchName("branch$VAR")).toBe(false);
    expect(GitUtils.isValidBranchName("branch`cmd`")).toBe(false);
  });

  it("rejects double dots", function () {
    expect(GitUtils.isValidBranchName("branch..lock")).toBe(false);
  });
});

describe("buildCheckoutCommand", function () {
  it("returns git checkout command for valid name", function () {
    expect(GitUtils.buildCheckoutCommand("main")).toBe("git checkout main");
  });

  it("throws for invalid branch name", function () {
    expect(function () {
      GitUtils.buildCheckoutCommand("bad;name");
    }).toThrow();
  });
});

describe("buildCreateBranchCommand", function () {
  it("returns git checkout -b for valid name", function () {
    expect(GitUtils.buildCreateBranchCommand("feature/new")).toBe("git checkout -b feature/new");
  });

  it("includes start point when provided", function () {
    expect(GitUtils.buildCreateBranchCommand("feature/new", "main")).toBe("git checkout -b feature/new main");
  });

  it("throws for invalid branch name", function () {
    expect(function () {
      GitUtils.buildCreateBranchCommand("bad|name");
    }).toThrow();
  });

  it("throws for invalid start point", function () {
    expect(function () {
      GitUtils.buildCreateBranchCommand("good-name", "bad;start");
    }).toThrow();
  });
});

describe("buildDeleteBranchCommand", function () {
  it("returns git branch -d for valid name", function () {
    expect(GitUtils.buildDeleteBranchCommand("old-branch")).toBe("git branch -d old-branch");
  });

  it("returns git branch -D when force is true", function () {
    expect(GitUtils.buildDeleteBranchCommand("old-branch", true)).toBe("git branch -D old-branch");
  });

  it("throws for invalid branch name", function () {
    expect(function () {
      GitUtils.buildDeleteBranchCommand("bad$name");
    }).toThrow();
  });
});

describe("parseDiffLines", function () {
  it("parses unified diff into annotated lines", function () {
    var diffText = [
      "@@ -1,3 +1,4 @@",
      " line one",
      "-old line",
      "+new line",
      "+added line",
      " line three",
    ].join("\n");

    var result = GitUtils.parseDiffLines(diffText);

    expect(result).toEqual([
      { text: "@@ -1,3 +1,4 @@", type: "hunk" },
      { text: " line one", type: "context" },
      { text: "-old line", type: "del" },
      { text: "+new line", type: "add" },
      { text: "+added line", type: "add" },
      { text: " line three", type: "context" },
    ]);
  });

  it("identifies @@ hunk headers", function () {
    var diffText = "@@ -10,5 +10,7 @@ function foo() {";
    var result = GitUtils.parseDiffLines(diffText);
    expect(result[0].type).toBe("hunk");
  });

  it("handles empty input", function () {
    expect(GitUtils.parseDiffLines("")).toEqual([]);
    expect(GitUtils.parseDiffLines(null)).toEqual([]);
    expect(GitUtils.parseDiffLines(undefined)).toEqual([]);
  });
});

describe("computeGraphLayout", function () {
  it("assigns linear history to column 0", function () {
    var commits = [
      { hash: "aaa", parentHashes: ["bbb"] },
      { hash: "bbb", parentHashes: ["ccc"] },
      { hash: "ccc", parentHashes: [] },
    ];

    var result = GitUtils.computeGraphLayout(commits);

    expect(result.nodes).toHaveLength(3);
    expect(result.nodes[0]).toEqual({ hash: "aaa", row: 0, column: 0 });
    expect(result.nodes[1]).toEqual({ hash: "bbb", row: 1, column: 0 });
    expect(result.nodes[2]).toEqual({ hash: "ccc", row: 2, column: 0 });
    expect(result.maxColumns).toBe(1);
    expect(result.edges.length).toBeGreaterThan(0);
  });

  it("handles branching history with merge commit", function () {
    // Merge commit has two parents -> second parent goes to another column
    var commits = [
      { hash: "merge", parentHashes: ["p1", "p2"] },
      { hash: "p1", parentHashes: ["base"] },
      { hash: "p2", parentHashes: ["base"] },
      { hash: "base", parentHashes: [] },
    ];

    var result = GitUtils.computeGraphLayout(commits);

    expect(result.nodes).toHaveLength(4);
    expect(result.maxColumns).toBeGreaterThanOrEqual(2);

    // merge commit should be at column 0
    expect(result.nodes[0].column).toBe(0);

    // There should be edges connecting merge to both parents
    var mergeEdges = result.edges.filter(function (e) {
      return e.fromRow === 0;
    });
    expect(mergeEdges.length).toBe(2);
  });

  it("returns empty result for empty input", function () {
    var result = GitUtils.computeGraphLayout([]);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.maxColumns).toBe(0);
  });

  it("returns empty result for null input", function () {
    var result = GitUtils.computeGraphLayout(null);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.maxColumns).toBe(0);
  });
});
