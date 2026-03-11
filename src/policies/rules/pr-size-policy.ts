import type { GitHubPullRequestFile } from "../../types/github.js";
import type { Policy, PolicyContext, PolicySeverity } from "../types.js";

function countPatchLineChanges(patch: string): number {
  const lines = patch.split("\n");
  let count = 0;

  for (const line of lines) {
    if (line.startsWith("+++ ") || line.startsWith("--- ")) {
      continue;
    }

    if (line.startsWith("+") || line.startsWith("-")) {
      count += 1;
    }
  }

  return count;
}

function fileChangeSize(file: GitHubPullRequestFile): number {
  if (typeof file.changes === "number") {
    return file.changes;
  }

  if (typeof file.additions === "number" && typeof file.deletions === "number") {
    return file.additions + file.deletions;
  }

  if (typeof file.patch === "string") {
    return countPatchLineChanges(file.patch);
  }

  return 0;
}

function determineSeverity(
  fileCount: number,
  lineCount: number,
  context: PolicyContext,
): PolicySeverity | null {
  const { sizeThresholds } = context.settings;

  if (
    fileCount > sizeThresholds.blockChangedFiles ||
    lineCount > sizeThresholds.blockChangedLines
  ) {
    return "block";
  }

  if (
    fileCount > sizeThresholds.warnChangedFiles ||
    lineCount > sizeThresholds.warnChangedLines
  ) {
    return "warn";
  }

  return null;
}

export const pullRequestSizePolicy: Policy = {
  id: "pr-size",
  evaluate(context: PolicyContext) {
    const fileCount = context.pullRequestFiles.length;
    const changedLines = context.pullRequestFiles.reduce(
      (sum, file) => sum + fileChangeSize(file),
      0,
    );

    const severity = determineSeverity(fileCount, changedLines, context);
    if (!severity) {
      return null;
    }

    const { sizeThresholds } = context.settings;
    const thresholdLabel =
      severity === "block"
        ? `files>${sizeThresholds.blockChangedFiles} or lines>${sizeThresholds.blockChangedLines}`
        : `files>${sizeThresholds.warnChangedFiles} or lines>${sizeThresholds.warnChangedLines}`;

    return {
      policyId: "pr-size",
      severity,
      title: "Pull request size exceeds recommended threshold",
      message: `Detected ${fileCount} changed files and ${changedLines} changed lines (${thresholdLabel}).`,
    };
  },
};
