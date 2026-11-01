// Đọc file .docx trong ../source, tách ra từ vựng / mẫu câu / hội thoại,
// thêm pinyin cho từng câu thoại rồi ghi ra ../data.js (window.APP_DATA).
//
// Cách chạy (macOS – cần `textutil` có sẵn của hệ điều hành):
//   cd tools && npm install && node build-data.mjs [đường-dẫn-file.docx]
import { execFileSync } from "node:child_process";
import { writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pinyin } from "pinyin-pro";
import { TRANSLATIONS } from "./translations.mjs";
import { SPEAKING_TAKEAWAYS } from "./speaking-takeaways.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const docx =
  process.argv[2] ||
  join(root, "source", readdirSync(join(root, "source")).find((f) => f.endsWith(".docx")));

const raw = execFileSync("textutil", ["-convert", "txt", "-stdout", docx], {
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024,
});
const lines = raw.split(/\r?\n/).map((l) => l.replace(/\u00a0/g, " ").trimEnd());

import { customPinyin } from "pinyin-pro";
customPinyin({ 嗨: "hāi" });

// Pinyin có xử lý nhi hoá (有点儿 → yǒudiǎnr) và dấu câu gọn gàng.
const ER_WORDS = /^(儿子|儿童|儿女|儿媳|儿科|儿歌|儿时)/;
const ER_PREV = /[女婴幼孤健宠胎侄孙]/;
const PUNCT = { "，": ",", "。": ".", "？": "?", "！": "!", "：": ":", "；": ";", "、": ",", "“": "\"", "”": "\"", "（": "(", "）": ")", "……": "…" };
const HAN = /\p{Script=Han}/u;

// Sửa một số chữ đa âm mà pinyin-pro hay đoán sai trong khẩu ngữ.
function fixPolyphone(chars, i, guess) {
  const c = chars[i], prev = chars[i - 1] || "", next = chars[i + 1] || "";
  const prev2 = chars.slice(Math.max(0, i - 2), i).join("");
  switch (c) {
    case "得":
      if (/[觉舍值免省记懂晓显变]/.test(prev)) return "de";
      if (prev === "不" && chars[i - 2] === "舍") return "de";
      if (/[体到意分病]/.test(next) || /[难获取]/.test(prev)) return "dé";
      if (prev2 === "不过" || /[还也就都是]/.test(prev) || !HAN.test(prev)) return "děi";
      return HAN.test(prev) ? "de" : guess;
    case "地":
      if (HAN.test(prev) && HAN.test(next) &&
          !/[当本外各场草土天田山园工基目陆境质余此该原产高内心种空]/.test(prev) &&
          !/[方区址图点铁球上下板位震道毯理面带]/.test(next)) return "de";
      return "dì";
    case "只":
      return /[一两几三四五六七八九十每这那哪]/.test(prev) && !/[要是有好能想会]/.test(next) ? "zhī" : "zhǐ";
    case "舍":
      return next === "得" || (next === "不" && chars[i + 2] === "得") ? "shě" : guess;
    case "不":
      return prev === "舍" && next === "得" ? "bu" : guess;
    case "西":
      return prev === "东" ? "xi" : guess;
    case "什":
      return next === "么" ? "shén" : guess;
    case "了":
      return prev === "了" ? "le" : guess;
    case "参":
      return /[加观谋考与赛]/.test(next) ? "cān" : guess;
    case "假":
      return next === "期" || prev === "放" || prev === "请" ? "jià" : guess;
    case "长":
      return /[大辈官]/.test(next) || /[成生家校班部队]/.test(prev) ? "zhǎng" : "cháng";
    case "重":
      return /[新复]/.test(next) ? "chóng" : guess;
    case "行":
      return /[在银内同]/.test(prev) || next === "业" ? "háng" : guess;
    case "还":
      return /[钱书款]/.test(next) ? "huán" : guess;
    default:
      return guess;
  }
}

const py = (s) => {
  const items = pinyin(s, { type: "all", toneType: "symbol" });
  const chars = items.map((it) => it.origin);

  // Phát hiện các âm mang thanh 3 trước một âm thanh 3 khác trong cùng vế câu (trước dấu câu)
  const zhTokens = [];
  items.forEach((it, idx) => {
    if (it.isZh && it.origin !== "儿") {
      zhTokens.push({ it, idx });
    }
  });

  const sandhiIndices = new Set();
  for (let k = 0; k < zhTokens.length - 1; k++) {
    const cur = zhTokens[k];
    const next = zhTokens[k + 1];
    let hasPunct = false;
    for (let p = cur.idx + 1; p < next.idx; p++) {
      if (!items[p].isZh || PUNCT[items[p].origin]) {
        hasPunct = true;
        break;
      }
    }
    if (!hasPunct && cur.it.num === 3 && next.it.num === 3) {
      sandhiIndices.add(cur.idx);
    }
  }

  const plainOut = [];
  const htmlOut = [];
  let open = "";

  items.forEach((it, i) => {
    const prev = items[i - 1];
    if (
      it.origin === "儿" && prev && prev.isZh &&
      !ER_PREV.test(prev.origin) && !ER_WORDS.test(chars.slice(i).join(""))
    ) {
      plainOut[plainOut.length - 1] += "r";
      const lastHtml = htmlOut[htmlOut.length - 1];
      if (lastHtml && lastHtml.endsWith("</span>")) {
        htmlOut[htmlOut.length - 1] = lastHtml.replace(/<\/span>$/, "r</span>");
      } else if (htmlOut.length) {
        htmlOut[htmlOut.length - 1] += "r";
      }
      return;
    }

    if (it.isZh) {
      const fixed = fixPolyphone(chars, i, it.pinyin);
      plainOut.push(open + fixed);
      if (sandhiIndices.has(i)) {
        htmlOut.push(`${open}<span class="t3" title="Biến điệu thanh 3: tự đọc thành thanh 2">${fixed}</span>`);
      } else {
        htmlOut.push(open + fixed);
      }
      open = "";
    } else if (it.origin === "“" || it.origin === "（") {
      open += PUNCT[it.origin] || it.origin;
    } else if (PUNCT[it.origin]) {
      const p = PUNCT[it.origin];
      if (plainOut.length) plainOut[plainOut.length - 1] += p; else plainOut.push(p);
      if (htmlOut.length) htmlOut[htmlOut.length - 1] += p; else htmlOut.push(p);
    } else if (it.origin.trim()) {
      plainOut.push(it.origin);
      htmlOut.push(it.origin);
    }
  });

  return {
    plain: plainOut.join(" "),
    html: htmlOut.join(" ")
  };
};

// ---------- Prompt chung ----------
const promptStart = lines.findIndex((l) => l.startsWith("PROMPT CHUNG"));
const promptEnd = lines.findIndex((l, i) => i > promptStart && l.startsWith("Cách sử dụng"));
const generalPrompt = lines
  .slice(promptStart + 1, promptEnd)
  .join("\n")
  .trim();

// ---------- Bài học ----------
const lessons = [];
let lesson = null;
let topic = null;
let section = null; // 'vocab' | 'patterns' | 'dialogue'
let vocabBuf = [];
let pattern = null;

const flushVocab = () => {
  // nhóm 4 dòng: số thứ tự, chữ Hán, pinyin, nghĩa
  for (let i = 0; i < vocabBuf.length; ) {
    if (/^\d+$/.test(vocabBuf[i]) && i + 3 < vocabBuf.length) {
      lesson.vocab.push({ hanzi: vocabBuf[i + 1], pinyin: vocabBuf[i + 2], vi: vocabBuf[i + 3] });
      i += 4;
    } else {
      if (vocabBuf[i].startsWith("Lưu ý")) lesson.notes.push(vocabBuf[i]);
      i += 1;
    }
  }
  vocabBuf = [];
};

for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (!l) continue;

  let m;
  if ((m = l.match(/^BÀI\s+(\d+)\s+\/\s+(.+)$/))) {
    if (section === "vocab") flushVocab();
    lesson = { id: `b${m[1]}`, no: Number(m[1]), title: m[2].trim(), vocab: [], notes: [], patterns: [], topics: [] };
    lessons.push(lesson);
    section = null;
    continue;
  }
  if (!lesson) continue;
  if (l.startsWith("Nguồn & phạm vi")) break;

  if (/^01\s+TỪ VỰNG/.test(l)) { section = "vocab"; continue; }
  if (/^02\s+MẪU CÁCH DÙNG/.test(l)) { flushVocab(); section = "patterns"; continue; }
  if (/^03\s+HỘI THOẠI/.test(l)) { section = "dialogue"; continue; }

  if (section === "vocab") {
    if (["#", "Từ tiếng Trung", "Pinyin", "Nghĩa tiếng Việt"].includes(l)) continue;
    vocabBuf.push(l);
    continue;
  }

  if (section === "patterns") {
    if ((m = l.match(/^(\d{2})\s{2,}(.+)$/))) {
      pattern = { title: m[2].trim(), explain: "", example: "", exampleVi: "" };
      lesson.patterns.push(pattern);
    } else if (pattern && l.startsWith("Ví dụ:")) {
      pattern.example = l.replace(/^Ví dụ:\s*/, "").trim();
      const exPy = py(pattern.example);
      pattern.examplePinyin = exPy.plain;
      pattern.examplePinyinHtml = exPy.html;
    } else if (pattern && l.startsWith("Dịch bám nghĩa:")) {
      pattern.exampleVi = l.replace(/^Dịch bám nghĩa:\s*/, "").trim();
    } else if (pattern) {
      pattern.explain += (pattern.explain ? " " : "") + l;
    }
    continue;
  }

  if (section === "dialogue") {
    if ((m = l.match(/^CÂU\s+(\d+)\s+\|\s+(.+)$/))) {
      const topicId = `${lesson.id}-c${m[1]}`;
      topic = {
        id: topicId,
        no: Number(m[1]),
        titleVi: m[2].trim(),
        question: "",
        outline: "",
        takeaways: SPEAKING_TAKEAWAYS[topicId] || null,
        lines: [],
      };
      lesson.topics.push(topic);
      continue;
    }
    if (!topic) continue;
    if ((m = l.match(/^\[(\d{2})\]\s+([AB])\s+｜(.+)$/))) {
      const zh = m[3].trim();
      const lineIdx = topic.lines.length;
      const pyRes = py(zh);
      const vi = TRANSLATIONS[topic.id]?.[lineIdx] || "";
      topic.lines.push({
        n: m[1],
        role: m[2],
        zh,
        pinyin: pyRes.plain,
        pinyinHtml: pyRes.html,
        vi
      });
    } else if (l.startsWith("Mạch ý:")) {
      topic.outline = l.replace(/^Mạch ý:\s*/, "").trim();
    } else if (l.startsWith("ĐOẠN LỜI THOẠI")) {
      // bỏ qua tiêu đề
    } else if (!topic.question) {
      topic.question = l;
      const qPy = py(l);
      topic.questionPinyin = qPy.plain;
      topic.questionPinyinHtml = qPy.html;
    }
  }
}

// ---------- Kiểm tra ----------
const totals = lessons.reduce(
  (a, ls) => ({
    vocab: a.vocab + ls.vocab.length,
    patterns: a.patterns + ls.patterns.length,
    topics: a.topics + ls.topics.length,
    lines: a.lines + ls.topics.reduce((s, t) => s + t.lines.length, 0),
  }),
  { vocab: 0, patterns: 0, topics: 0, lines: 0 }
);
for (const ls of lessons)
  for (const t of ls.topics)
    if (t.lines.length !== 18) console.warn(`⚠️  ${t.id} có ${t.lines.length} câu (mong đợi 18)`);

const data = { title: lines[0].trim(), subtitle: lines[1].trim(), generalPrompt, lessons, totals };
writeFileSync(
  join(root, "data.js"),
  `// File tự sinh bởi tools/build-data.mjs – đừng sửa tay.\nwindow.APP_DATA = ${JSON.stringify(data, null, 1)};\n`
);
console.log("✅ Đã ghi data.js", totals);
