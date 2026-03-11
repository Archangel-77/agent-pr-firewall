import { z } from "zod";

const logLevels = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
] as const;

const defaultProtectedPathPrefixes =
  ".github/workflows/,infra/,terraform/,deploy/,ops/,production/";
const defaultWarnChangedFiles = 25;
const defaultBlockChangedFiles = 75;
const defaultWarnChangedLines = 800;
const defaultBlockChangedLines = 2000;
const defaultFileInspectionAlertThreshold = 5;
const defaultFileInspectionAlertWindowSeconds = 300;

function parseCommaSeparatedPrefixes(value: string): string[] {
  return value
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(logLevels).default("info"),
  LOG_FILE_PATH: z.string().default(""),
  GITHUB_API_BASE_URL: z.string().url().default("https://api.github.com"),
  GITHUB_APP_ID: z.coerce.number().int().positive(),
  GITHUB_WEBHOOK_SECRET: z.string().min(1),
  GITHUB_PRIVATE_KEY: z.string().min(1),
  FIREWALL_PROTECTED_PATH_PREFIXES: z
    .string()
    .default(defaultProtectedPathPrefixes)
    .transform((value) => parseCommaSeparatedPrefixes(value)),
  FIREWALL_MAX_CHANGED_FILES_WARN: z.coerce.number().int().min(1).default(defaultWarnChangedFiles),
  FIREWALL_MAX_CHANGED_FILES_BLOCK: z.coerce.number().int().min(1).default(defaultBlockChangedFiles),
  FIREWALL_MAX_CHANGED_LINES_WARN: z.coerce.number().int().min(1).default(defaultWarnChangedLines),
  FIREWALL_MAX_CHANGED_LINES_BLOCK: z.coerce.number().int().min(1).default(defaultBlockChangedLines),
  ALERT_FILE_INSPECTION_FAILURE_THRESHOLD: z
    .coerce.number()
    .int()
    .min(1)
    .default(defaultFileInspectionAlertThreshold),
  ALERT_FILE_INSPECTION_FAILURE_WINDOW_SECONDS: z
    .coerce.number()
    .int()
    .min(1)
    .default(defaultFileInspectionAlertWindowSeconds),
}).superRefine((value, ctx) => {
  if (value.FIREWALL_MAX_CHANGED_FILES_WARN > value.FIREWALL_MAX_CHANGED_FILES_BLOCK) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["FIREWALL_MAX_CHANGED_FILES_WARN"],
      message: "must be less than or equal to FIREWALL_MAX_CHANGED_FILES_BLOCK",
    });
  }

  if (value.FIREWALL_MAX_CHANGED_LINES_WARN > value.FIREWALL_MAX_CHANGED_LINES_BLOCK) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["FIREWALL_MAX_CHANGED_LINES_WARN"],
      message: "must be less than or equal to FIREWALL_MAX_CHANGED_LINES_BLOCK",
    });
  }
});

export type AppEnv = z.infer<typeof envSchema>;

function formatIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey;
}

export function loadEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${formatIssues(parsed.error.issues)}`);
  }

  return {
    ...parsed.data,
    GITHUB_PRIVATE_KEY: normalizePrivateKey(parsed.data.GITHUB_PRIVATE_KEY),
  };
}
