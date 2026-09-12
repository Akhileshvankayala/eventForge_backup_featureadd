// Builds backend/knowledge/guide.pdf from guide.md (+ optional live snapshot).
// Dependency-free minimal PDF writer (single font, wrapped text).
// Usage: node backend/knowledge/build-pdf.mjs [--snapshot snapshot.json]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const snapshotArg = process.argv.find((a) => a.startsWith("--snapshot"));
const snapshot = snapshotArg
  ? JSON.parse(readFileSync(snapshotArg.split("=")[1], "utf-8"))
  : null;

function mdToLines(md) {
  const out = [];
  for (const raw of md.split("\n")) {
    const line = raw.replace(/[*_`#]/g, "").trimEnd();
    if (line.startsWith("## ")) out.push({ text: line.slice(3).trim(), size: 15, gap: 8 });
    else if (line.startsWith("# ")) out.push({ text: line.slice(2).trim(), size: 19, gap: 10 });
    else if (line.startsWith("- ")) out.push({ text: "•  " + line.slice(2).trim(), size: 10, gap: 2 });
    else if (/^\d+\. /.test(line)) out.push({ text: line.trim(), size: 10, gap: 2 });
    else if (line.trim() === "") out.push({ text: "", size: 10, gap: 3 });
    else out.push({ text: line.trim(), size: 10, gap: 2 });
  }
  return out;
}

function wrap(text, maxChars) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      lines.push(cur.trim());
      cur = w;
    } else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.length ? lines : [""];
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildPdf({ title, lines, outPath }) {
  const W = 595, H = 842, M = 56, MAXW = 72;
  const pages = [];
  let cur = [];
  let y = H - M;
  const push = (text, size, gap) => {
    for (const wl of wrap(text, MAXW)) {
      if (y < M + 20) {
        pages.push(cur);
        cur = [];
        y = H - M;
      }
      cur.push({ y, size, text: wl });
      y -= size + 3;
    }
    y -= gap;
  };
  push(title, 22, 12);
  for (const l of lines) push(l.text, l.size, l.gap);
  pages.push(cur);

  const objects = [];
  const contentIds = pages.map((_, i) => 4 + i * 2);
  const fontId = 3;
  // catalog(1) pages(2) font(3) then per page: content + page
  let contentStreams = pages.map((ops) => {
    let s = "BT\n";
    for (const op of ops) s += `/F1 ${op.size} Tf 1 0 0 1 ${M} ${op.y.toFixed(1)} Tm (${esc(op.text)}) Tj\n`;
    return s + "ET";
  });
  const kids = [];
  let id = 4;
  const idMap = [];
  for (let i = 0; i < pages.length; i++) {
    idMap.push({ content: id++, page: id++ });
    kids.push(idMap[i].page);
  }
  objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`;
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj`;
  objects[3] = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`;
  for (let i = 0; i < pages.length; i++) {
    objects[idMap[i].content] = `${idMap[i].content} 0 obj\n<< /Length ${contentStreams[i].length} >>\nstream\n${contentStreams[i]}endstream\nendobj`;
    objects[idMap[i].page] = `${idMap[i].page} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${idMap[i].content} 0 R >>\nendobj`;
  }
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  const maxId = id - 1;
  for (let i = 1; i <= maxId; i++) {
    offsets[i] = pdf.length;
    pdf += objects[i] + "\n";
  }
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= maxId; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  writeFileSync(outPath, pdf, "latin1");
}

// CLI: rebuild the static guide pdf (plus optional snapshot appendix).
const md = readFileSync(join(DIR, "guide.md"), "utf-8");
const lines = mdToLines(md);
if (snapshot) {
  lines.push({ text: "", size: 10, gap: 4 });
  lines.push({ text: "Live snapshot", size: 15, gap: 8 });
  lines.push({ text: `Generated: ${snapshot.generatedAt}`, size: 10, gap: 2 });
  for (const [k, v] of Object.entries(snapshot.counts || {})) {
    lines.push({ text: `•  ${k}: ${v}`, size: 10, gap: 2 });
  }
}
buildPdf({ title: "EventForge — Knowledge Base", lines, outPath: join(DIR, "guide.pdf") });
console.log("guide.pdf written");
