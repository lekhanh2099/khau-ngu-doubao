// tools/merge-data.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// 1. Nạp Book 1 (Khẩu ngữ Trung cấp)
let book1 = null;
const dataJsPath = join(root, "data.js");
if (existsSync(dataJsPath)) {
  const content = readFileSync(dataJsPath, "utf8");
  const jsonStr = content
    .replace(/^[^\n]*\n/, "")
    .replace(/^window\.APP_DATA\s*=\s*/, "")
    .replace(/;\s*$/, "");
  try {
    const parsed = JSON.parse(jsonStr);
    // Nếu data.js đã là cấu trúc đa sách:
    if (parsed && parsed["trung-cap"]) {
      book1 = parsed["trung-cap"];
    } else if (parsed && parsed.lessons) {
      book1 = parsed;
      book1.id = "trung-cap";
      book1.name = "汉语口语速成";
    }
  } catch (err) {
    console.warn("Không parse được data.js cũ:", err.message);
  }
}

// 2. Nạp Book 2 (Khẩu ngữ Giáo trình)
const b2DataPath = join(here, "book2-data.json");
const book2 = JSON.parse(readFileSync(b2DataPath, "utf8"));

// Nạp audio manifest cho Book 2 nếu có
const b2ManifestPath = join(here, "book2-audio-manifest.json");
if (existsSync(b2ManifestPath)) {
  const b2Audio = JSON.parse(readFileSync(b2ManifestPath, "utf8"));
  for (const l of book2.lessons) {
    for (const t of l.topics) {
      if (b2Audio[t.id]) {
        t.audio = b2Audio[t.id].file;
        t.audioDuration = b2Audio[t.id].duration;
        t.audioTimings = b2Audio[t.id].timings;
      }
    }
  }
}

const books = {
  "giao-trinh": book2,
  "trung-cap": book1
};

const output = `// File dữ liệu tổng hợp đa giáo trình (window.APP_BOOKS & window.APP_DATA)
window.APP_BOOKS = ${JSON.stringify(books, null, 1)};
// Mặc định nạp giáo trình mới:
window.APP_DATA = window.APP_BOOKS["giao-trinh"];
`;

writeFileSync(dataJsPath, output, "utf8");
console.log("✅ Đã ghi data.js hợp nhất 2 giáo trình thành công!");
