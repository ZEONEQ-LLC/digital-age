import { appendFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export type Counts = {
  total: number;
  imported: number;
  skippedExisting: number;
  skippedNoAuthor: number;
  skippedOther: number;
  failed: number;
};

export type Logger = {
  ok: (msg: string) => void;
  skip: (msg: string) => void;
  fail: (msg: string) => void;
  info: (msg: string) => void;
  warn: (msg: string) => void;
  summary: (counts: Counts) => void;
  filePath: string;
};

export function createLogger(filePath: string): Logger {
  if (!existsSync(dirname(filePath))) {
    mkdirSync(dirname(filePath), { recursive: true });
  }
  const stamp = () => new Date().toISOString();
  const writeFile = (line: string) => {
    appendFileSync(filePath, `${stamp()} ${line}\n`);
  };
  const out = (line: string) => {
    process.stdout.write(`${line}\n`);
    writeFile(line);
  };

  return {
    ok: (m) => out(`[OK]   ${m}`),
    skip: (m) => out(`[SKIP] ${m}`),
    fail: (m) => out(`[FAIL] ${m}`),
    info: (m) => out(`[INFO] ${m}`),
    warn: (m) => out(`[WARN] ${m}`),
    summary: (c) => {
      out("═══════════════════════════════════");
      out("WordPress-Migration abgeschlossen");
      out("═══════════════════════════════════");
      out(`Posts in XML:        ${String(c.total).padStart(2)}`);
      out(`Imported:            ${String(c.imported).padStart(2)}`);
      out(`Skipped (existing):  ${String(c.skippedExisting).padStart(2)}`);
      out(`Skipped (no author): ${String(c.skippedNoAuthor).padStart(2)}`);
      out(`Skipped (other):     ${String(c.skippedOther).padStart(2)}`);
      out(`Failed:              ${String(c.failed).padStart(2)}`);
      out("───────────────────────────────────");
      out(`Volles Log: ${filePath}`);
    },
    filePath,
  };
}
