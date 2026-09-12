import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getCollection } from "../db.js";

const DIR = dirname(fileURLToPath(import.meta.url));

// Regenerates backend/knowledge/guide.pdf with a live counts appendix, so the
// PDF knowledge base always reflects current data. Fire-and-forget safe.
export function refreshKnowledgePdf(): Promise<{ generatedAt: string }> {
  return new Promise((resolve, reject) => {
    (async () => {
      const names = ["users", "events", "venues", "sessions", "speakers", "sponsors", "ticketTypes", "attendees", "announcements"];
      const counts: Record<string, number> = {};
      for (const n of names) {
        try {
          counts[n] = await getCollection(n).countDocuments();
        } catch {
          counts[n] = 0;
        }
      }
      const generatedAt = new Date().toISOString();
      const tmp = mkdtempSync(join(tmpdir(), "ef-kb-"));
      const snapPath = join(tmp, "snapshot.json");
      writeFileSync(snapPath, JSON.stringify({ generatedAt, counts }));
      const script = join(DIR, "..", "knowledge", "build-pdf.mjs");
      execFile(process.execPath, [script, `--snapshot=${snapPath}`], (err) => {
        if (err) reject(err);
        else resolve({ generatedAt });
      });
    })().catch(reject);
  });
}
