// tools/merge-data.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// 1. Nạp Book 1 (Khẩu ngữ Trung cấp)
const b1DataPath = join(here, "book1-data.json");
const book1 = JSON.parse(readFileSync(b1DataPath, "utf8"));

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

const dataJsPath = join(root, "data.js");
writeFileSync(dataJsPath, output, "utf8");
console.log("✅ Đã ghi data.js hợp nhất 2 giáo trình thành công từ book1-data.json và book2-data.json!");
