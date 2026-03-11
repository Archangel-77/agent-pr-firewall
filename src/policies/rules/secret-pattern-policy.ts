import type { Policy, PolicyContext } from "../types.js";

const MAX_FILES_IN_MESSAGE = 5;

interface SecretPattern {
  name: string;
  regex: RegExp;
}

const secretPatterns: readonly SecretPattern[] = [
  { name: "aws-access-key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "github-token", regex: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  {
    name: "private-key-block",
    regex: /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/,
  },
  {
    name: "hardcoded-secret-assignment",
    regex: /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*["'][^"']{12,}["']/i,
  },
];

function getAddedLines(patch: string): string[] {
  return patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export const secretPatternPolicy: Policy = {
  id: "secret-patterns",
  evaluate(context: PolicyContext) {
    const matchedFiles: string[] = [];
    const matchedPatternNames: string[] = [];

    for (const file of context.pullRequestFiles) {
      if (!file.patch) {
        continue;
      }

      const addedLines = getAddedLines(file.patch);
      for (const line of addedLines) {
        for (const pattern of secretPatterns) {
          if (pattern.regex.test(line)) {
            matchedFiles.push(file.filename);
            matchedPatternNames.push(pattern.name);
          }
        }
      }
    }

    const files = unique(matchedFiles);
    if (files.length === 0) {
      return null;
    }

    const patternNames = unique(matchedPatternNames).join(", ");
    const sample = files.slice(0, MAX_FILES_IN_MESSAGE).join(", ");
    const suffix = files.length > MAX_FILES_IN_MESSAGE ? ` (+${files.length - MAX_FILES_IN_MESSAGE} more)` : "";

    return {
      policyId: "secret-patterns",
      severity: "block",
      title: "Potential hardcoded secret detected",
      message: `Detected secret-like additions (${patternNames}) in: ${sample}${suffix}.`,
    };
  },
};
