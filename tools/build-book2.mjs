// tools/build-book2.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pinyin, customPinyin } from "pinyin-pro";
import { BOOK2_TRANSLATIONS } from "./book2-translations.mjs";

customPinyin({ 嗨: "hāi" });

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const ER_WORDS = /^(儿子|儿童|儿女|儿媳|儿科|儿歌|儿时)/;
const ER_PREV = /[女婴幼孤健宠胎侄孙]/;
const PUNCT = {
  "，": ",",
  "。": ".",
  "？": "?",
  "！": "!",
  "：": ":",
  "；": ";",
  "、": ",",
  "“": "\"",
  "”": "\"",
  "（": "(",
  "）": ")",
  "……": "…",
  "—": "-",
  "——": "—"
};

function fixPolyphone(chars, i, guess) {
  const c = chars[i];
  const prev = chars[i - 1] || "";
  const next = chars[i + 1] || "";
  switch (c) {
    case "地":
      if (/[得地的]/.test(prev)) return "de";
      if (next === "方" || next === "图" || next === "铁") return "dì";
      return "de";
    case "只":
      return /[一两几三四五六七八九十每这那哪]/.test(prev) ? "zhī" : "zhǐ";
    case "不":
      return prev === "受" && next === "了" ? "bu" : guess;
    case "还":
      return /[给付归]/.test(next) || next === "价" || next === "钱" ? "huán" : "hái";
    case "得":
      if (prev === "不" && chars[i - 2] === "受") return "liǎo";
      if (next === "到" || next === "了") return "dé";
      return guess;
    default:
      return guess;
  }
}

function computePy(s) {
  const items = pinyin(s, { type: "all", toneType: "symbol" });
  const chars = items.map((it) => it.origin);

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
      it.origin === "儿" &&
      prev &&
      prev.isZh &&
      !ER_PREV.test(prev.origin) &&
      !ER_WORDS.test(chars.slice(i).join(""))
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
        htmlOut.push(
          `${open}<span class="t3" title="Biến điệu thanh 3: tự đọc thành thanh 2">${fixed}</span>`
        );
      } else {
        htmlOut.push(open + fixed);
      }
      open = "";
    } else if (it.origin === "“" || it.origin === "（") {
      open += PUNCT[it.origin] || it.origin;
    } else if (PUNCT[it.origin]) {
      const p = PUNCT[it.origin];
      if (plainOut.length) plainOut[plainOut.length - 1] += p;
      else plainOut.push(p);
      if (htmlOut.length) htmlOut[htmlOut.length - 1] += p;
      else htmlOut.push(p);
    } else if (it.origin.trim()) {
      plainOut.push(it.origin);
      htmlOut.push(it.origin);
    }
  });

  return {
    pinyin: plainOut.join(" ").replace(/\s+([,.\?!:;])/g, "$1"),
    pinyinHtml: htmlOut.join(" ").replace(/\s+([,.\?!:;])/g, "$1")
  };
}

const rawText = readFileSync(join(root, "source", "khau-ngu-giao-trinh.txt"), "utf8");

// Parse file text
const lines = rawText.split(/\r?\n/).map((l) => l.trim());

let generalPrompt = "";
const pStart = lines.findIndex((l) => l.includes("PROMPT CHUNG"));
if (pStart !== -1) {
  for (let i = pStart + 1; i < lines.length; i++) {
    if (lines[i].startsWith("BÀI ")) break;
    if (lines[i].includes("你是我的中文口语搭档")) {
      generalPrompt = lines[i];
    }
  }
}

// Lessons: Bài 3, Bài 4, Bài 10, Bài 12, Bài 17
const lessonMatches = [];
lines.forEach((l, idx) => {
  const m = l.match(/^BÀI\s+(\d+)\s*\|\s*第([一二三四五六七八九十]+)课\s*(.+)$/);
  if (m) {
    lessonMatches.push({ lineIdx: idx, no: parseInt(m[1], 10), titleZh: m[3].trim() });
  }
});

const lessons = [];

for (let li = 0; li < lessonMatches.length; li++) {
  const cur = lessonMatches[li];
  const nextIdx = li + 1 < lessonMatches.length ? lessonMatches[li + 1].lineIdx : lines.length;
  const lLines = lines.slice(cur.lineIdx, nextIdx);

  const lesson = {
    id: `gt-b${cur.no}`,
    no: cur.no,
    title: cur.titleZh,
    vocab: [],
    patterns: [],
    expressions: [],
    topics: []
  };

  // 1. Parse Vocab
  const vIdx = lLines.findIndex((l) => l.includes("2  |  Từ vựng 生词"));
  const gIdx = lLines.findIndex((l) => l.includes("3  |  Ngữ pháp"));
  if (vIdx !== -1 && gIdx !== -1) {
    for (let i = vIdx + 1; i < gIdx; i++) {
      const line = lLines[i];
      if (line.startsWith("|") && !line.includes("生词 / Từ vựng") && !line.includes("Giữ các từ")) {
        const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 3) {
          lesson.vocab.push({
            hanzi: parts[0],
            pinyin: parts[1],
            vi: parts[2]
          });
        }
      }
    }
  }

  // 2. Parse Grammar
  const eIdx = lLines.findIndex((l) => l.includes("4  |  Cụm diễn đạt 表达法"));
  if (gIdx !== -1 && eIdx !== -1) {
    let curPattern = null;
    for (let i = gIdx + 1; i < eIdx; i++) {
      const line = lLines[i];
      const pMatch = line.match(/^(\d+)\.\s*(.+)$/);
      if (pMatch) {
        if (curPattern) lesson.patterns.push(curPattern);
        curPattern = {
          pattern: pMatch[2].trim(),
          note: "",
          examples: []
        };
      } else if (line.startsWith("例") && curPattern) {
        const exParts = line.replace(/^例\s*/, "").split(/→|->/);
        curPattern.examples.push({
          zh: exParts[0].trim(),
          vi: exParts[1] ? exParts[1].trim() : ""
        });
      } else if (line && !line.startsWith("|") && curPattern && curPattern.examples.length === 0) {
        curPattern.note += (curPattern.note ? " " : "") + line;
      }
    }
    if (curPattern) lesson.patterns.push(curPattern);
  }

  // 3. Parse Expressions
  const hIdx = lLines.findIndex((l) => l.includes("5  |  Hội thoại A–B"));
  if (eIdx !== -1 && hIdx !== -1) {
    for (let i = eIdx + 1; i < hIdx; i++) {
      const line = lLines[i];
      if (line.startsWith("•")) {
        const exp = line.replace(/^•\s*/, "").trim();
        lesson.expressions.push(exp);
      }
    }
  }

  // 4. Parse Topics (Tình huống)
  const situationIndices = [];
  lLines.forEach((l, idx) => {
    const m = l.match(/^Tình huống\s+(\d+)\s*\|\s*(.+)$/);
    if (m) {
      situationIndices.push({ idx, no: parseInt(m[1], 10), titleVi: m[2].trim() });
    }
  });

  for (let si = 0; si < situationIndices.length; si++) {
    const sCur = situationIndices[si];
    const sNextIdx = si + 1 < situationIndices.length ? situationIndices[si + 1].idx : lLines.length;
    const sLines = lLines.slice(sCur.idx, sNextIdx);

    const rawTopicId = `b${cur.no}-c${sCur.no}`;
    const topicId = `gt-b${cur.no}-c${sCur.no}`;

    let question = "";
    let outline = "";
    const dialogueLines = [];

    const qLine = sLines.find((l) => l.startsWith("ĐỀ GỐC"));
    if (qLine) {
      question = qLine.replace(/^ĐỀ GỐC\s*/, "").trim();
    }

    const oLine = sLines.find((l) => l.startsWith("Mạch ý:"));
    if (oLine) {
      outline = oLine.replace(/^Mạch ý:\s*/, "").trim();
    }

    const startIdx = sLines.findIndex((l) => l.includes("BẮT ĐẦU ĐỐI THOẠI") || l.includes("开始对话"));
    const endIdx = sLines.findIndex((l) => l.includes("KẾT THÚC ĐỐI THOẠI") || l.includes("结束对话"));

    if (startIdx !== -1 && endIdx !== -1) {
      const rawDlg = sLines.slice(startIdx + 1, endIdx);
      const translations = BOOK2_TRANSLATIONS[topicId] || BOOK2_TRANSLATIONS[rawTopicId] || [];

      let lineCount = 0;
      for (const dl of rawDlg) {
        const m = dl.match(/^([AB]):\s*(.+)$/);
        if (m) {
          lineCount++;
          const role = m[1];
          const zh = m[2].trim();
          const n = lineCount < 10 ? `0${lineCount}` : `${lineCount}`;
          const pyRes = computePy(zh);
          const vi = translations[lineCount - 1] || "";

          dialogueLines.push({
            n,
            role,
            zh,
            pinyin: pyRes.pinyin,
            pinyinHtml: pyRes.pinyinHtml,
            vi
          });
        }
      }
    }

    const qPy = computePy(question);

    lesson.topics.push({
      id: topicId,
      no: sCur.no,
      titleVi: sCur.titleVi,
      question,
      questionPinyin: qPy.pinyin,
      questionPinyinHtml: qPy.pinyinHtml,
      outline,
      lines: dialogueLines,
      v2_lines: dialogueLines // Khẩu ngữ chuẩn
    });
  }

  lessons.push(lesson);
}

const book2 = {
  id: "giao-trinh",
  name: "汉语口语教程",
  title: "Khẩu ngữ Tiếng Trung",
  subtitle: "汉语口语教程 · 5 Bài · 13 Tình huống",
  generalPrompt,
  lessons,
  totals: {
    lessons: lessons.length,
    topics: lessons.reduce((acc, l) => acc + l.topics.length, 0),
    lines: lessons.reduce((acc, l) => acc + l.topics.reduce((ta, t) => ta + t.lines.length, 0), 0)
  }
};

writeFileSync(join(here, "book2-data.json"), JSON.stringify(book2, null, 2), "utf8");
console.log(
  `✅ Đã tạo book2-data.json: ${book2.lessons.length} bài, ${book2.totals.topics} tình huống, ${book2.totals.lines} câu thoại.`
);
