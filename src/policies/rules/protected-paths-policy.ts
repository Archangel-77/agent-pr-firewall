import type { Policy, PolicyContext } from "../types.js";

const MAX_FILES_IN_MESSAGE = 5;

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
}

function normalizePrefix(prefix: string): string {
  const normalized = normalizePath(prefix.trim());
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export const protectedPathsPolicy: Policy = {
  id: "protected-paths",
  evaluate(context: PolicyContext) {
    const prefixes = unique(context.settings.protectedPathPrefixes.map((prefix) => normalizePrefix(prefix)));
    if (prefixes.length === 0) {
      return null;
    }

    const matchedFiles = context.pullRequestFiles
      .map((file) => file.filename)
      .filter((filename) => {
        const normalized = normalizePath(filename);
        return prefixes.some((prefix) => normalized.startsWith(prefix));
      });

    if (matchedFiles.length === 0) {
      return null;
    }

    const sample = matchedFiles.slice(0, MAX_FILES_IN_MESSAGE).join(", ");
    const suffix = matchedFiles.length > MAX_FILES_IN_MESSAGE ? ` (+${matchedFiles.length - MAX_FILES_IN_MESSAGE} more)` : "";

    return {
      policyId: "protected-paths",
      severity: "block",
      title: "Protected paths were modified",
      message: `This PR changes protected files: ${sample}${suffix}.`,
    };
  },
};
