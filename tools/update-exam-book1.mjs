// Script chuẩn hóa & hoàn thiện Quyển 1 (《汉语口语速成 · 中级篇》) theo đúng đề thi thật:
// - 16 câu thi chính thức (Bài 2, 3, 5) + câu hỏi mở rộng trên slide cô giáo
// - Giữ V1 (từ Google Doc của nhóm, chỉ chuẩn hóa nhãn vai) & tạo V2 tối ưu khẩu ngữ tự nhiên, sửa lỗi gõ nhầm
// - Bổ sung đầy đủ 19 điểm Đặt câu (chú thích Bài 2, 3, 5) + từ vựng mới của đề 3+5
// - Gắn metadata (examNo, priority, isExamScope, slideQuestions) để UI lọc & bốc đề thi thử dễ dàng
//
// Chạy: node tools/update-exam-book1.mjs && node tools/merge-data.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pinyin, customPinyin } from "pinyin-pro";

customPinyin({ 嗨: "hāi", 选: "xuǎn" });

const here = dirname(fileURLToPath(import.meta.url));
const b1Path = join(here, "book1-data.json");

const ER_WORDS = /^(儿子|儿童|儿女|儿媳|儿科|儿歌|儿时)/;
const ER_PREV = /[女婴幼孤健宠胎侄孙]/;
const PUNCT = {
  "，": ",", "。": ".", "？": "?", "！": "!", "：": ":", "；": ";",
  "、": ",", "“": "\"", "”": "\"", "（": "(", "）": ")", "……": "…",
  "—": "-", "——": "—"
};
const HAN = /\p{Script=Han}/u;

function fixPolyphone(chars, i, guess) {
  const c = chars[i];
  const prev = chars[i - 1] || "";
  const next = chars[i + 1] || "";
  const prev2 = chars.slice(Math.max(0, i - 2), i).join("");
  switch (c) {
    case "得":
      if (/[觉舍值免省记懂晓显变]/.test(prev)) return "de";
      if (prev === "不" && chars[i - 2] === "舍") return "de";
      if (prev === "受" && next === "了") return "de";
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
      return (prev === "舍" && next === "得") || (prev === "受" && next === "了") ? "bu" : guess;
    case "西":
      return prev === "东" ? "xi" : guess;
    case "什":
      return next === "么" ? "shén" : guess;
    case "了":
      return prev === "了" ? "le" : (prev === "受" && chars[i - 1] === "不") ? "liǎo" : guess;
    case "参":
      return /[加观谋考与赛]/.test(next) ? "cān" : guess;
    case "假":
      return next === "期" || prev === "放" || prev === "请" ? "jià" : (next === "货" ? "jiǎ" : guess);
    case "长":
      return /[大辈官]/.test(next) || /[成生家校班部队]/.test(prev) ? "zhǎng" : "cháng";
    case "重":
      return /[新复]/.test(next) ? "chóng" : guess;
    case "行":
      return /[在银内同]/.test(prev) || next === "业" ? "háng" : guess;
    case "还":
      return /[给付归钱书款]/.test(next) ? "huán" : "hái";
    case "中":
      return prev === "选" || prev === "打" || prev === "猜" ? "zhòng" : (next === "奖" || next === "彩" ? "zhòng" : "zhōng");
    case "发":
      return next === "烧" || next === "炎" || next === "财" || next === "现" || next === "展" ? "fā" : guess;
    case "看":
      return next === "护" || next === "守" ? "kān" : "kàn";
    case "着":
      return prev === "拖" ? "zhe" : guess;
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
      const syl = fixPolyphone(chars, i, it.result);
      const isSandhi = sandhiIndices.has(i);
      const htmlSyl = isSandhi
        ? `<span class="t3" title="Biến điệu thanh 3: tự đọc thành thanh 2">${syl}</span>`
        : syl;

      if (open) {
        plainOut.push(open + syl);
        htmlOut.push(open + htmlSyl);
        open = "";
      } else {
        plainOut.push(syl);
        htmlOut.push(htmlSyl);
      }
      return;
    }

    const ch = it.origin;
    if (ch === "（" || ch === "“") {
      open = PUNCT[ch];
      return;
    }
    if (PUNCT[ch]) {
      if (plainOut.length) {
        plainOut[plainOut.length - 1] += PUNCT[ch];
        htmlOut[htmlOut.length - 1] += PUNCT[ch];
      } else {
        plainOut.push(PUNCT[ch]);
        htmlOut.push(PUNCT[ch]);
      }
      return;
    }
    if (!/\s/.test(ch)) {
      if (open) {
        plainOut.push(open + ch);
        htmlOut.push(open + ch);
        open = "";
      } else {
        plainOut.push(ch);
        htmlOut.push(ch);
      }
    }
  });

  return {
    pinyin: plainOut.join(" ").replace(/\s+/g, " ").trim(),
    pinyinHtml: htmlOut.join(" ").replace(/\s+/g, " ").trim(),
  };
}

function makeLine(n, role, zh, vi, modified = false) {
  const { pinyin: py, pinyinHtml: pyHtml } = computePy(zh);
  return { n, role, zh, pinyin: py, pinyinHtml: pyHtml, vi, modified };
}

function buildTopic({
  id,
  no,
  examNo,
  priority = null,
  titleVi,
  question,
  slideQuestions = [],
  outline,
  takeaways,
  v1Raw,
  v2Raw,
  diffReasons = {},
}) {
  const qPy = computePy(question);
  const v1_lines = v1Raw.map(([role, zh, vi], idx) => makeLine(idx + 1, role, zh, vi, false));
  const v2_lines = v2Raw.map(([role, zh, vi], idx) => {
    const v1 = v1Raw[idx];
    const isMod = !v1 || v1[1] !== zh || Boolean(diffReasons[idx + 1]);
    return makeLine(idx + 1, role, zh, vi, isMod);
  });

  const diffs = [];
  v2_lines.forEach((v2, idx) => {
    const n = idx + 1;
    const v1 = v1_lines[idx];
    if (v2.modified && v1) {
      diffs.push({
        n,
        role: v2.role,
        v1: { zh: v1.zh, pinyin: v1.pinyin, pinyinHtml: v1.pinyinHtml, vi: v1.vi },
        v2: { zh: v2.zh, pinyin: v2.pinyin, pinyinHtml: v2.pinyinHtml, vi: v2.vi },
        reason: diffReasons[n] || "Chuẩn hóa chính tả, chỉnh khẩu ngữ tự nhiên và mượt mà hơn.",
      });
    }
  });

  return {
    id,
    no,
    examNo,
    priority,
    isExamScope: true,
    titleVi,
    question,
    questionPinyin: qPy.pinyin,
    questionPinyinHtml: qPy.pinyinHtml,
    slideQuestions,
    outline,
    takeaways,
    lines: v2_lines,
    v1_lines,
    v2_lines,
    diffs,
  };
}

// 11 Đề thi mới / chuẩn hóa từ Google Doc + Slide cô giáo
const NEW_EXAM_TOPICS = {
  // ================= BÀI 2 =================
  2: [
    buildTopic({
      id: "b2-q3",
      no: 3,
      examNo: 3,
      priority: "red",
      titleVi: "Ốm mệt có đi khám bác sĩ, uống thuốc không?",
      question: "身体不舒服的时候，你会不会去看医生、吃药？",
      slideQuestions: ["身体不舒服时去看医生吗？"],
      outline: "Hỏi thăm khi bạn bị dầm mưa cảm sốt → Nêu thói quen cá nhân (bệnh nhẹ tự nghỉ vs khi nào phải đi khám) → Chốt giải pháp đi khám cùng nhau.",
      takeaways: {
        points: [
          "Phân biệt mức độ nặng nhẹ: Cảm nhẹ có thể uống nước ấm, nghỉ ngơi; nhưng đã sốt, đau đầu thì không nên cố chịu (小病休息、发烧头疼不能硬扛)",
          "Thói quen của bản thân: Không lạm dụng thuốc bừa bãi, nhưng nếu 1-2 ngày không đỡ nhất định đi khám bác sĩ (不滥用药物，但撑不住非去医院不可)",
          "Tránh lây cho người xung quanh & biến chứng: Kéo dài dễ thành viêm phổi, lây cho gia đình (拖着不治容易引起肺炎，还可能传染家人)",
          "Mẫu câu Bài 2: 至于 (đến mức), 非……不可 (nhất thiết phải), 千万别 (tuyệt đối đừng)"
        ],
        goldenQuotes: "小病可以多喝水休息，但发烧头疼拖着不治，至于弄成肺炎吗？还是听医生的话最安心。"
      },
      v1Raw: [
        ["A", "明明，早上好！今天你怎么来么这么早呢？", "Minh Minh, chào buổi sáng! Hôm nay sao cậu đến sớm thế?"],
        ["B", "最近天气不好，我得早点出门，不然又得淋雨了。你的脸色不太好，不舒服吗？", "Dạo này thời tiết xấu quá, tớ phải ra ngoài sớm kẻo lại dính mưa. Sắc mặt cậu không tốt lắm, không khỏe à?"],
        ["A", "别提了，昨天我也被淋雨了。昨天晚上身体不舒服，有点发烧，还有点咳嗽，整夜睡不着。", "Đừng nhắc nữa, hôm qua tớ cũng dính mưa. Tối qua người khó chịu, hơi sốt lại ho nữa, cả đêm không ngủ được."],
        ["B", "那你吃药了吗？", "Thế cậu uống thuốc chưa?"],
        ["A", "还没呢，我平时得了小病一般都不吃药的。", "Chưa đâu, bình thường tớ bị bệnh vặt chẳng mấy khi uống thuốc."],
        ["B", "人人得病的时候都会吃药或者赶快看医生，但你连吃药也不吃，现在你觉得怎么样？", "Ai bị bệnh cũng uống thuốc hoặc đi khám ngay, vậy mà cậu thuốc cũng chẳng uống, giờ thấy sao rồi?"],
        ["A", "还行，我觉得不必吃药啦，吃药对身体不好啊，都是化学成分。", "Cũng tạm, tớ thấy không cần uống thuốc đâu, uống thuốc hại người lắm, toàn thành phần hóa học."],
        ["B", "可是，感冒发烧也算是得了病毒啊，如果不吃药控制，可能会越来越严重。你现在都发烧了，还头疼，这可不是一件小事！", "Nhưng cảm sốt cũng là nhiễm virus đấy, không uống thuốc kiểm soát dễ nặng thêm lắm. Cậu đang sốt lại đau đầu thế kia không phải chuyện nhỏ đâu!"],
        ["A", "不至于那么严重吧？感冒这种小病，休息一下就好了。", "Không đến mức nghiêm trọng thế chứ? Cảm vặt thế này nghỉ ngơi chút là khỏi thôi."],
        ["B", "虽然药物能有副作用，但有些疾病如果不及时用药就会影响健康。很多人因为小感冒拖着不治，结果引起了肺炎！", "Tuy thuốc có tác dụng phụ nhưng có những bệnh không dùng thuốc kịp là ảnh hưởng sức khỏe đấy. Nhiều người cảm nhẹ kéo dài không chữa rồi biến chứng thành viêm phổi đấy!"],
        ["A", "那平时身体不舒服的时候，你会不会马上去看医生、吃药？", "Vậy bình thường lúc người không khỏe, cậu có đi khám bác sĩ, uống thuốc ngay không?"],
        ["B", "我也看情况。要是只是累了或者有点鼻塞，我会先多喝水、早点睡；但要是发烧或者两三天还没好，我就非去看医生不可。", "Tớ cũng tùy tình hình. Nếu chỉ mệt hay hơi nghẹt mũi thì tớ uống nhiều nước, ngủ sớm trước; nhưng nếu sốt hoặc 2-3 ngày chưa đỡ là tớ nhất định đi bác sĩ."],
        ["A", "原来如此，你不是一不舒服就乱吃药，而是看症状决定。", "Thì ra là vậy, cậu không phải hễ mệt là uống bừa thuốc, mà xem triệu chứng để quyết định."],
        ["B", "对啊，千万别滥用药物，也千万别硬扛着不治。况且你家里有老有小，传染给他们就不好了。", "Đúng thế, tuyệt đối đừng lạm dụng thuốc, cũng đừng cố chịu không chữa. Huống hồ nhà cậu có người già trẻ nhỏ, lây sang họ thì khổ."],
        ["A", "你说得真有道理，关心自己的健康，也是关心身边人的健康啊。那下课后我还是去看看医生吧。", "Cậu nói có lý thật, quan tâm sức khỏe bản thân cũng là quan tâm mọi người xung quanh. Vậy tan học tớ đi khám bác sĩ vậy."],
        ["B", "下课后我陪你一起去，早点查清楚早点安心！", "Tan học tớ đi cùng cậu, khám rõ sớm cho yên tâm!"]
      ],
      v2Raw: [
        ["A", "明明，早啊！今儿怎么来得这么早？", "Minh Minh, chào buổi sáng! Hôm nay sao đến sớm thế?"],
        ["B", "最近老下雨，我怕堵车才早点出门。对了，看你脸色不太好，是不是哪儿不舒服？", "Dạo này hay mưa quá, tớ sợ tắc đường nên ra khỏi nhà sớm. À, trông sắc mặt cậu hơi kém, có phải thấy trong người không khỏe không?"],
        ["A", "别提了，昨天淋了场雨，晚上回来就开始发低烧，还一直咳嗽，折腾得整夜没睡好。", "Đừng nhắc nữa, hôm qua dính trận mưa, tối về bắt đầu sốt nhẹ rồi ho suốt, hành cho cả đêm chẳng ngủ ngon."],
        ["B", "那你赶紧吃退烧药了吗？", "Thế cậu đã uống thuốc hạ sốt ngay chưa?"],
        ["A", "还没呢，我平时有点小病一般能扛就扛，很少吃药。", "Chưa đâu, bình thường tớ hơi ốm vặt toàn cố chịu cho qua, ít khi uống thuốc lắm."],
        ["B", "哎呀，大家生病了都赶紧看医生吃药，你倒好，连药都不吃，现在感觉怎么样啊？", "Trời ạ, mọi người ốm đều vội đi khám uống thuốc, cậu hay thật, thuốc cũng chẳng uống, giờ thấy trong người sao rồi?"],
        ["A", "还凑合吧，我总觉得“是药三分毒”，能不吃就不吃，免得伤身体。", "Cũng tạm ổn, tớ cứ nghĩ thuốc nào chẳng có tác dụng phụ, tránh được thì tránh kẻo hại người."],
        ["B", "话虽这么说，可发烧往往是病毒感染啊！要是不用药控制，症状只会越来越重，头疼发烧可不是闹着玩的。", "Nói vậy thôi chứ sốt thường là do nhiễm virus đấy! Không dùng thuốc kiểm soát thì triệu chứng chỉ có nặng thêm, sốt với đau đầu không phải chuyện đùa đâu."],
        ["A", "不至于那么严重吧？我觉得就是普通感冒，喝点热水、捂着睡一觉就好了。", "Chắc không đến nỗi nặng thế đâu chứ? Tớ thấy chỉ là cảm thường, uống cốc nước ấm rồi trùm chăn ngủ một giấc là khỏi thôi."],
        ["B", "你可别大意！不少年轻人就是小感冒拖着不治，最后拖成了肺炎，后悔都来不及。", "Cậu đừng chủ quan! Không ít người trẻ chỉ vì cảm nhẹ kéo dài không chịu chữa, cuối cùng biến chứng thành viêm phổi, hối không kịp đâu."],
        ["A", "那换成是你，身体一不舒服就会马上去医院、吃药吗？", "Thế đổi lại là cậu, hễ người thấy mệt là cậu chạy thẳng ra viện uống thuốc ngay à?"],
        ["B", "那倒也不是，我分情况！要是只是有点乏力或轻度鼻塞，我先多喝水、早睡；但一旦发高烧，或者连着两三天不见好，那非去看医生不可。", "Cũng không hẳn, tớ tùy mức độ! Nếu chỉ hơi uể oải hay nghẹt mũi nhẹ thì tớ uống nhiều nước, ngủ sớm; nhưng hễ sốt cao hoặc 2-3 ngày liền không đỡ thì nhất định phải đi khám."],
        ["A", "怪不得！你既不盲目乱吃药，也不会傻傻硬扛着。", "Thảo nào! Cậu vừa không uống thuốc bừa bãi, vừa không cố chịu một cách ngốc nghếch."],
        ["B", "就是这个理儿！千万别滥用药物，更别拖着不治。况且你家里还有老人小孩，万一传染给他们就麻烦了。", "Đúng thế đấy! Tuyệt đối đừng lạm dụng thuốc, càng đừng dây dưa không chữa. Huống chi nhà cậu còn có người già trẻ nhỏ, nhỡ lây cho họ thì phiền toái lắm."],
        ["A", "听你这么一劝，我真醒悟了！照顾好自己也是为家人负责。下课我有空，要不你陪我去趟医院吧？", "Nghe cậu khuyên thế tớ tỉnh ngộ rồi! Tự chăm sóc mình cũng là có trách nhiệm với gia đình. Tan học tớ rảnh, hay cậu đi cùng tớ ra viện một chuyến nhé?"],
        ["B", "没问题，下课我就陪你去！在医生指导下对症下药，好得快也安心。", "Ok luôn, tan học tớ đi với cậu! Dùng đúng thuốc theo hướng dẫn bác sĩ vừa nhanh khỏi vừa yên tâm."]
      ],
      diffReasons: {
        1: "Sửa lỗi gõ dư chữ “来么这么早” (lỗi Google Doc) thành khẩu ngữ Bắc Kinh tự nhiên “今儿怎么来得这么早？”",
        2: "Chỉnh lý do tự nhiên hơn (tránh lặp “淋雨”) và chuyển câu hỏi tự nhiên sang sức khỏe.",
        7: "Thay văn dịch “都是化学成分” bằng thành ngữ khẩu ngữ cực chuẩn “是药三分毒” (thuốc nào cũng có 3 phần độc).",
        12: "Lồng ghép chuẩn mẫu câu Bài 2: “非去看医生不可” (nhất thiết phải đi bác sĩ).",
        13: "Thay từ văn viết/dịch anime “原来如此” bằng khẩu ngữ tự nhiên “怪不得！”.",
        14: "Bỏ chữ “对啊” cụt, dùng “就是这个理儿！” và nhấn mạnh “千万别……” của Bài 2."
      }
    }),

    buildTopic({
      id: "b2-q4",
      no: 4,
      examNo: 4,
      priority: null,
      titleVi: "Đối với bạn, sức khỏe có phải số 1 không?",
      question: "对你来说，健康是不是第一？",
      outline: "Phàn nàn áp lực công việc phải tăng ca → Tranh luận: Sức khỏe số 1 vs Không có tiền cũng không sống/chữa bệnh nổi → Chốt lại cân bằng: Giữ sức khỏe để kiếm tiền bền vững.",
      takeaways: {
        points: [
          "Khẳng định quan điểm: Sức khỏe chắc chắn là số 1 (毫无疑问，健康肯定是第一位)",
          "Hai mặt của Sức khỏe & Tiền bạc: Không có tiền thì khó xoay xở chi phí sinh hoạt & viện phí; nhưng bán mạng kiếm tiền đến khi ngã bệnh thì bao nhiêu tiền cũng vô nghĩa (有健康才能赚钱，别拿命换钱)",
          "Ví dụ thực tế dễ ghi điểm: Nhắc người thân/đồng nghiệp làm việc quá sức đến mức nhập viện (太拼命最后得了重病)",
          "Mẫu câu Bài 2: 别提多……了 (khỏi phải nói), 非……不可 (nhất thiết), 千万别 (tuyệt đối đừng)"
        ],
        goldenQuotes: "“健康第一”不是说钱不重要，而是提醒我们千万别为了赚钱把身体搞垮。有健康才能谈未来。"
      },
      v1Raw: [
        ["A", "你怎么了薇薇？最近生活不顺利吗？我看你的精神不太好啊？", "Cậu sao thế Vi Vi? Dạo này cuộc sống không thuận lợi à? Tớ thấy tinh thần cậu không tốt lắm."],
        ["B", "别提了，我最近的工作太忙了，这份工作太复杂了，我每天都要加班，熬夜，今天累得连饭也不想吃。", "Đừng nhắc nữa, dạo này công việc bận quá, việc lại phức tạp, ngày nào tớ cũng phải tăng ca, thức khuya, hôm nay mệt đến cơm chẳng buồn ăn."],
        ["A", "那么严重吗？什么事情过了头都不好。自己的能力到哪儿就到哪儿，太勉强了反而会伤身体。没什么事情比健康更重要。", "Nghiêm trọng vậy sao? Chuyện gì quá mức cũng không tốt. Sức mình tới đâu làm tới đó, cố quá lại hại thân. Chẳng gì quan trọng bằng sức khỏe đâu."],
        ["B", "说归说，可是你想想，没有钱你怎么解决柴米油盐的问题呢，甚至连生病看医生都看不起。光靠健康也不能生活啊。", "Nói thì nói thế, nhưng cậu thử nghĩ xem, không có tiền sao lo nổi cơm áo gạo tiền, thậm chí ốm đau cũng chẳng đủ tiền đi khám. Chỉ có sức khỏe không thì đâu sống nổi."],
        ["A", "你的观点有问题了，如果没有健康的话，再多的钱也没用。再说，难道你赚钱就为了看病，值得吗？", "Quan điểm của cậu có vấn đề rồi, nếu không có sức khỏe thì bao nhiêu tiền cũng vô dụng. Với lại, chẳng lẽ cậu kiếm tiền chỉ để đi viện khám bệnh, có đáng không?"],
        ["B", "可是我想趁着现在年轻再多赚钱，以后可以早退休，到那时候钱可以给我活得轻松，幸福。所以，现在无论有多么累，我也接受。", "Nhưng tớ muốn tranh thủ lúc còn trẻ kiếm thêm nhiều tiền, sau này về hưu sớm, lúc đó tiền sẽ giúp tớ sống nhẹ nhàng, hạnh phúc. Nên giờ có mệt thế nào tớ cũng chấp nhận."],
        ["A", "我不这么想。拿我叔叔来说，他以前就是太拼命赚钱，最后得了重病，现在什么都不能做了，钱再多也没意义。", "Tớ không nghĩ vậy. Lấy ví dụ chú tớ, trước đây chú ấy cắm đầu kiếm tiền quá mức, cuối cùng mắc bệnh nặng, giờ chẳng làm được gì, tiền nhiều cũng vô nghĩa."],
        ["B", "我也认识一个人，很注意健康，可是没钱来检查、买药，最后小病拖成大病。看他的情况，我觉得有钱还是非常必要的。", "Tớ cũng quen một người rất chú ý sức khỏe, nhưng không có tiền đi khám, mua thuốc, cuối cùng bệnh nhẹ kéo thành bệnh nặng. Nhìn anh ta, tớ thấy có tiền vẫn rất cần thiết."],
        ["A", "钱也重要我知道啊！面对重病而没有钱真的无可奈何，但是关于着钱和健康这两个问题，我们还该会平衡，最好还是把健康的方面放在第一。", "Tiền cũng quan trọng tớ biết chứ! Đối mặt bệnh nặng mà không tiền đúng là bất lực, nhưng về chuyện tiền và sức khỏe thì chúng ta vẫn phải biết cân bằng, tốt nhất vẫn đặt sức khỏe lên hàng đầu."],
        ["B", "其实说到底，钱和健康都互相影响。有健康才能赚钱，有钱才能更好地保护健康。", "Thực ra nói cho cùng, tiền và sức khỏe ảnh hưởng qua lại. Có sức khỏe mới kiếm được tiền, có tiền mới bảo vệ sức khỏe tốt hơn."],
        ["A", "你终于明白了！说了这么久，你这句话我才觉得有道理，“健康第一”不是说钱不重要，而是提醒我们：别为了赚钱而危害健康。", "Cuối cùng cậu cũng hiểu ra rồi! Nói mãi câu này của cậu tớ mới thấy chí lý, 'Sức khỏe là số 1' không có nghĩa tiền không quan trọng, mà nhắc ta đừng vì kiếm tiền mà hại sức khỏe."],
        ["B", "对啊！我觉得我最近的精神简直太压力了。听你说的话，我也该轻松一下，明天是周末，我们一起去玩吧。", "Đúng thế! Tớ thấy tinh thần dạo này áp lực quá mức rồi. Nghe cậu nói, tớ cũng nên thư giãn chút, mai cuối tuần mình đi chơi đi."],
        ["A", "行，没问题，可以帮你轻松是我的荣幸。", "Được, không vấn đề, giúp cậu thư giãn là vinh hạnh của tớ."],
        ["B", "哈哈哈，你又开玩笑了。", "Haha, cậu lại nói đùa rồi."]
      ],
      v2Raw: [
        ["A", "薇薇，你这是怎么了？最近精神头看着不太好啊，是不是太累了？", "Vi Vi, cậu sao thế này? Dạo này trông thần sắc hơi kém đấy, có phải mệt quá không?"],
        ["B", "别提有多累了！最近项目赶进度，我天天加班熬夜，今天累得连晚饭都咽不下。", "Mệt khỏi phải nói luôn! Dạo này dự án chạy tiến độ, ngày nào tớ cũng tăng ca thức khuya, hôm nay mệt đến mức cơm tối chẳng nuốt nổi."],
        ["A", "工作哪有干完的时候？什么事过了头都不好，拿命换钱最不划算。对我来说，健康永远是第一位的！", "Công việc bao giờ mới hết được? Chuyện gì quá mức cũng dở, lấy mạng đổi tiền là dại nhất. Với tớ, sức khỏe lúc nào cũng là số một!"],
        ["B", "话是这么说，可现实摆在这儿啊，没钱怎么应付每天的柴米油盐？万一生个大病，连医药费都掏不起！", "Nói thì hay thế, nhưng thực tế sờ sờ ra đấy, không tiền lấy gì lo cơm áo gạo tiền hàng ngày? Nhỡ ốm nặng một trận, tiền thuốc men còn chẳng đủ đóng!"],
        ["A", "这我承认，但反过来想，要是把身体熬垮了，赚再多钱也只能躺在医院花，难道咱们拼命赚钱就是为了养医生吗？", "Cái này tớ công nhận, nhưng nghĩ ngược lại xem, nếu thức đêm cày kiệt sức, kiếm nhiều tiền mấy rồi cũng chỉ nằm viện tiêu, chẳng lẽ mình bán sức kiếm tiền để nuôi bác sĩ à?"],
        ["B", "道理我懂，我只是想趁着年轻能吃苦，多攒点本钱，以后好早点实现财富自由，过轻松日子。", "Lý lẽ tớ hiểu, tớ chỉ muốn tranh thủ còn trẻ chịu khổ được, tích cóp thêm chút vốn để sau này sớm tự do tài chính, sống nhàn hạ hơn."],
        ["A", "我以前有个亲戚就是这么想的，拼命工作赚了大钱，结果四十几岁就查出重病，现在只能天天养病，钱再多也花不开心。", "Trước tớ có người họ hàng cũng nghĩ y vậy, làm sống làm chết kiếm bộn tiền, kết quả hơn 40 tuổi phát hiện bệnh nặng, giờ suốt ngày nằm dưỡng bệnh, nhiều tiền mấy cũng chẳng tiêu vui nổi."],
        ["B", "哎，我倒也见过另一面：有位朋友平时很注重养生，但收入太低舍不得去体检，结果小病拖成大病。所以没钱有时也护不住健康。", "Haiz, tớ cũng thấy mặt trái kia rồi: có người bạn bình thường rất giữ sức khỏe nhưng thu nhập thấp, tiếc tiền không đi khám định kỳ, cuối cùng bệnh nhẹ thành nặng. Nên đôi khi không tiền cũng chẳng bảo vệ nổi sức khỏe."],
        ["A", "对，所以关键在于平衡！不能把健康和赚钱对立起来，但在两头冲突的时候，咱还是非把健康放在第一位不可。", "Chuẩn, nên mấu chốt là cân bằng! Đừng đặt sức khỏe đối nghịch với kiếm tiền, nhưng lúc hai thứ xung đột thì nhất thiết phải đặt sức khỏe lên hàng đầu."],
        ["B", "说到底，这两者其实相辅相成——有好身体才能长久赚钱，有经济基础才能更好地保养身体。", "Nói cho cùng, hai thứ đó hỗ trợ lẫn nhau — có thân thể khỏe mới kiếm tiền đường dài, có kinh tế mới chăm sóc bản thân tốt hơn."],
        ["A", "你这话太透彻了！“健康第一”不是清高到不要钱，而是提醒咱们千万别为了眼前的收入透支未来的健康。", "Câu này cậu nói thấu đáo quá! 'Sức khỏe số 1' không phải chê tiền, mà nhắc nhở ta tuyệt đối đừng vì thu nhập trước mắt mà xài lạm sức khỏe tương lai."],
        ["B", "听你这么一开导，我最近绷紧的神经总算松快点儿了。正好明天周末，我决定不加班了，咱们出去放松一下吧？", "Nghe cậu phân tích xong, đầu óc căng thẳng dạo này của tớ đỡ hẳn rồi. Vừa khéo mai cuối tuần, tớ quyết định nghỉ tăng ca, mình ra ngoài thư giãn một bữa nhé?"],
        ["A", "这主意太赞了！能陪大忙人好好放松一回，那是我的荣幸啊！", "Ý kiến này đỉnh quá! Được đưa người bận rộn đi xả hơi một chuyến đúng là vinh hạnh của tớ đấy!"],
        ["B", "哈哈哈，就会拿我打趣，明天不见不散！", "Haha, chỉ giỏi trêu tớ, mai không gặp không về nhé!"]
      ],
      diffReasons: {
        2: "Dùng chuẩn cấu trúc Bài 2 “别提有多累了” thay câu liệt kê rườm rà.",
        9: "Sửa lỗi ngữ pháp “关于着钱和健康” (không dùng 关于着) thành câu tự nhiên + lồng ghép “非……不可”.",
        11: "Sửa “我这番说话不是白说” thành cách khen tự nhiên “你这话太透彻了！” + mẫu câu “千万别……”.",
        12: "Sửa lỗi ngữ pháp nặng “精神简直太压力了” (名词 压力 không làm tính từ sau 太) thành “绷紧的神经总算松快点儿了”."
      }
    }),

    buildTopic({
      id: "b2-q5",
      no: 5,
      examNo: 5,
      priority: "red",
      titleVi: "Quan điểm: Bệnh thường không cần uống thuốc sẽ tự khỏi",
      question: "现在有很多人认为普通的病不要吃药，会自然好了，说说你的看法。",
      slideQuestions: ["很多人生病了但不吃药，相信自然会恢复"],
      outline: "Nêu hiện tượng nhiều người tin tự khỏi → Mặt tích cực (hạn chế lạm dụng thuốc, phát huy miễn dịch tự nhiên) → Mặt rủi ro (virus biến chứng, lây lan) → Kết luận dùng thuốc hợp lý theo hướng dẫn bác sĩ.",
      takeaways: {
        points: [
          "Lý do có quan điểm này: Một số cảm cúm nhẹ do virus tự giới hạn, cơ thể tự phục hồi nếu nghỉ ngơi và giữ miễn dịch (免疫系统与自愈力)",
          "Mặt trái của thuốc: Lạm dụng thuốc gây nhờn thuốc, tác dụng phụ, buồn ngủ (滥用药物有副作用)",
          "Rủi ro nếu mù quáng không uống thuốc: Triệu chứng nặng lên, lây người thân, biến chứng viêm phổi (拖着不治容易引发并发症)",
          "Từ vựng ăn điểm (Google Doc): 病毒感染, 自然疗法, 免疫系统, 滥用药物, 拖着不治, 缓解症状, 退烧药/止咳药"
        ],
        goldenQuotes: "药物不是敌人，而是工具。普通小病靠自身免疫力恢复没问题，但症状加重时千万别硬扛，在医生指导下合理用药才最科学。"
      },
      v1Raw: [
        ["A", "现在很多人都说，普通的病不用吃药，靠身体自己恢复比较好，你怎么看？", "Giờ nhiều người bảo bệnh thông thường không cần uống thuốc, để cơ thể tự hồi phục tốt hơn, cậu nghĩ sao?"],
        ["B", "我觉得这要看是什么病。如果是普通的小感冒，休息一下、多喝水，利用自然疗法确实能慢慢恢复。", "Tớ thấy còn tùy bệnh gì. Nếu chỉ là cảm nhẹ thông thường, nghỉ ngơi, uống nhiều nước, dùng liệu pháp tự nhiên đúng là tự hồi phục dần được."],
        ["A", "可是，感冒发烧也算是病毒感染啊，如果不吃药控制，可能会越来越严重，这可不是一件小事。", "Nhưng cảm sốt cũng là nhiễm virus đấy, nếu không uống thuốc kiểm soát dễ nặng hơn lắm, không phải chuyện nhỏ đâu."],
        ["B", "但是虽然药物能帮助身体快速恢复，同时也会影响我们的免疫系统。有些感冒药有副作用，还会让人犯困。", "Nhưng tuy thuốc giúp cơ thể hồi phục nhanh, đồng thời cũng ảnh hưởng hệ miễn dịch. Một số thuốc cảm có tác dụng phụ, lại gây buồn ngủ nữa."],
        ["A", "我同意不能滥用药物，但有些疾病如果不及时用药就会拖久。不少人是因为小感冒拖着不治，结果引起了肺炎。", "Tớ đồng ý không được lạm dụng thuốc, nhưng có những bệnh không dùng thuốc kịp thời sẽ kéo dài. Không ít người cảm nhẹ kéo dài không chữa rồi thành viêm phổi."],
        ["B", "我觉得让我们身体恢复健康主要是靠自己的免疫力和修复力，每天怎么吃、怎么生活才是关键。", "Tớ nghĩ điều giúp cơ thể khỏe lại chủ yếu là sức đề kháng và khả năng tự phục hồi, ăn uống sinh hoạt hàng ngày thế nào mới là mấu chốt."],
        ["A", "我当然相信免疫力的重要性，可是药物不是敌人，而是工具，关键是怎么用。退烧药、止咳药能缓解症状。", "Tớ đương nhiên tin tầm quan trọng của sức đề kháng, nhưng thuốc không phải kẻ thù mà là công cụ, quan trọng là cách dùng. Thuốc hạ sốt, thuốc ho giúp giảm nhẹ triệu chứng."],
        ["B", "你说的也有道理，如果我们一直强撑着不吃药，不仅自己难受，还会影响工作和复习，甚至传染给别人。", "Cậu nói cũng có lý, nếu cứ cố gồng không uống thuốc, chẳng những mình khổ mà còn ảnh hưởng công việc ôn thi, thậm chí lây cho người khác."],
        ["A", "尤其是家里有老人和小孩的时候，病毒防不胜防，小病也要特别小心。", "Nhất là lúc nhà có người già trẻ nhỏ, virus khó phòng lắm, bệnh nhẹ cũng phải cẩn thận."],
        ["B", "所以说到底，不要把“不吃药”绝对化。小病可以先观察、调理；症状重了就该及时看医生，听从专业建议。", "Vậy nói cho cùng, đừng tuyệt đối hóa chuyện 'không uống thuốc'. Bệnh nhẹ thì theo dõi, điều dưỡng; triệu chứng nặng lên phải đi khám kịp thời, nghe lời khuyên chuyên môn."]
      ],
      v2Raw: [
        ["A", "我刷手机看到好多人说，普通的头疼脑热根本不用吃药，靠身体自己扛就能好，你认同这种说法吗？", "Tớ lướt điện thoại thấy nhiều người bảo đau đầu sốt nhẹ thông thường chẳng cần uống thuốc, cứ để cơ thể tự lướt qua là khỏi, cậu có đồng tình không?"],
        ["B", "我觉得这得看具体情况，不能一概而论。像轻度的普通感冒，多喝温水、保证睡眠，确实能靠自然疗法慢慢自愈。", "Tớ thấy chuyện này phải tùy trường hợp, không thể đánh đồng. Như cảm nhẹ bình thường, uống nhiều nước ấm, ngủ đủ giấc, đúng là có thể tự khỏi nhờ cơ chế tự nhiên."],
        ["A", "道理是没错，可有些看着像小感冒，其实是比较厉害的病毒感染啊！要是完全不干预，拖久了症状反而越来越重。", "Lý thuyết đúng là thế, nhưng có những ca trông giống cảm vặt thực chất là nhiễm virus khá nặng đấy! Nếu không can thiệp gì, kéo dài triệu chứng càng nặng thêm."],
        ["B", "确实有这层风险。不过支持不吃药的人也有顾虑：他们怕药物影响自身免疫系统，而且不少感冒药有副作用，吃完犯困，特别耽误工作学习。", "Đúng là có rủi ro đó. Nhưng phe không uống thuốc cũng có cái lo: họ sợ thuốc ảnh hưởng hệ miễn dịch, với nhiều thuốc cảm gây tác dụng phụ buồn ngủ, lỡ hết việc học và làm."],
        ["A", "我非常赞成“不能滥用药物”，但不等于“生病硬扛”。我听说不少人就是发烧拖着不治，结果小感冒硬生生拖成了肺炎！", "Tớ rất tán thành 'không lạm dụng thuốc', nhưng không đồng nghĩa với 'ốm cố chịu'. Tớ nghe nhiều người sốt mà dây dưa không chữa, cuối cùng cảm nhẹ biến thành viêm phổi đấy!"],
        ["B", "哎，这确实太危险了。但话说回来，归根到底恢复健康还是得靠自身的免疫力，平时规律饮食、多锻炼才是最好的预防。", "Chà, thế thì nguy quá. Nhưng nói đi cũng phải nói lại, gốc rễ hồi phục vẫn phải nhờ sức đề kháng tự thân, bình thường ăn uống điều độ, chăm tập thể dục mới là phòng bệnh tốt nhất."],
        ["A", "没错！其实我们不必把药物当成“敌人”，它更像是一种“工具”——像退烧药、止咳药，在医生指导下正确使用，能帮我们快速缓解症状、睡个好觉，身体反而好得更快。", "Chuẩn luôn! Thực ra không cần coi thuốc là 'kẻ thù', nó giống 'công cụ' hơn — như thuốc hạ sốt, giảm ho, dùng đúng theo chỉ dẫn bác sĩ giúp giảm triệu chứng nhanh, ngủ ngon giấc thì cơ thể càng mau hồi phục."],
        ["B", "你说得太在理了！而且人难受得厉害的时候不吃药，不仅复习和工作全砸了，家里有老有小的话，还很容易把病毒传染给他们。", "Cậu nói chí lý quá! Hơn nữa lúc người mệt rũ mà không uống thuốc, chẳng những học hành công việc hỏng bét, mà nhà có người già trẻ nhỏ rất dễ lây virus cho họ."],
        ["A", "就是啊，所以现在医生一般都建议：轻微不适可以先观察、多休息；但一旦高烧不退或持续好几天没好转，就非去医院检查不可。", "Chính thế, nên giờ bác sĩ hay khuyên: khó chịu nhẹ thì theo dõi, nghỉ ngơi thêm; nhưng hễ sốt cao không hạ hoặc kéo dài mấy ngày không đỡ là nhất thiết phải đi viện kiểm tra."],
        ["B", "总结得很到位！科学养病才是最靠谱的——既不盲目乱吃药，也千万别拿身体去赌那“自然会好”的运气。", "Tổng kết chuẩn không cần chỉnh! Chữa bệnh khoa học mới yên tâm nhất — vừa không uống thuốc bừa bãi, vừa tuyệt đối đừng đánh cược sức khỏe vào vận may 'tự khỏi'."]
      ],
      diffReasons: {
        1: "Mở đầu bằng bối cảnh lướt mạng xã hội tự nhiên (“刷手机看到”), gần gũi giao tiếp thi nói.",
        2: "Dùng cụm “不能一概而论” (không thể đánh đồng) cho luận điểm sắc bén.",
        5: "Sửa câu gượng và lồng ghép từ vựng ăn điểm “滥用药物”, “拖着不治”.",
        7: "Tổng hợp mượt ý “药物不是敌人，而是工具” + “缓解症状” + “指导下正确使用”.",
        8: "Lồng ghép từ khóa Bài 3 “全砸了” (hỏng bét) và tình huống lây cho người nhà.",
        9: "Lồng ghép mẫu câu Bài 2 “非……不可” & câu 10 lồng ghép “千万别……”."
      }
    }),

    buildTopic({
      id: "b2-q6",
      no: 6,
      examNo: 6,
      priority: null,
      titleVi: "Bạn chọn hình thức rèn luyện sức khỏe nào? Tại sao?",
      question: "你选择哪一种锻炼身体？为什么？",
      slideQuestions: ["你选择哪一种锻炼？"],
      outline: "Rủ bạn mua giày thể thao → So sánh 2 cách tập: Đi bộ (nhẹ nhàng, dễ duy trì, tốt tiêu hóa) vs Chạy bộ (ra mồ hôi, tăng thể lực, giải tỏa stress) → Lập kế hoạch nhắc nhở nhau kiên trì.",
      takeaways: {
        points: [
          "Lựa chọn của bản thân: Chọn Đi bộ / Chạy bộ / Cầu lông vì phù hợp thể lực và dễ thực hiện mỗi ngày (散步轻松易坚持 / 跑步减压效果明显)",
          "So sánh ưu điểm 2 môn: Đi bộ cường độ vừa phải, hợp người mới bắt đầu; Chạy bộ ra mồ hôi sảng khoái, cải thiện giấc ngủ (强度适中 vs 全身出汗改善睡眠)",
          "Bí quyết không bỏ cuộc: Tìm bạn đồng hành đốc thúc nhau, tránh “ba bữa đực bữa cái” (找搭子互相督促、保持毅力)",
          "Mẫu câu Bài 2: 坚持下来 / 坚持下去 (kiên trì đến giờ / tiếp tục kiên trì), 别提多舒服了"
        ],
        goldenQuotes: "生命在于运动，但最难的不是开始，而是坚持下去。选自己喜欢的项目，最好再找个朋友互相督促。"
      },
      v1Raw: [
        ["A", "小明你周末有空儿吗？跟我一起去买一双鞋子，好吗？", "Tiểu Minh cuối tuần có rảnh không? Đi mua với tớ một đôi giày được không?"],
        ["B", "我记得你已经有很多鞋子了，怎么还再买新的？", "Tớ nhớ cậu có nhiều giày lắm rồi mà, sao lại mua thêm?"],
        ["A", "这次我想买一双运动鞋，最近我每天都早起散散步，现在的鞋子不合适。", "Lần này tớ muốn mua đôi giày thể thao, dạo này sáng nào tớ cũng dậy sớm đi bộ, mấy đôi hiện tại không hợp."],
        ["B", "你也运动吗？我从来没听过你说运动啊，怎么现在又想散步了？", "Cậu cũng tập thể thao à? Tớ chưa nghe cậu nói bao giờ, sao giờ lại muốn đi bộ thế?"],
        ["A", "别提了，最近工作太忙，精神压力大得连睡也睡不着，所以想散散步让精神放松一下。", "Đừng nhắc nữa, dạo này việc bận quá, áp lực tinh thần đến mức mất ngủ luôn, nên muốn đi bộ cho đầu óc thư giãn."],
        ["B", "原来如此！我每天也早起在家附近跑步，已经坚持两个月了，整个人有精神多了。", "Thì ra là vậy! Ngày nào tớ cũng dậy sớm chạy bộ gần nhà, kiên trì được 2 tháng rồi, người tỉnh táo hẳn ra."],
        ["A", "跑步也好，但对刚开始锻炼的人来说有点儿难，我一跑步就喘不过气，还是散步轻松点。", "Chạy bộ cũng tốt nhưng hơi khó với người mới tập, tớ cứ chạy là thở không ra hơi, vẫn thấy đi bộ nhẹ nhàng hơn."],
        ["B", "每个人都有自己的锻炼方式，我觉得跑步出汗以后回家洗个澡，那才叫真正的放松。", "Mỗi người một cách tập, tớ thấy chạy bộ xong vã mồ hôi về tắm một cái mới gọi là thư giãn thực sự."],
        ["A", "我觉得散步也不错，不仅控制体重、帮助消化，而且强度适中，容易坚持，谁都能练。", "Tớ thấy đi bộ cũng hay mà, vừa kiểm soát cân nặng, hỗ trợ tiêu hóa, cường độ lại vừa phải dễ duy trì, ai cũng tập được."],
        ["B", "说是这么说，我也常担心工作一忙就偷懒坚持不下去。生命在于运动，真的需要毅力啊！", "Nói thì thế nhưng tớ cũng hay lo bận việc lại lười không kiên trì tiếp được. Sự sống nằm ở vận động, đúng là cần nghị lực thật!"],
        ["A", "不如我们定个计划互相监督吧：你偷懒的时候我提醒你，我想放弃的时候你鼓励我！", "Hay mình lên kế hoạch giám sát nhau đi: lúc cậu lười tớ nhắc, lúc tớ nản cậu cổ vũ!"],
        ["B", "好主意！那明天就从一起去买运动鞋开始吧！", "Ý kiến hay! Vậy mai bắt đầu từ việc đi mua giày thể thao cùng nhau nhé!"]
      ],
      v2Raw: [
        ["A", "小明，这周末有空吗？陪我去逛逛商场、挑双鞋呗？", "Tiểu Minh, cuối tuần này rảnh không? Đi trung tâm thương mại với tớ chọn đôi giày đi?"],
        ["B", "我记得你鞋柜都快塞满了吧，怎么又要买新鞋呀？", "Tớ nhớ tủ giày nhà cậu chật cứng rồi cơ mà, sao lại định mua thêm thế?"],
        ["A", "这次不一样，我想挑双正经的运动鞋！最近每天早起散步，以前穿的休闲鞋太磨脚了。", "Lần này khác nhé, tớ định chọn đôi giày thể thao tử tế! Dạo này sáng nào cũng dậy sớm đi bộ, mấy đôi giày đi chơi cũ đau chân quá."],
        ["B", "哟，太阳打西边出来了？以前从来没听你提过运动，怎么突然想起来去散步啦？", "Ồ, nay mặt trời mọc đằng tây à? Trước giờ có thấy cậu nhắc tập tành gì đâu, sao tự dưng lại đi bộ thế?"],
        ["A", "哎，别提多难受了！最近工作压力大，夜里经常失眠，医生建议多出来走走，透透气、放空一下脑子。", "Haiz, khó chịu khỏi nói luôn! Dạo này áp lực công việc quá, đêm hay mất ngủ, bác sĩ khuyên ra ngoài đi bộ cho thoáng người, thả lỏng đầu óc."],
        ["B", "怪不得！我自己每天早上也绕着小区跑步，算下来都坚持下来两个多月了，现在白天精神头足得很！", "Thảo nào! Tớ sáng nào cũng chạy vòng quanh khu nhà, tính ra kiên trì được hơn hai tháng rồi, giờ ban ngày tinh thần sung sức lắm!"],
        ["A", "跑步减脂是快，可对我这种刚起步的“运动小白”来说门槛太高了，跑两步就喘不上气，还是散步更适合我。", "Chạy bộ đốt mỡ nhanh thật, nhưng với 'tấm chiếu mới' như tớ thì hơi quá sức, chạy vài bước đã hụt hơi, vẫn thấy đi bộ hợp với tớ hơn."],
        ["B", "选对适合自己的项目最重要！我喜欢跑步后浑身大汗淋漓的感觉，回家冲个热水澡，那叫一个痛快！", "Chọn được môn hợp với mình là quan trọng nhất! Tớ thích cảm giác chạy xong mồ hôi nhễ nhại, về tắm nước nóng một cái, sảng khoái cực kỳ!"],
        ["A", "其实散步的好处也不少：不仅不伤膝盖、帮助消化，还能一边听播客或者和朋友聊天，强度适中，最容易长期坚持。", "Thực ra đi bộ cũng nhiều cái lợi lắm: vừa không hại đầu gối, hỗ trợ tiêu hóa, lại vừa nghe podcast hay tán gẫu với bạn được, cường độ vừa phải dễ theo lâu dài nhất."],
        ["B", "确实，不管是跑步还是散步，最怕的就是“三分钟热度”，工作一忙就不想继续坚持下去了。", "Đúng thế, dù chạy hay đi bộ thì đáng sợ nhất vẫn là 'cả thèm chóng chán', việc bận cái là chẳng muốn kiên trì tiếp."],
        ["A", "要不咱俩做个运动搭子互相监督吧？以后谁想偷懒，另一个就发微信督促他出门，怎么样？", "Hay hai đứa làm bạn đồng hành giám sát nhau đi? Sau này ai định lười thì người kia nhắn WeChat giục ra khỏi nhà, thấy sao?"],
        ["B", "太靠谱了！有搭子陪着一定能坚持下来，周六一早咱先去买装备！", "Chí lý quá! Có bạn đồng hành chắc chắn theo được, sáng thứ 7 mình đi sắm đồ trước nhé!"]
      ],
      diffReasons: {
        4: "Thêm thành ngữ khẩu ngữ sinh động “太阳打西边出来了？” khi ngạc nhiên trước thói quen mới của bạn.",
        5: "Sửa lỗi ngữ pháp “压力得连睡也睡不着” -> lồng ghép “别提多难受了” (Bài 2) và kể tự nhiên chuyện bác sĩ khuyên.",
        6: "Bỏ “原来如此”, thay bằng “怪不得！” + lồng ghép mẫu câu Bài 2 “坚持下来”.",
        7: "Dùng từ vựng hiện đại rất đời thường “运动小白” (người mới tập) & sửa “喘不出气” thành “喘不上气”.",
        10: "Dùng thành ngữ “三分钟热度” (nhiệt huyết 3 phút) + mẫu câu Bài 2 “坚持下去”.",
        11: "Đưa văn hóa giới trẻ TQ “运动搭子” (bạn tập thể thao cùng) vào làm bài thoại hiện đại, tự nhiên."
      }
    })
  ],

  // ================= BÀI 3 =================
  3: [
    buildTopic({
      id: "b3-q9",
      no: 9,
      examNo: 9,
      priority: "yellow",
      titleVi: "Thói quen ăn uống gia đình & Món tủ tự nấu",
      question: "说一下你家的饮食习惯。",
      slideQuestions: ["你会做饭吗？介绍你的拿手菜。"],
      outline: "Hỏi thăm thói quen ăn uống của gia đình (khẩu vị thanh đạm, ít dầu mỡ, nhiều rau, thói quen uống canh trước bữa) → Mở rộng hỏi có biết nấu ăn không & giới thiệu món tủ (拿手菜) → Hẹn dịp mời bạn qua nhà ăn thử.",
      takeaways: {
        points: [
          "Đặc trưng cơm nhà: Thanh đạm, ít dầu mỡ/đồ chiên rán, cân bằng dinh dưỡng thịt-cá-rau-canh (清淡、少油腻、饮食均衡)",
          "Thói quen đặc biệt: Luôn có món canh trên mâm cơm, thích uống chút canh trước khi ăn cho dễ tiêu (每顿都有汤、饭前喝汤助消化)",
          "Bổ sung câu Slide (Bạn có biết nấu ăn không / Món tủ): Tự nấu ăn theo thói quen nhà, món tủ như sườn xào chua ngọt / canh chua / trứng xào cà chua (拿手菜、有两下子)",
          "Mẫu câu Bài 3: V+惯 (đã quen ăn...), 看来 (xem ra), 大饱口福 (ăn uống thỏa thuê), 有两下子 (có nghề)"
        ],
        goldenQuotes: "我们家吃惯了清淡的家常菜，每顿必须有一碗热汤。我的拿手菜是番茄炒蛋，下次来我家让你大饱口福！"
      },
      v1Raw: [
        ["A", "小王，你好！最近怎么样？", "Tiểu Vương, chào cậu! Dạo này sao rồi?"],
        ["B", "我很好，谢谢！杨哥你呢？", "Tớ khỏe, cảm ơn! Còn anh Dương thì sao?"],
        ["A", "我也挺好的。对了，我想聊一聊，你家的饮食习惯是什么样的？", "Anh cũng ổn. À, anh muốn hỏi chút, thói quen ăn uống nhà em thế nào?"],
        ["B", "嗯，我们家比较注重健康饮食，平时菜都很清淡，而且喜欢多吃蔬菜和水果。我们全家都不太能吃辣。", "Ừm, nhà em khá chú trọng ăn uống lành mạnh, bình thường món ăn thanh đạm, thích ăn nhiều rau quả. Cả nhà đều không ăn được cay lắm."],
        ["A", "听起来真不错！那你们家一般都做些什么菜呢？", "Nghe hay đấy! Thế nhà em hay nấu những món gì?"],
        ["B", "一般就是些家常菜，比如炒青菜、蒸鱼或者豆腐。我们家很少吃油炸或者太油腻的东西。你家呢？", "Thường là mấy món cơm nhà thôi, như rau xào, cá hấp hoặc đậu phụ. Nhà em ít ăn đồ chiên hay quá dầu mỡ. Còn nhà anh?"],
        ["A", "我们家也差不多，很注重饮食均衡，蔬菜水果也是每天都吃。", "Nhà anh cũng na ná vậy, chú trọng cân bằng dinh dưỡng, rau quả ngày nào cũng ăn."],
        ["B", "那你们家有什么特别的饮食习惯吗？", "Thế nhà anh có thói quen ăn uống gì đặc biệt không?"],
        ["A", "有一个！我们家每顿饭都一定要有汤。我们觉得饭前喝点儿汤对身体好，也能帮助消化。", "Có đấy! Nhà anh bữa nào cũng nhất định phải có canh. Cả nhà thấy uống chút canh trước bữa vừa tốt cho sức khỏe vừa dễ tiêu hóa."],
        ["B", "原来如此，这可能是南方人的习惯吧！那杨哥你自己会做饭吗？有什么拿手菜吗？", "Thì ra vậy, chắc thói quen người miền Nam đấy! Thế anh Dương biết nấu ăn không? Có món tủ nào không?"],
        ["A", "我平常自己也下厨，最拿手的是清蒸鱼和玉米排骨汤，大家尝过都说有两下子呢！", "Anh bình thường cũng hay vào bếp, món tủ nhất là cá hấp xì dầu với canh sườn bắp, mọi người ăn xong đều khen anh cũng có nghề đấy!"],
        ["B", "听起来真让人羡慕！下次有机会，我一定要去尝尝你的手艺，大饱口福一下！", "Nghe mà thèm quá! Lần sau có dịp nhất định em phải qua nếm thử tay nghề anh để thỏa sức ăn ngon một bữa!"]
      ],
      v2Raw: [
        ["A", "小王，最近忙啥呢？看你精神挺足的！", "Tiểu Vương, dạo này bận gì đấy? Trông em có vẻ sung sức lắm!"],
        ["B", "还行杨哥，主要最近在家吃住规律。哥你呢，平时都在外边吃还是在家自己做？", "Cũng ổn anh Dương ạ, chủ yếu dạo này ăn ngủ điều độ ở nhà. Còn anh, bình thường hay ăn ngoài hay tự nấu?"],
        ["A", "我尽量回家吃！说起来，你家的饮食习惯是什么样的，偏重口味还是清淡点儿？", "Anh cố gắng về nhà ăn! Nói đến đây, thói quen ăn uống nhà em thế nào, thích đậm vị hay thanh đạm?"],
        ["B", "我们全家都吃惯了清淡的菜，平时特别注意少油少盐，每顿少不了青菜，而且家里没一个人能吃辣。", "Cả nhà em đều ăn quen đồ thanh đạm rồi, bình thường đặc biệt chú ý ít dầu ít muối, bữa nào cũng phải có rau xanh, mà chẳng ai trong nhà ăn được cay."],
        ["A", "这习惯真健康！那你们家饭桌上平时一般做什么菜呀？", "Thói quen này lành mạnh quá! Thế mâm cơm nhà em bình thường hay nấu món gì?"],
        ["B", "都是些家常菜，像蒜蓉炒青菜、清蒸鱼、嫩豆腐汤，很少碰油炸和太油腻的东西。杨哥你家呢？", "Toàn món cơm nhà giản dị thôi, như rau xanh xào tỏi, cá hấp, canh đậu hũ non, hiếm khi đụng đồ chiên rán quá ngấy. Còn nhà anh Dương?"],
        ["A", "我们家也差不多，荤素搭配讲究饮食均衡，不过我爸妈还有个特别坚持的习惯——每顿饭桌中间必须摆一碗汤！", "Nhà anh cũng tương tự, mặn chay cân đối đủ dinh dưỡng, nhưng bố mẹ anh có một thói quen cực kỳ giữ vững: giữa mâm cơm bữa nào cũng phải có một bát canh!"],
        ["B", "对，我也听说饭前先喝两口热汤特别养胃，还能帮助消化，这是不少南方家庭的习惯呢！", "Chuẩn luôn, em cũng nghe nói uống vài ngụm canh nóng trước bữa rất tốt cho dạ dày lại dễ tiêu, đúng kiểu thói quen nhiều gia đình miền Nam!"],
        ["A", "哈哈，看来你挺懂行的！那受家里影响，你自己平时会做饭吗？有啥拿手菜？", "Haha, xem ra em rành phết đấy! Thế chịu ảnh hưởng từ nhà, bình thường em có biết nấu cơm không? Có món tủ nào không?"],
        ["B", "我倒真学了几手，最拿手的是糖醋排骨和番茄炒蛋。家里人平时要么吃我炒的菜，要么叫外卖换换口味，不过还是我做的更合胃口！", "Em cũng học lỏm được vài món đấy, tủ nhất là sườn xào chua ngọt với trứng xào cà chua. Người nhà bình thường hoặc ăn cơm em nấu, hoặc đặt đồ ngoài đổi vị, nhưng vẫn khen đồ em làm hợp miệng hơn!"],
        ["A", "厉害啊小王，没想到你在厨房这么有两下子！我平时只会煮个面。", "Đỉnh thế Tiểu Vương, không ngờ vào bếp em cũng có nghề gớm! Anh bình thường chỉ biết nấu mì thôi."],
        ["B", "杨哥太谦虚了！周末来我家吃饭吧，我亲自下厨给你露一手，保证让你大饱口福！", "Anh Dương khiêm tốn quá! Cuối tuần qua nhà em ăn cơm đi, em tự tay trổ tài mời anh một bữa, đảm bảo cho anh ăn no nê đã đời!"]
      ],
      diffReasons: {
        3: "Gắn kết mạch chuyện tự nhiên và đi thẳng vào chủ đề thói quen ăn uống gia đình.",
        4: "Lồng ghép mẫu câu Bài 3 “吃惯了” (ăn quen rồi) + sửa lỗi lặp trong bản cũ.",
        6: "Sửa 2 dòng cuối bị ghi nhầm cùng vai A ở bản Google Doc, tạo đối đáp ăn khớp A-B.",
        9: "Lồng ghép mẫu câu Bài 3 “看来” (xem ra) + dẫn tự nhiên sang câu hỏi Slide cô giáo (“你会做饭吗？拿手菜”).",
        10: "Lồng ghép mẫu câu Bài 3 “要么……要么……” và miêu tả món tủ (糖醋排骨、番茄炒蛋).",
        11: "Lồng ghép mẫu câu Bài 3 “有两下子” (có nghề / có bản lĩnh).",
        12: "Lồng ghép mẫu câu Bài 3 “大饱口福” (thỏa thuê ăn ngon)."
      }
    }),

    buildTopic({
      id: "b3-q10",
      no: 10,
      examNo: 10,
      priority: null,
      titleVi: "Kể trải nghiệm một lần mời khách & Cách gọi món khi mời",
      question: "请说一说你的一次请客的经历。",
      slideQuestions: ["请客时，怎么点菜？"],
      outline: "Chia sẻ kỷ niệm lần đầu mời khách (chuẩn bị chu đáo: báo giờ, đón tiếp, sắp xếp chỗ ngồi) → Chia sẻ bí quyết gọi món khi mời khách (hỏi khẩu vị/kiêng kỵ trước, cân bằng nóng-lạnh-canh-rau) → Chốt ý nghĩa của việc mời khách.",
      takeaways: {
        points: [
          "Trải nghiệm mời khách thực tế: Mời bạn bè/người thân ăn mừng; chuẩn bị từ gửi địa chỉ rõ ràng, ra cửa đón đến dặn trước giờ đi (明确时间地点、提前迎客)",
          "Bí quyết gọi món (Slide): Hỏi trước xem khách có kiêng hay dị ứng gì không; gọi vừa đủ, kết hợp món mặn-nhạt-canh-rau tránh lãng phí (先问忌口、荤素搭配、点菜适度)",
          "Ý nghĩa mời khách: Quan trọng không phải mâm cao cỗ đầy đắt tiền, mà là sự trân trọng và không khí ấm cúng (重在心意、气氛融洽、别弄砸了)",
          "Mẫu câu Bài 3: 好说 (dễ bàn thôi), 弄砸 (làm hỏng chuyện), 大饱口福 (ăn đã đời)"
        ],
        goldenQuotes: "请客最重要的是让客人觉得舒服、受重视。点菜前先问清大家的忌口，荤素搭配好，别怕花心思弄砸了气氛。"
      },
      v1Raw: [
        ["A", "明明，我妹妹考上大学了，我家打算周末宴请亲戚朋友庆祝，但我从来没有请客过，不知道怎么办？", "Minh Minh, em gái tớ đỗ đại học rồi, nhà tớ định cuối tuần mời họ hàng bạn bè ăn mừng, nhưng tớ chưa từng đứng ra mời khách bao giờ, chẳng biết làm sao nữa?"],
        ["B", "我以前经历过一次请客，也当过很多次客人。我觉得请客是一件很有意义的事情。", "Tớ trước từng có một lần đứng ra mời khách, cũng đi làm khách nhiều lần rồi. Tớ thấy mời khách là việc rất có ý nghĩa đấy."],
        ["A", "太好了！那次请客的时候，你是怎么准备和招待客人的？", "Hay quá! Lần mời khách đó cậu chuẩn bị và tiếp đón mọi người thế nào?"],
        ["B", "我先提前发了明确的时间和地点，清楚地指了路，那天还早到半小时在门口迎接大家。", "Tớ gửi trước thời gian địa điểm thật rõ ràng, chỉ đường cẩn thận, hôm đó còn đến sớm nửa tiếng đứng ở cửa đón mọi người."],
        ["A", "只请一顿饭，一定要派人在门口接人吗？我以为客人想吃什么点什么就行了。", "Chỉ mời một bữa cơm thôi mà nhất thiết phải đứng ở cửa đón à? Tớ tưởng khách thích ăn gì gọi nấy là xong chứ."],
        ["B", "那可不行。既然请了客，就应该好好招待，尤其是对长辈更要注意礼貌。先安排好座位，再热心问大家口味。", "Thế thì không ổn đâu. Đã mời khách thì phải tiếp đón chu đáo, nhất là người lớn tuổi càng phải giữ lễ phép. Xếp chỗ ngồi xong xuôi rồi nhiệt tình hỏi khẩu vị mọi người."],
        ["A", "对哦，那请客的时候到底怎么点菜才合适呢？我最怕点得不合大家胃口。", "Đúng rồi, thế lúc mời khách rốt cuộc gọi món thế nào cho khéo? Tớ sợ nhất gọi không hợp miệng mọi người."],
        ["B", "点菜好说！先问大家有没有不吃辣或者忌口的，再按照人数点：有荤有素、有凉有热，再来一锅好喝的汤，肯定不会出错。", "Gọi món dễ ẹc! Trước hết hỏi mọi người xem có ai không ăn cay hay kiêng gì không, rồi căn theo số người mà gọi: có món mặn món chay, món nguội món nóng, thêm nồi canh ngon nữa là chắc chắn không sai được."],
        ["A", "原来如此！以前我总以为请客就是花钱吃饭，现在才知道最重要的是让客人觉得舒服、被重视。", "Thì ra vậy! Trước tớ cứ tưởng mời khách chỉ là bỏ tiền ra ăn, giờ mới biết quan trọng nhất là để khách thấy thoải mái và được trân trọng."],
        ["B", "没错，只要用心照顾好气氛，大家聊得开心，这顿饭就算成功了。", "Đúng thế, chỉ cần để tâm chăm chút không khí, mọi người trò chuyện vui vẻ là bữa cơm coi như thành công rồi."],
        ["A", "谢谢你的经验，有你指点我心里踏实多了！周末有空也欢迎你一起来吃顿便饭啊。", "Cảm ơn kinh nghiệm của cậu, có cậu chỉ dẫn tớ yên tâm hẳn! Cuối tuần rảnh mời cậu cùng qua ăn bữa cơm thân mật nhé."],
        ["B", "一定到场，预祝你妹妹前程似锦，祝你首次请客圆满成功！", "Nhất định có mặt, chúc em gái cậu tương lai rạng rỡ, chúc lần đầu mời khách của cậu thành công mỹ mãn!"]
      ],
      v2Raw: [
        ["A", "明明，我妹妹刚拿到大学录取通知书！家里打算这周末请亲戚朋友吃顿饭庆祝一下，可我头一回张罗请客，心里真没底。", "Minh Minh, em gái tớ vừa nhận được giấy báo trúng tuyển đại học! Nhà định cuối tuần này mời họ hàng bạn bè ăn bữa cơm mừng, mà tớ lần đầu đứng ra tổ chức mời khách, thấy lo ghê."],
        ["B", "嗨，这事好说！其实我上个月刚张罗过一次家庭聚餐，最有心得了，说到底就是用心二字。", "Ôi, chuyện này dễ bàn thôi! Tháng trước tớ vừa đứng ra tổ chức một bữa tiệc gia đình xong, rút ra nhiều kinh nghiệm lắm, nói cho cùng gói gọn ở chữ 'tận tâm'."],
        ["A", "那太好了！快跟我讲讲，你那次请客从头到尾是怎么安排的？", "Tuyệt quá! Kể tớ nghe ngay đi, lần đó cậu thu xếp từ đầu đến cuối thế nào?"],
        ["B", "我提前两天就把餐厅定位和时间发群里了，还特意早到二十分钟去包厢空调、茶水都备好，亲戚长辈一到门口我就亲自迎进去。", "Trước hai hôm tớ đã gửi định vị quán và giờ giấc lên nhóm, hôm đó cố tình tới sớm 20 phút chuẩn bị phòng riêng, điều hòa, trà nước sẵn sàng; họ hàng người lớn vừa tới cửa là tớ ra đón tận nơi."],
        ["A", "哇，这么讲究呀？我原本以为请客不就是订好桌，大家坐下来点菜吃饭嘛，原来细节这么多。", "Ồ, cầu kỳ vậy cơ à? Tớ vốn tưởng mời khách chỉ là đặt bàn, mọi người ngồi xuống gọi món ăn thôi chứ, hóa ra lắm tiểu tiết thế."],
        ["B", "可不是嘛！客人推掉别的事来捧场，就是给咱们面子，特别是长辈，更得显得热情周到，不然很容易把气氛弄砸。", "Chứ còn gì nữa! Khách gác việc khác qua chung vui là nể mặt mình lắm rồi, nhất là bậc lớn tuổi càng phải chu đáo nhiệt tình, kẻo dễ làm hỏng không khí lắm."],
        ["A", "受教了！那到最头疼的一步了——请客时该怎么点菜才显得得体又不浪费？", "Mở mang tầm mắt thật! Thế đến bước đau đầu nhất — lúc mời khách nên gọi món thế nào cho vừa khéo lại không lãng phí?"],
        ["B", "我一般有三个原则：第一，先问清楚客人的口味和忌口，比如有人吃不惯辣或者不吃海鲜；第二，荤素凉热搭配着点，照顾老人小孩；第三，菜量按“人数加一”就够了，重在让大家大饱口福又不剩菜。", "Tớ thường theo 3 nguyên tắc: Một là hỏi rõ khẩu vị và món kiêng của khách trước, ví dụ có ai không quen ăn cay hay dị ứng hải sản không; Hai là kết hợp món mặn-chay-nguội-nóng cho hợp cả người già trẻ nhỏ; Ba là gọi số món bằng 'số người cộng một' thôi, cốt sao ai cũng được ăn ngon thỏa thích mà không thừa mứa."],
        ["A", "听你这么一拆解，我豁然开朗！请客真不是比谁花钱多，而是比谁心思细、能让客人觉得舒坦受重视。", "Nghe cậu phân tích xong tớ thông suốt hẳn! Mời khách đâu phải thi xem ai chi nhiều tiền, mà ở chỗ tinh tế để khách thấy dễ chịu và được tôn trọng."],
        ["B", "对头！记住吃饭时多给大家夹夹菜、照顾一下冷场的客人，别光顾着自己低头吃就行。", "Chuẩn luôn! Nhớ lúc ăn thỉnh thoảng gắp đồ ăn mời mọi người, để ý bắt chuyện với khách nào hơi ít nói, đừng chỉ cắm cúi ăn phần mình là ổn."],
        ["A", "太实用了！这周末聚餐要是办得妥妥当当的，全靠你这位军师！对了，周六晚上你也一起来喝两杯吧？", "Hữu ích quá! Cuối tuần này tiệc mà suôn sẻ là nhờ cả quân sư cậu đấy! À, tối thứ 7 cậu cũng qua làm vài ly cùng nhé?"],
        ["B", "哈哈，这邀请我可不客气了，一定准时去给你帮衬场子！", "Haha, lời mời này tớ không khách sáo đâu, nhất định tới đúng giờ phụ cậu tiếp khách!"]
      ],
      diffReasons: {
        1: "Sửa lỗi sai ngữ pháp câu 1 bản gốc (“不知道这么办” -> “心里真没底”) + mô tả bối cảnh tự nhiên.",
        2: "Lồng ghép mẫu câu Bài 3 “好说” (dễ thu xếp thôi) + kể lại trải nghiệm thực tế sinh động.",
        6: "Lồng ghép mẫu câu Bài 3 “弄砸” (làm hỏng chuyện).",
        8: "Bổ sung trọn vẹn bí quyết cho câu hỏi Slide (“请客时，怎么点菜？”) + lồng ghép “吃不惯” và “大饱口福” (Bài 3)."
      }
    }),

    buildTopic({
      id: "b3-q11",
      no: 11,
      examNo: 11,
      priority: null,
      titleVi: "Nam nữ đi ăn cùng nhau, ai nên là người trả tiền?",
      question: "男生和女生一起去吃饭时，你认为谁应该买单？",
      slideQuestions: ["女生都认为男生应该付钱，你怎么看？"],
      outline: "Dẫn dắt từ bữa ăn chung → Nêu 2 luồng quan điểm (quan điểm truyền thống: nam trả thể hiện ga-lăng vs quan điểm hiện đại: bình đẳng AA hoặc luân phiên mời) → Chốt giải pháp khéo léo: Lần đầu ai rủ/nam chủ động, sau đó chia AA hoặc mời qua lại.",
      takeaways: {
        points: [
          "Quan điểm truyền thống: Bạn nam chủ động trả tiền thể hiện sự lịch sự, ga-lăng và tôn trọng bạn nữ (男方主动买单，显得大方有担当)",
          "Quan điểm hiện đại & Bình đẳng: Ngày nay nam nữ đều độc lập tài chính; nếu luôn để bạn nam trả, bạn nữ cũng ngại và mang tâm lý mắc nợ (经济独立、一直让男生付会不好意思)",
          "Cách giải quyết tinh tế nhất: Ai chủ động hẹn trước hoặc buổi gặp đầu tiên nên trả; về sau quen rồi thì chia AA hoặc bữa này anh mời, bữa sau em mời trà sữa (谁请客谁买单 / 你请吃饭我请咖啡)",
          "Mẫu câu Bài 3: 看来 (xem ra), 要么……要么…… (hoặc... hoặc...), 好说 (dễ bàn thôi)"
        ],
        goldenQuotes: "第一次见面或谁主动约就谁买单，表达诚意；熟了以后要么AA制，要么你请吃饭我请喝奶茶，谁都不吃亏也不尴尬。"
      },
      v1Raw: [
        ["A", "这家店味道不错吧？", "Quán này vị ngon đấy chứ?"],
        ["B", "环境也很好。谢谢你请我吃饭啦！", "Không gian cũng đẹp nữa. Cảm ơn cậu đã mời tớ ăn cơm nhé!"],
        ["A", "哈哈，不客气。男生请女生吃饭不是应该的吗？", "Haha, đừng khách sáo. Con trai mời con gái ăn cơm chẳng phải chuyện đương nhiên sao?"],
        ["B", "哎，其实我一直想跟你聊这个话题。你真的觉得男生就“应该”请客吗？", "Này, thực ra tớ vẫn muốn bàn với cậu chuyện này. Cậu thật sự nghĩ con trai là 'đương nhiên phải' trả tiền à?"],
        ["A", "我觉得如果男生约女生吃饭，那就该买单，算是一种礼貌和担当吧。", "Tớ thấy nếu con trai hẹn con gái đi ăn thì nên thanh toán, coi như phép lịch sự và sự ga-lăng."],
        ["B", "但是现在男女都经济独立了，总认为男生“必须”付钱，是不是有点太传统了？", "Nhưng giờ nam nữ đều độc lập kinh tế rồi, cứ nghĩ con trai 'bắt buộc' trả tiền liệu có hơi truyền thống quá không?"],
        ["A", "你说得也对。不过在感情刚开始的时候，男生主动一点，确实能让女生觉得被重视。", "Cậu nói cũng đúng. Nhưng lúc mới bắt đầu tìm hiểu, con trai chủ động một chút đúng là khiến con gái thấy được trân trọng."],
        ["B", "对啊，但如果每次一起吃饭都让男的付钱，我自己也会觉得不好意思，好像欠人情一样。", "Đúng thế, nhưng nếu lần nào đi ăn cũng để bạn nam trả tiền, chính tớ cũng thấy ngại lắm, cứ như mắc nợ ân tình vậy."],
        ["A", "其实我有时候也纠结，怕直接提AA制显得小气或者不够礼貌。你说怎么做才最妥当呢？", "Thực ra thỉnh thoảng tớ cũng lăn tăn, sợ nói thẳng chia AA lại tỏ ra ki bo hay thiếu lịch sự. Theo cậu làm thế nào mới khéo nhất?"],
        ["B", "我觉得第一次见面男的买单表达诚意没问题；以后熟悉了，要么AA制，要么轮流请客，你请吃饭我请喝咖啡。", "Tớ thấy lần đầu gặp bạn nam trả tiền tỏ thành ý rất ổn; sau này quen rồi thì hoặc chia AA, hoặc thay phiên nhau mời, cậu mời cơm tớ mời cà phê."],
        ["A", "这办法太公平了！既照顾了面子，又体现了男女平等。", "Cách này công bằng quá! Vừa giữ thể diện, vừa thể hiện bình đẳng nam nữ."],
        ["B", "那说好了，旁边新开了一家咖啡店，一会儿喝咖啡这顿换我买单！", "Thế chốt nhé, bên cạnh mới mở quán cà phê, lát nữa chầu cà phê đổi lại để tớ thanh toán!"]
      ],
      v2Raw: [
        ["A", "怎么样，这家新开的馆子合你胃口吗？", "Sao nào, quán mới mở này có hợp khẩu vị cậu không?"],
        ["B", "菜很地道，环境也舒心，多谢你破费请客啦！", "Món ăn chuẩn vị lắm, không gian cũng dễ chịu, cảm ơn cậu đã tốn kém khao tớ nhé!"],
        ["A", "客气啥！再说了，跟女生出来吃饭，男孩子主动买单不是天经地义的事嘛。", "Khách sáo gì! Với lại đi ăn với con gái, con trai chủ động trả tiền chẳng phải chuyện đương nhiên à."],
        ["B", "哎，正好聊到这儿，我就想问你：现在好多女生觉得男生付钱理所应当，你心里真这么看，还是觉得有点冤？", "Này, đúng lúc nói tới chuyện này tớ muốn hỏi thật: giờ nhiều bạn nữ cứ mặc định con trai phải trả tiền, trong lòng cậu nghĩ thế thật hay cũng thấy hơi thiệt?"],
        ["A", "分人也分场合吧。如果是我主动约出来的，买单是基本的礼貌和绅士风度，我心甘情愿。", "Tùy người tùy dịp chứ. Nếu là tớ chủ động mở lời rủ đi, trả tiền là phép lịch sự tối thiểu và phong độ đàn ông, tớ hoàn toàn tự nguyện."],
        ["B", "这倒是。可我不太认同“男生必须次次买单”这种老观念，毕竟现在大家都是学生或者各自有工作，谁的钱也不是大风刮来的。", "Cái đó thì đúng. Nhưng tớ không đồng tình kiểu quan niệm cũ 'con trai lần nào cũng phải trả', dù sao giờ mọi người đều là sinh viên hoặc đi làm cả rồi, tiền của ai cũng đâu phải tự nhiên rơi xuống."],
        ["A", "看来你挺独立的！确实，有些男生嘴上说无所谓，其实天天被当“提款机”心里也别扭；反过来直接提AA吧，又怕女生觉得自己小气。", "Xem ra cậu rất độc lập đấy! Đúng thật, nhiều ông con trai miệng bảo không sao chứ ngày nào cũng bị coi như 'cây ATM' trong lòng cũng khó chịu; ngược lại mở miệng đòi chia AA ngay lại sợ bạn nữ nghĩ mình ki bo."],
        ["B", "太真实了！所以我跟朋友甚至约会对象出门，从来不让对方单方面一直付钱，老吃白食我心里不踏实，尴尬得很。", "Chuẩn không cần chỉnh! Thế nên tớ đi chơi với bạn bè hay cả đối tượng hẹn hò, chẳng bao giờ để một phía cứ trả mãi, ăn chực mãi trong lòng thấy bất an, ngại chết đi được."],
        ["A", "那按你的经验，怎么处理才显得双方都体面、不伤感情？", "Thế theo kinh nghiệm của cậu, xử lý sao cho đôi bên đều đẹp mặt mà không sứt mẻ tình cảm?"],
        ["B", "好说呀！要么头一回见面或谁主动发起就谁买单，展现一下诚意；熟络之后要么直接AA，要么“你请正餐、我买奶茶”，轮流回请最舒服！", "Dễ xử lý mà! Hoặc lần đầu gặp hay ai chủ động rủ thì người đó trả để tỏ thành ý; thân rồi thì hoặc chia AA thẳng, hoặc 'anh mời bữa chính, em mua trà sữa', luân phiên đáp lễ là thoải mái nhất!"],
        ["A", "高明！这招既保留了男生的担当，又让女生觉得平等尊重，双方都没压力。", "Cao tay! Chiêu này vừa giữ được sự ga-lăng cho bạn nam, vừa để bạn nữ thấy bình đẳng tôn trọng, hai bên đều nhẹ đầu."],
        ["B", "那今天咱就从这儿开始实行！待会儿出门右转那家奶茶店，这杯我请定了，不许跟我抢！", "Vậy hôm nay mình áp dụng luôn từ đây! Lát ra cửa rẽ phải có quán trà sữa, chầu này nhất định tớ khao, cấm tranh giành với tớ đấy!"]
      ],
      diffReasons: {
        3: "Nâng cấp thành ngữ tự nhiên “天经地义” (chuyện đương nhiên).",
        4: "Đưa đúng câu hỏi trọng tâm trên Slide cô giáo (“女生都认为男生应该付钱，你怎么看？”) vào thoại.",
        6: "Thêm thành ngữ khẩu ngữ rất hay “谁的钱也不是大风刮来的” (tiền của ai cũng chẳng phải gió thổi tới).",
        7: "Lồng ghép mẫu câu Bài 3 “看来” + từ khóa hiện đại “提款机” (cây ATM).",
        10: "Lồng ghép chuẩn 2 mẫu câu Bài 3 “好说” và “要么……要么……” + giải pháp thực tế đời sống giới trẻ."
      }
    }),
  ],

  // ================= BÀI 5 =================
  5: [
    buildTopic({
      id: "b5-q12",
      no: 12,
      examNo: 12,
      priority: null,
      titleVi: "Đi sinh nhật bạn nên tặng gì & Kiêng kỵ không được tặng gì?",
      question: "参加别人的生日会，你会送什么？什么是不可以送人的？",
      outline: "Rủ nhau chuẩn bị quà sinh nhật cho bạn → Gợi ý quà phù hợp (sách, phụ kiện, hoa, đồ dùng thiết thực theo sở thích) → Lưu ý những món kiêng kỵ trong văn hóa (đồng hồ 送终, ô/dù 散, hoa trắng 白花, mũ xanh 绿帽子) → Chốt chọn món quà tinh tế.",
      takeaways: {
        points: [
          "Quà nên tặng khi đi sinh nhật: Chọn theo sở thích và tính thiết thực như sách, ví, quần áo, mỹ phẩm, hoa tươi hoặc bánh (看个人爱好和实用性：书、钱包、花)",
          "Những món ĐẠI KỴ (nhất định phải nhớ khi thi!): 1. Đồng hồ (送钟 đồng âm 送终 tiễn đưa người mất); 2. Ô/Dù (送伞 đồng âm 散 chia ly); 3. Hoa trắng/Cúc trắng (白花 tang lễ); 4. Mũ xanh (绿帽子 ý bị cắm sừng); 5. Quả lê chia đôi (分梨 đồng âm 分离 chia lìa)",
          "Nguyên tắc chọn quà: Giá trị không cần quá đắt, cốt ở tấm lòng và hợp văn hóa người nhận (心意最重要、懂忌讳)",
          "Mẫu câu Bài 5: 除非……否则…… (trừ phi... nếu không thì), 有什么可……的 (có gì đáng...), 选中 (chọn trúng)"
        ],
        goldenQuotes: "给中国朋友送生日礼物，千万避开钟表、雨伞、白花和绿帽子这些谐音不吉利的东西。只要选中对方喜欢的实用小物，心意就到了。"
      },
      v1Raw: [
        ["A", "明明，明天晚上你去参加小李的生日会吗？", "Minh Minh, tối mai cậu có đi tiệc sinh nhật Tiểu Lý không?"],
        ["B", "去啊，我打算今天给他准备一份生日礼物，但是想了半天也不知道送什么好。一般生日人们会送什么？", "Có chứ, tớ định hôm nay chuẩn bị cho cậu ấy một món quà, mà nghĩ cả buổi vẫn chẳng biết tặng gì. Bình thường sinh nhật người ta hay tặng gì nhỉ?"],
        ["A", "可送的东西多得很啊！比如衣服、鲜花、书、钱包什么的。小李爱看小说，要不你买几本他喜欢的书送给他？", "Đồ tặng nhiều lắm! Như quần áo, hoa tươi, sách, ví tiền các thứ. Tiểu Lý thích đọc tiểu thuyết, hay cậu mua mấy cuốn sách cậu ấy thích tặng đi?"],
        ["B", "对了，刚才我在店里看到一款闹钟挺精致的，本来想买个闹钟或者手表送给他。", "À đúng rồi, nãy ở tiệm tớ thấy mẫu đồng hồ báo thức tinh xảo lắm, định bụng mua cái đồng hồ báo thức hoặc đồng hồ đeo tay tặng cậu ấy."],
        ["A", "手表还行，但是千万别送闹钟啊！小李是华裔，对中国人来说“送钟”不吉利，因为“钟”和“终”谐音，像“送终”一样。", "Đồng hồ đeo tay thì được, chứ tuyệt đối đừng tặng đồng hồ báo thức/treo tường nhé! Tiểu Lý là người gốc Hoa, với người Trung Quốc tặng 'chung' (đồng hồ) rất xui, vì đồng âm chữ 'chung' trong 'tống chung' (tiễn người chết)."],
        ["B", "连这个也有讲究啊！幸好问了你，差点就送错了！除了不要送钟，还有什么是不可以送人的吗？", "Đến cái này cũng có kiêng kỵ cơ à! May mà hỏi cậu, suýt thì tặng nhầm to! Ngoài đồng hồ ra còn thứ gì không được tặng người khác nữa?"],
        ["A", "我记得不能送雨伞，因为“伞”和“散”谐音，容易让人联想到分开。还有不要送白花，也不要送绿色的帽子。", "Tớ nhớ không được tặng ô (dù), vì 'tản' đồng âm với 'tán' (tan rã), dễ liên tưởng chia ly. Ngoài ra đừng tặng hoa trắng, cũng đừng tặng mũ màu xanh lá cây."],
        ["B", "天哪，原来中国送礼规矩这么多！送个生日礼物还得注意文化习惯。", "Trời ơi, hóa ra văn hóa tặng quà Trung Quốc nhiều quy tắc thế! Tặng món quà sinh nhật thôi cũng phải để ý phong tục."],
        ["A", "可不是嘛，另外如果送钱包或者实用小物倒挺不错的，寓意“财源滚滚”。", "Chứ sao nữa, ngoài ra nếu tặng ví tiền hoặc đồ dùng thiết thực lại rất hay đấy, ngụ ý tiền vào như nước."],
        ["B", "听起来不错！其实送什么不用太贵，关键是选得合适，让他感受到我们的心意和祝福。", "Nghe ổn đấy! Thực ra tặng gì không cần quá đắt, quan trọng là chọn hợp để bạn ấy cảm nhận được tấm lòng và lời chúc của mình."],
        ["A", "说得对，那明天下午有空儿吗？我们一起去逛街挑礼物吧！", "Nói phải lắm, thế chiều mai cậu rảnh không? Mình cùng đi dạo phố chọn quà đi!"],
        ["B", "一言为定，明天见！", "Nhất ngôn cửu đỉnh, mai gặp!"]
      ],
      v2Raw: [
        ["A", "明明，明晚小李过生日，你去参加他的生日派对吗？", "Minh Minh, tối mai sinh nhật Tiểu Lý, cậu có đi dự tiệc sinh nhật cậu ấy không?"],
        ["B", "肯定去呀！不过我逛了一下午街，还是没想好送啥生日礼物。你平时去朋友生日会一般都送什么？", "Chắc chắn đi chứ! Cơ mà tớ lượn phố cả chiều rồi vẫn chưa nghĩ ra tặng quà sinh nhật gì. Bình thường cậu đi sinh nhật bạn hay tặng gì thế?"],
        ["A", "这有什么可犯愁的？投其所好最稳妥！比如护肤品、书、围巾或者真皮钱包。小李不是特别爱看悬疑小说嘛，送套好书就挺有格调。", "Chuyện này có gì đáng lo đâu? Tặng đúng sở thích là chắc ăn nhất! Như đồ dưỡng da, sách, khăn quàng hay ví da. Tiểu Lý chẳng mê đọc tiểu thuyết trinh thám lắm sao, tặng bộ sách hay vừa tinh tế vừa sang."],
        ["B", "其实刚才路过文创店，我差点冲动买下那个复古小闹钟了，觉得摆在书桌上可好看了！", "Thực ra nãy đi ngang tiệm đồ decor, tớ suýt thì mua ngay cái đồng hồ báo thức cổ điển kia rồi đấy, thấy đặt trên bàn học xinh xỉu!"],
        ["A", "好险！这东西可千万不能买！小李家是华人家庭，在中国文化里“送钟”可是大忌讳，跟“送终”谐音，除非你俩绝交了，否则绝对不能送！", "Nguy hiểm quá! Thứ đó tuyệt đối không được mua nhé! Nhà Tiểu Lý là người gốc Hoa, trong văn hóa Trung Quốc tặng đồng hồ là đại kỵ vì đồng âm với 'tống chung', trừ phi hai cậu nghỉ chơi với nhau chứ đừng bao giờ tặng!"],
        ["B", "天哪，吓我一跳！多亏先跟你商量了一下。那除了“钟”之外，还有哪些东西是绝对不能拿来送人的？", "Trời ạ, giật hết cả mình! May mà bàn trước với cậu. Thế ngoài đồng hồ ra, còn những món nào tuyệt đối không được đem đi tặng nữa?"],
        ["A", "讲究可多了！比如别送雨伞，“伞”和“散”谐音，寓意一拍两散；也别给朋友或者情侣分着吃梨（“分梨”等于分离）。另外白菊花一般用于祭奠，还有绿帽子绝对碰不得，寓意太不好了。", "Nhiều kiêng kỵ lắm! Ví dụ đừng tặng ô dù vì 'tản' đồng âm 'tán' (tan vỡ chia lìa); cũng đừng bổ quả lê ăn chung ('phân lê' đồng âm phân ly). Ngoài ra hoa cúc trắng thường dùng viếng tang, còn mũ xanh lá cây tuyệt đối tránh xa vì ý nghĩa cực xấu."],
        ["B", "长知识了！看来送礼不仅要看颜值，更要懂当地的文化忌讳，不然好心办坏事把气氛弄僵就尴尬了。", "Mở mang kiến thức thật! Xem ra tặng quà không chỉ nhìn đẹp mã mà còn phải hiểu kiêng kỵ văn hóa, kẻo lòng tốt thành làm hỏng chuyện thì ngại chết."],
        ["A", "是啊，要既体面又讨喜，我建议还是挑个质感不错的钱包或者护眼台灯。送钱包还有“财源广进”的好彩头，他每天用得到。", "Đúng thế, muốn vừa lịch sự vừa được lòng thì tớ khuyên chọn cái ví xịn hoặc đèn bàn chống cận. Tặng ví còn mang điềm lành 'tiền vào như nước', cậu ấy dùng hàng ngày luôn."],
        ["B", "这个主意太赞了！只要精心选中一件实用又有心意的小礼物，远比盲目买昂贵的摆设强得多。", "Ý kiến này đỉnh quá! Chỉ cần dày công chọn trúng một món quà nhỏ thiết thực và có tâm ý, hơn đứt việc mua bừa đồ trưng bày đắt đỏ."],
        ["A", "完全同意！那明天下课咱俩顺便把商店逛遍，挑个最合他眼缘的钱包，顺便写张手写贺卡。", "Đồng ý hai tay! Vậy mai tan học hai đứa tiện thể lượn hết lượt cửa hàng, chọn cái ví ưng mắt nhất rồi viết thêm tấm thiệp tay nữa."],
        ["B", "就这么定了，明天见！", "Chốt kèo thế nhé, mai gặp!"]
      ],
      diffReasons: {
        2: "Sửa lỗi gõ nhầm “想了办天” (Google Doc) -> tự nhiên hơn.",
        3: "Lồng ghép mẫu câu Bài 5 “有什么可……的” (có gì đáng lo đâu).",
        5: "Sửa dùng sai đại từ “它” -> người và lồng ghép mẫu câu Bài 5 “除非……否则……” cực sắc nét.",
        7: "Sửa lỗi gõ sai “送百花” -> giải thích đầy đủ 4 món kiêng kỵ chuẩn thi: 钟 (送终), 伞 (散), 梨 (分离), 白花 & 绿帽子.",
        10: "Lồng ghép mẫu câu Bài 5 “选中” (chọn trúng).",
        11: "Lồng ghép mẫu câu Bài 5 “逛遍” (đi hết lượt)."
      }
    }),

    buildTopic({
      id: "b5-q14",
      no: 14,
      examNo: 14,
      priority: "green",
      titleVi: "Muốn mua đồ nhưng không biết chọn thế nào, bạn làm sao?",
      question: "你要买东西，但是你不知道应该怎么选，你会怎么办？",
      outline: "Nêu tình huống phân vân không biết chọn mua đồ gì (đồ điện tử / quần áo) → 3 bước giải quyết thực tế: 1. Lên mạng đọc review & so giá; 2. Ra cửa hàng sờ chất liệu/thử trực tiếp; 3. Hỏi ý kiến bạn bè có kinh nghiệm → Chốt quyết định hợp lý.",
      takeaways: {
        points: [
          "Bước 1 — Tra cứu Online: Lên app/mạng đọc đánh giá thật của người mua trước (看评价、比价格、做功课)",
          "Bước 2 — Trải nghiệm trực tiếp: Với quần áo/giày dép/đồ đắt tiền phải ra cửa hàng thử, sờ tận tay (去实体店亲自试穿、摸质量)",
          "Bước 3 — Hỏi người có kinh nghiệm: Nhờ bạn bè am hiểu tư vấn hoặc giới thiệu quán uy tín (请有经验的朋友推荐靠谱的店)",
          "Mẫu câu Bài 5: V+遍 (xem hết một lượt), 除非……才…… (trừ phi... mới...), 选中 (chọn trúng), 说得过去 (tạm ổn)"
        ],
        goldenQuotes: "买东西举棋不定时，我先上网查遍评价、比比价格，再去实体店亲自试一试，或者问问内行朋友，确保选到性价比最合适的。"
      },
      v1Raw: [
        ["A", "小王，最近怎么样？看你在逛购物网站呢？", "Tiểu Vương, dạo này sao rồi? Thấy cậu đang lướt web mua sắm à?"],
        ["B", "别提了，我想买一台新电脑（或者一件大衣），但款式太多了，完全不知道该怎么选。", "Đừng nhắc nữa, tớ định mua cái máy tính mới (hoặc áo khoác), mà nhiều mẫu quá, chẳng biết chọn kiểu gì luôn."],
        ["A", "遇到拿不定主意的时候，你平时一般会怎么办？", "Gặp lúc không quyết được như thế, bình thường cậu hay làm sao?"],
        ["B", "我第一步会先上网查资料。现在网购很方便，几乎所有商品都能对比价格和买家评价。", "Bước đầu tiên tớ sẽ lên mạng tra thông tin trước. Giờ mua sắm online tiện lắm, hầu như món nào cũng so được giá và đánh giá của người mua."],
        ["A", "对，看评价确实省事，不过有时候网上的图片和实物还是有点差距。", "Đúng, xem đánh giá đúng là đỡ công, nhưng thỉnh thoảng ảnh trên mạng với đồ thật vẫn lệch nhau chút đấy."],
        ["B", "没错！所以如果是买衣服或者贵重物品，我还是会再去实体店看看，亲自摸摸质量、试一试才知道合不合适。", "Chuẩn luôn! Nên nếu mua quần áo hay đồ đắt tiền, tớ vẫn ra cửa hàng xem thêm, tự tay sờ chất liệu và thử mới biết hợp hay không."],
        ["A", "有时候网上看着好像便宜，去店里对比后反而更清楚值不值得买。", "Nhiều khi trên mạng trông rẻ vậy thôi, ra tiệm đối chiếu xong mới rõ có đáng mua không."],
        ["B", "对了，要是对那个领域实在不熟，我还会向有经验的朋友求助，请他们推荐靠谱的牌子和店铺。", "À, nếu gặp món mình mù tịt hẳn, tớ còn nhờ bạn bè có kinh nghiệm tư vấn, xin họ gợi ý hãng và cửa hàng uy tín."],
        ["A", "朋友的推荐确实最靠谱，能少走很多弯路。", "Lời khuyên của bạn bè đúng là đáng tin nhất, tránh được bao nhiêu đường vòng."],
        ["B", "是的，买东西还是得提前做好功课，仔细对比以后再决定，才能选中既实惠又耐用的好商品。", "Đúng vậy, mua đồ vẫn phải tìm hiểu kỹ trước, so sánh cẩn thận rồi mới quyết định, thế mới chọn trúng món vừa hời vừa bền đẹp."],
        ["A", "看来你买东西很有自己的一套办法！那陪我去附近逛逛吧，帮我也参谋参谋。", "Xem ra cậu mua đồ có chiêu thức bài bản phết! Vậy đi dạo loanh quanh với tớ đi, làm quân sư cho tớ luôn."],
        ["B", "没问题，走起！", "Ok luôn, đi thôi!"]
      ],
      v2Raw: [
        ["A", "在刷啥呢这么入迷？眉头都皱成一团了！", "Đang lướt gì mà mê mẩn thế? Nhíu hết cả mày lại kìa!"],
        ["B", "我想趁着换季买件保暖外套，结果网上一搜几百页，花多眼乱，实在不知道该怎么选才好。", "Tớ định nhân lúc chuyển mùa mua cái áo khoác ấm, ai dè lên mạng tìm ra cả trăm trang, hoa hết cả mắt, chẳng biết chọn kiểu gì."],
        ["A", "遇到选择困难症的时候，你平时都怎么搞定啊？", "Gặp lúc mắc 'bệnh khó lựa chọn' thế này, bình thường cậu xử lý sao?"],
        ["B", "我有三步走！第一步肯定先在网上做功课，把各大品牌的销量和真实差评看一遍，先把明显“踩雷”的款式淘汰掉。", "Tớ có 3 bước hẳn hoi! Bước 1 chắc chắn lên mạng tìm hiểu, lướt qua một lượt doanh số và bình luận chê thật của các hãng, loại ngay mấy mẫu dễ 'dính bẫy' trước."],
        ["A", "看差评比看好评管用多了！不过网图滤镜太厚，实物往往跟卖家秀对不上号。", "Đọc bình luận chê hiệu quả hơn đọc khen nhiều! Cơ mà ảnh mạng chỉnh màu dày quá, đồ thật hay khác một trời một vực với ảnh mẫu."],
        ["B", "太对了！所以第二步我会先把想买的清单记下来，好周末直奔实体店亲自试穿——摸摸面料厚不厚、版型正不正。", "Chuẩn không cần chỉnh! Nên bước 2 tớ ghi sẵn danh sách mẫu ưng lại, để cuối tuần chạy thẳng ra tiệm thử tận người — sờ xem vải có dày không, form có chuẩn không."],
        ["A", "亲自上身试确实踏实。要是遇到自己完全外行的东西，比如买电脑或者相机，你会怎么办？", "Mặc thử tận người đúng là yên tâm thật. Còn nếu gặp thứ mình mù tịt hoàn toàn, như mua laptop hay máy ảnh chẳng hạn, cậu tính sao?"],
        ["B", "那更简单了！第三步就是直接找内行朋友请教，听听他们的避坑建议，请他们推荐几家靠谱的店，这样能少走很多弯路。", "Thế càng dễ! Bước 3 là hỏi thẳng đứa bạn rành nghề, nghe nó chỉ cách né bẫy và gợi ý vài tiệm uy tín, đỡ tốn công mò mẫm bao nhiêu."],
        ["A", "有道理！除非评价口碑都过硬、性价比也说得过去，否则真不能头脑一热就下单。", "Có lý! Trừ phi đánh giá uy tín đều ổn áp và giá cả hợp túi tiền, nếu không đừng bao giờ bốc đồng chốt đơn vội."],
        ["B", "就是啊，按照“查评价+试实物+问朋友”这三步来，基本上都能精准选中既合心意又耐穿的好东西！", "Đúng thế, cứ làm theo 3 bước 'tra review + thử tận tay + hỏi bạn thân' này, cơ bản là chọn trúng ngay món vừa hợp ý lại bền đẹp!"],
        ["A", "听你这么一说，我觉得购物也挺讲究门道的！正好我也要买双跑鞋，走，咱俩现在去逛逛？", "Nghe cậu nói xong mới thấy mua sắm cũng lắm bí quyết! Vừa khéo tớ cũng định mua đôi giày chạy, đi, hai đứa mình lượn luôn bây giờ không?"],
        ["B", "好嘞，走起，顺便帮你把把关！", "Ok luôn, đi thôi, tiện thể tớ thẩm định giúp cậu luôn!"]
      ],
      diffReasons: {
        3: "Dùng cụm từ hiện đại “选择困难症” (bệnh khó đưa ra lựa chọn).",
        4: "Lồng ghép mẫu câu Bài 5 “看一遍” (xem hết một lượt) + từ lóng “踩雷” (dính bẫy/mua hớ).",
        6: "Lồng ghép chuẩn mẫu câu Bài 5 “先……好……” (ghi lại trước để tiện cuối tuần đi thử).",
        9: "Lồng ghép liền 2 mẫu câu Bài 5 “除非……否则……” và “说得过去”.",
        10: "Lồng ghép mẫu câu Bài 5 “选中” (chọn trúng)."
      }
    }),

    buildTopic({
      id: "b5-q15",
      no: 15,
      examNo: 15,
      priority: "green",
      titleVi: "Giới thiệu thói quen mua sắm của bạn",
      question: "请介绍一下你买东西的习惯。",
      outline: "Dẫn chuyện nhận bưu kiện giao hàng → Kể thói quen mua sắm cá nhân (lên danh sách, so giá/săn sale, chọn lọc kỹ, phân biệt đồ sinh hoạt mua online vs quần áo thử trực tiếp) → Chốt triết lý tiêu dùng lý trí (chỉ mua thứ thật sự cần).",
      takeaways: {
        points: [
          "Lên kế hoạch trước khi mua: Mở tủ xem thiếu gì rồi viết danh sách, tránh thấy giảm giá là mua bừa (先列购物清单，不冲动消费)",
          "Thói quen so sánh giá & săn ưu đãi: Đợi dịp sale lớn hoặc so giá nhiều chỗ rồi mới chốt đơn (对比价格、等促销活动)",
          "Kết hợp Online & Offline: Đồ tiêu dùng hàng ngày đặt online cho tiện; quần áo giày dép ưu tiên ra tiệm thử chất lượng (日用品网购、衣物逛实体店)",
          "Mẫu câu Bài 5: 没什么可买的 (chẳng có gì đáng mua), 逛遍 (lượn hết), 除非……才…… (trừ phi... mới...), 说得过去 (tạm ổn)"
        ],
        goldenQuotes: "我现在买东西特别理性：先列清单再出门，除非真的需要且性价比说得过去，否则就算打折也不随便花钱。"
      },
      v1Raw: [
        ["A", "哇，你桌子上怎么这么多快递盒子，最近买了不少东西吧？", "Oa, sao trên bàn cậu lắm hộp hàng ship thế, dạo này mua nhiều đồ lắm hả?"],
        ["B", "哈哈，这都是平时攒下来趁打折一起买的日用品。其实我买东西很有规律的！", "Haha, toàn đồ sinh hoạt hằng ngày gom lại đợi giảm giá mua một thể đấy. Thực ra tớ mua đồ có nguyên tắc lắm!"],
        ["A", "是吗？快给我介绍一下你买东西的习惯吧！", "Thế à? Mau kể cho tớ nghe thói quen mua sắm của cậu đi!"],
        ["B", "我每次买东西前，都会先整理一下家里还缺什么，写好购物清单再下单，不然很容易乱花钱。", "Mỗi lần trước khi mua, tớ đều dọn xem nhà còn thiếu gì, viết sẵn danh sách cần mua rồi mới đặt, không là dễ tiêu hoang lắm."],
        ["A", "那你更喜欢网购还是逛实体店呢？", "Thế cậu thích mua online hay đi cửa hàng trực tiếp hơn?"],
        ["B", "我分东西买！像纸巾、洗衣液这种日常用品，网购既便宜又直接送到家，省时间；但买衣服和鞋子我还是喜欢去商场试穿。", "Tớ chia theo loại đồ! Như giấy ăn, nước giặt hàng ngày thì đặt online vừa rẻ lại giao tận cửa, tiết kiệm thời gian; còn mua quần áo giày dép tớ vẫn thích ra trung tâm thương mại thử."],
        ["A", "你还会挑什么时候买比较便宜吗？", "Cậu có hay canh thời điểm nào mua cho rẻ hơn không?"],
        ["B", "会的，如果不是急用的东西，我会先放进购物车，等到换季或者节日打折活动的时候再一起买。", "Có chứ, nếu không phải đồ cần gấp, tớ cứ bỏ sẵn vào giỏ hàng, đợi đến lúc giao mùa hoặc lễ giảm giá mới chốt một thể."],
        ["A", "那遇到商店搞促销，你会不会忍不住多买几件用不着的东西？", "Thế gặp lúc cửa hàng khuyến mãi, cậu có hay bị kiềm lòng không nổi mà mua thêm mấy thứ chẳng dùng tới không?"],
        ["B", "以前会，现在克制多了！除非东西质量确实好、又用得上，我才会买；没用的就算再便宜也不买。", "Trước thì có, giờ kiềm chế hơn nhiều rồi! Trừ phi món đó chất lượng tốt thật và dùng tới tớ mới mua; đồ không cần dùng có rẻ mấy cũng bỏ."],
        ["A", "你这个习惯真好，既能买到好东西，又不会浪费钱。", "Thói quen này của cậu hay quá, vừa mua được đồ tốt lại không phí tiền."],
        ["B", "对啊，理智消费才能让生活更轻松嘛！", "Đúng thế, tiêu dùng lý trí mới giúp cuộc sống nhẹ nhàng hơn chứ!"]
      ],
      v2Raw: [
        ["A", "好家伙，你门口堆这么多快递，最近这是大采购了一波啊？", "Chà chà, trước cửa nhà cậu chất đống hàng giao thế kia, dạo này vừa làm quả đại mua sắm à?"],
        ["B", "哈哈，别误会，这些全是家里常用的洗衣液、纸巾，趁平台大促屯一波而已。别看箱子多，我花钱可克制着呢！", "Haha, đừng hiểu lầm, toàn nước giặt, giấy ăn dùng thường ngày, nhân sàn sale lớn mua tích trữ một đợt thôi. Đừng thấy nhiều thùng mà tưởng, tớ tiêu tiền có chừng mực lắm đấy!"],
        ["A", "听起来你买东西挺有章法的，快介绍一下你平时购物的习惯呗！", "Nghe có vẻ cậu mua sắm bài bản phết, mau kể tớ nghe thói quen đi mua đồ của cậu đi!"],
        ["B", "我有个铁习惯——“先盘点，后列清单”。平时缺啥就记在手机备忘录里，出门或者打开购物软件直奔目标，没在清单上的基本没什么可买的。", "Tớ có một thói quen cứng — 'kiểm kê trước, lên danh sách sau'. Bình thường thiếu gì ghi ngay vào ghi chú điện thoại, ra ngoài hay mở app mua sắm là nhắm thẳng mục tiêu, ngoài danh sách cơ bản chẳng có gì đáng mua."],
        ["A", "这习惯太厉害了！我每次一逛商城就忍不住把整条街逛遍，最后提一大堆没用的回来。那你平时偏爱网购还是实体店？", "Thói quen này đỉnh quá! Tớ cứ hễ đi trung tâm thương mại là không kìm được phải lượn hết cả dãy phố, cuối cùng xách về một đống đồ thừa. Thế cậu chuộng mua online hay ra tiệm?"],
        ["B", "我都是线上线下结合！标准化的日用品、零食直接网购比价下单，划算又省力；至于贴身穿的衣服、鞋子，哪怕网店图片再美，我也宁愿跑实体店摸摸料子、上身试穿。", "Tớ kết hợp cả online lẫn trực tiếp! Đồ gia dụng tiêu chuẩn, đồ ăn vặt đặt online so giá cho hời và nhàn; còn quần áo giày dép mặc lên người, ảnh mạng đẹp mấy tớ vẫn thà chạy ra tiệm sờ vải thử form."],
        ["A", "怪不得你很少买到踩雷的东西！那买的时候是不是还会专挑打折季？", "Thảo nào ít thấy cậu mua hớ! Thế lúc mua có hay canh mùa giảm giá không?"],
        ["B", "那必须的！不急用的东西我先收藏着，等换季清仓或者双十一这类促销时再对比着入手，有时候能省下好几成呢。", "Chắc chắn rồi! Đồ chưa vội dùng tớ lưu lại đó, đợi lúc giao mùa xả kho hay sale 11/11 rồi so giá hốt, nhiều khi tiết kiệm được mấy chục phần trăm đấy."],
        ["A", "可促销时候满减套路那么多，你真能忍住不冲动剁手吗？", "Nhưng lúc khuyến mãi chiêu trò giảm giá nhiều thế, cậu kìm lòng nổi để không 'chặt tay' chốt đơn bừa à?"],
        ["B", "我现在特理性：除非质量过硬、价格也说得过去，而且三个月内肯定用得上，我才会付钱；否则打折打到骨折我也不心动！", "Giờ tớ tỉnh táo lắm: trừ phi chất lượng cứng, giá cả hợp lý mà trong vòng 3 tháng chắc chắn dùng tới thì tớ mới trả tiền; nếu không có giảm sập sàn tớ cũng chẳng rung động!"],
        ["A", "佩服佩服！跟你比起来我真是太冲动了，以后买东西前得先拿清单对照一下才行。", "Bái phục bái phục! So với cậu tớ đúng là bốc đồng quá, sau này trước khi mua chắc phải soi lại danh sách mới được."],
        ["B", "哈哈，养成理性购物的习惯后，不仅省下一大笔钱，家里也不至于堆满闲置物品，别提多舒心了！", "Haha, tập được thói quen mua sắm lý trí xong, không chỉ tiết kiệm khoản lớn mà nhà cũng đỡ chất đống đồ bỏ xó, thoải mái khỏi phải nói luôn!"]
      ],
      diffReasons: {
        4: "Lồng ghép mẫu câu Bài 5 “没什么可买的” + thói quen thực tế ghi chú điện thoại.",
        5: "Lồng ghép mẫu câu Bài 5 “逛遍” (đi hết một lượt).",
        7: "Dùng “怪不得！” tự nhiên & từ vựng hiện đại “踩雷”.",
        10: "Lồng ghép chuẩn 2 mẫu câu Bài 5 “除非……才……” và “说得过去”."
      }
    }),

    buildTopic({
      id: "b5-q16",
      no: 16,
      examNo: 16,
      priority: null,
      titleVi: "Khi cần ý kiến của người khác, bạn sẽ tìm ai?",
      question: "需要别人的意见时，你会找谁？",
      outline: "Mở đầu bằng tình huống khó quyết định → Phân chia đối tượng hỏi ý kiến theo từng loại việc (Việc lớn/gia đình: hỏi Bố Mẹ; Sở thích/học tập/mua sắm: hỏi Bạn thân/Người trong ngành; Thông tin khách quan: tra mạng) → Chốt thông điệp: Ý kiến người khác chỉ là tham khảo, tự mình quyết định và chịu trách nhiệm.",
      takeaways: {
        points: [
          "Việc lớn, định hướng cuộc sống: Hỏi Bố Mẹ/Người thân vì họ hiểu mình nhất và có kinh nghiệm sống (大事找爸妈，他们经验丰富、真心为自己好)",
          "Việc học tập, công việc, mua sắm: Hỏi Bạn thân hoặc người trong nghề để có góc nhìn thực tế của người trẻ (学习工作找同行或闺蜜哥们儿)",
          "Tra cứu thông tin khách quan: Xem review trên mạng, nhưng phải biết chọn lọc tránh nhiễu thông tin (上网查评价作参考，但保持独立判断)",
          "Chốt ý: Ý kiến của người khác chỉ là tham khảo, tự mình chốt đơn quyết định để không hối hận (别人的意见只是参考，最终决定自己做)"
        ],
        goldenQuotes: "听别人的意见是为了打开思路、少走弯路；但自己的路还得自己走，综合思考后勇敢做出最适合自己的决定。"
      },
      v1Raw: [
        ["A", "你有没有遇到过很难决定的问题，一时拿不出主意的时候？", "Cậu đã bao giờ gặp chuyện khó quyết định, nhất thời chẳng nghĩ ra phương án nào chưa?"],
        ["B", "当然有啊，可以说是经常遇到。每个人生活中都会遇到这种两难的选择。", "Đương nhiên có chứ, có thể nói gặp suốt luôn. Ai trong đời chẳng gặp những lựa chọn tiến thoái lưỡng nan thế."],
        ["A", "不瞒你说，最近我就遇到一个很难的选择。你平时需要别人意见的时候一般会找谁呢？", "Chẳng giấu gì cậu, dạo này tớ đang gặp một lựa chọn khó khăn đây. Bình thường lúc cần ý kiến người khác cậu hay tìm ai?"],
        ["B", "家人呀、朋友呀，或者上网查一下资料，很多渠道可以考虑。不过我看还是视情况而定。", "Người nhà này, bạn bè này, hoặc lên mạng tra thêm tài liệu, nhiều kênh lắm. Nhưng tớ thấy vẫn phải tùy vào chuyện gì."],
        ["A", "怎么说？遇到大事的时候你会先找谁？", "Nói thế nào? Gặp việc lớn thì cậu tìm ai trước?"],
        ["B", "如果是人生方向或者特别重要的大事，我通常会先找妈妈。她不仅经验丰富，而且总是很耐心地听我倾诉。", "Nếu là định hướng cuộc đời hay chuyện hệ trọng, tớ thường tìm mẹ trước. Mẹ không chỉ giàu kinh nghiệm mà lúc nào cũng kiên nhẫn nghe tớ giãi bày."],
        ["A", "那如果妈妈的意见和你的想法不一样，你会怎么办？", "Thế lỡ ý kiến của mẹ khác với suy nghĩ của cậu thì sao?"],
        ["B", "其实我主要想听她的理由，再结合自己的实际情况去考虑。我觉得别人的意见只是参考，最终决定还是得自己做。", "Thực ra tớ chủ yếu muốn nghe lý do của mẹ, rồi kết hợp tình hình thực tế bản thân để cân nhắc. Tớ thấy ý kiến người khác chỉ để tham khảo, quyết định cuối cùng vẫn phải tự mình đưa ra."],
        ["A", "说得对。那平时学习和生活上的小纠结，你是不是更爱找朋友聊？", "Nói đúng lắm. Thế mấy chuyện lăn tăn bình thường trong học tập hay cuộc sống, cậu thích tìm bạn bè tâm sự hơn à?"],
        ["B", "是的，跟朋友年纪相仿，想法更贴近。而且问两三个不同的朋友，还能看到更多不同的角度和可能性。", "Đúng thế, bạn bè cùng trang lứa nên suy nghĩ gần gũi hơn. Với lại hỏi 2-3 đứa bạn khác nhau còn giúp mình nhìn ra nhiều góc độ và khả năng mới."],
        ["A", "还有很多人喜欢直接上网发帖问网友，你觉得靠谱吗？", "Còn nhiều người thích đăng bài lên mạng hỏi cư dân mạng nữa, cậu thấy có đáng tin không?"],
        ["B", "如果是查购物评价或攻略还不错，但如果是重大决定，还是自己要有判断力，选最适合自己的才不会后悔。", "Nếu chỉ tra review mua sắm hay kinh nghiệm du lịch thì ổn, chứ quyết định lớn thì vẫn phải giữ sự tỉnh táo tự đánh giá, chọn điều hợp nhất với mình mới không hối hận."]
      ],
      v2Raw: [
        ["A", "哎，你平时有没有那种左右为难、拿不定主意的时候？", "Này, bình thường cậu có bao giờ rơi vào cảnh tiến thoái lưỡng nan, chẳng biết quyết sao không?"],
        ["B", "那太常见了！谁还没个犯迷糊的时候呀？怎么了，看你愁眉苦脸的，是不是最近遇上啥难选的事了？", "Gặp suốt ấy chứ! Ai chẳng có lúc rối trí? Sao thế, trông mặt cậu ủ rũ thế kia, mới đụng chuyện gì khó chọn à?"],
        ["A", "别提了，最近真被一件大事卡住了。我就想问问你，每次需要别人出主意的时候，你第一反应会找谁？", "Đừng nhắc nữa, dạo này đang kẹt cứng ở một quyết định lớn đây. Tớ muốn hỏi cậu, mỗi lần cần người khác góp ý, phản xạ đầu tiên của cậu là tìm ai?"],
        ["B", "这得看是哪方面的事，不能一刀切！我的习惯是“大事问长辈，小事找朋友，杂事查攻略”。", "Cái này phải tùy xem là chuyện mảng nào, không gom chung một chỗ được! Thói quen của tớ là 'việc lớn hỏi người lớn, việc nhỏ tìm bạn bè, việc lặt vặt tra mạng'."],
        ["A", "哎哟，总结得挺精辟！具体说说看？", "Ồ, tóm tắt sắc bén phết! Nói cụ thể hơn xem nào?"],
        ["B", "像换工作、学业选择这种重要决定，我第一反应是找我妈。她社会阅历比我深，又真心为我着想，总能一针见血点出我看漏的风险。", "Như chuyện đổi việc, chọn ngành học quan trọng thế này, phản xạ đầu tiên của tớ là tìm mẹ. Mẹ từng trải hơn tớ nhiều, lại thật lòng nghĩ cho mình, lúc nào cũng chỉ trúng ngay rủi ro tớ bỏ sót."],
        ["A", "但咱和父母代沟有时候也挺明显的，要是妈妈的建议跟你心里想的完全拧着，你会怎么选？", "Nhưng mình với bố mẹ đôi khi cũng lệch thế hệ rõ rệt, lỡ lời khuyên của mẹ trái ngược hoàn toàn với điều cậu muốn thì cậu chọn sao?"],
        ["B", "我会认真听她为什么这么说，但绝不盲从！长辈的意见是宝贵的“安全网”，可毕竟路是自己走的，最终还是得结合自己的想法自己拍板，这样哪怕走弯路也不怨别人。", "Tớ sẽ nghe thật kỹ vì sao mẹ nói vậy, nhưng không nghe mù quáng! Ý kiến người lớn là 'lưới an toàn' quý giá, nhưng rốt cuộc đường là mình tự đi, cuối cùng vẫn phải kết hợp suy nghĩ bản thân mà tự chốt, thế lỡ có vấp cũng chẳng trách ai."],
        ["A", "这话挺成熟的！那要是挑礼物、学新技能或者感情上的困惑，你肯定更爱找闺蜜哥们儿聊吧？", "Câu này chững chạc đấy! Thế mấy chuyện chọn quà, học kỹ năng mới hay lăn tăn tình cảm, chắc cậu thích hỏi hội bạn thân hơn nhỉ?"],
        ["B", "那是必须的！年轻人彼此视角接近，而且除非跟几个不同性格的朋友都聊一遍，否则很容易局限在自己的死胡同里。", "Chắc chắn rồi! Người trẻ góc nhìn gần nhau hơn, hơn nữa trừ phi nói chuyện qua một lượt với vài đứa bạn tính cách khác nhau, nếu không rất dễ tự nhốt mình trong ngõ cụt."],
        ["A", "那现在大家动不动就发朋友圈或者问网友、问AI，你平时参考网络意见吗？", "Thế giờ mọi người hở tí là đăng bài hỏi cư dân mạng hay hỏi AI, cậu có hay tham khảo ý kiến trên mạng không?"],
        ["B", "买东西看真实测评、找旅游攻略我常查，特别好使；但人生方向可千万别交给陌生网友投票！多听、多想，最后自己心明眼亮地做决定才靠谱。", "Mua đồ xem review thật hay tìm kinh nghiệm du lịch thì tớ hay tra, tiện cực; nhưng hướng đi cuộc đời thì tuyệt đối đừng giao cho người lạ trên mạng bỏ phiếu! Nghe nhiều, nghĩ kỹ, cuối cùng tự mình sáng suốt quyết định mới đáng tin."]
      ],
      diffReasons: {
        4: "Đưa câu chốt cực hay dễ nhớ khi thi nói: “大事问长辈，小事找朋友，杂事查攻略”.",
        6: "Sửa lỗi văn nói và thêm thành ngữ “一针见血” (nói trúng tim đen).",
        8: "Diễn đạt sâu sắc về việc tham khảo ý kiến bố mẹ nhưng tự chịu trách nhiệm (“自己拍板”).",
        10: "Lồng ghép mẫu câu Bài 5 “除非……都聊一遍，否则……”.",
        12: "Tự nhiên, cập nhật thời đại AI & mạng xã hội, nhấn mạnh “千万别……”."
      }
    }),
  ]
};

// Danh sách câu hỏi mở rộng từ Slide + Exam numbering cho các câu ĐÃ CÓ trong Book 1
const EXISTING_EXAM_MAP = {
  "b2-c1": {
    examNo: 1,
    priority: null,
    isExamScope: true,
    question: "你认为怎样才能保持健康？你自己是怎么保持健康的？",
    slideQuestions: ["怎么才能保持健康？"]
  },
  "b2-c2": {
    examNo: 2,
    priority: null,
    isExamScope: true,
    question: "你相信补药吗？你会不会用补药？",
    slideQuestions: ["有人送补药，你会吃吗？", "天然的补药和补药片你怎么选？"]
  },
  "b3-c1": {
    examNo: 7,
    priority: "yellow",
    isExamScope: true,
    question: "你喜欢什么样的饭菜？请介绍一下儿你的口味。",
    slideQuestions: ["介绍一下你的口味。"]
  },
  "b3-c2": {
    examNo: 8,
    priority: null,
    isExamScope: true,
    question: "请介绍一个国家或地区的饮食习惯。",
    slideQuestions: ["介绍一个国家/地区一般人的饮食习惯。"]
  },
  "b5-c3": {
    examNo: 13,
    priority: null,
    isExamScope: true,
    question: "你喜欢买名牌儿货还是中档货？为什么？",
    slideQuestions: []
  },
  "b5-c1": { isExamScope: false },
  "b5-c2": { isExamScope: false },
};

// 13 từ vựng bổ sung từ phần 生词 (Bài 2 - câu 3+5 trong Google Doc)
const EXTRA_B2_VOCAB = [
  { hanzi: "病毒感染", pinyin: "bìngdú gǎnrǎn", pos: "cụm", hanviet: "BỆNH ĐỘC CẢM NHIỄM", meaning: "Nhiễm virus" },
  { hanzi: "自然疗法", pinyin: "zìrán liáofǎ", pos: "n.", hanviet: "TỰ NHIÊN LIỆU PHÁP", meaning: "Phương pháp trị liệu tự nhiên" },
  { hanzi: "快速恢复", pinyin: "kuàisù huīfù", pos: "cụm", hanviet: "KHOÁI TỐC KHÔI PHỤC", meaning: "Phục hồi nhanh chóng" },
  { hanzi: "免疫系统", pinyin: "miǎnyì xìtǒng", pos: "n.", hanviet: "MIỄN DỊCH HỆ THỐNG", meaning: "Hệ miễn dịch" },
  { hanzi: "免疫力", pinyin: "miǎnyì lì", pos: "n.", hanviet: "MIỄN DỊCH LỰC", meaning: "Sức đề kháng / khả năng miễn dịch" },
  { hanzi: "滥用药物", pinyin: "lànyòng yàowù", pos: "cụm", hanviet: "LẠM DỤNG DƯỢC VẬT", meaning: "Lạm dụng thuốc" },
  { hanzi: "拖久", pinyin: "tuōjiǔ", pos: "v.", hanviet: "THA CỬU", meaning: "Kéo dài (thời gian)" },
  { hanzi: "拖着不治", pinyin: "tuōzhe bù zhì", pos: "cụm", hanviet: "THA TRỨ BẤT TRỊ", meaning: "Dây dưa kéo dài không chịu chữa" },
  { hanzi: "敌人", pinyin: "dírén", pos: "n.", hanviet: "ĐỊCH NHÂN", meaning: "Kẻ thù" },
  { hanzi: "退烧药", pinyin: "tuìshāoyào", pos: "n.", hanviet: "THOÁI THIÊU DƯỢC", meaning: "Thuốc hạ sốt" },
  { hanzi: "止咳药", pinyin: "zhǐkéyào", pos: "n.", hanviet: "CHỈ KHÁI DƯỢC", meaning: "Thuốc giảm ho" },
  { hanzi: "指导下正确使用", pinyin: "zhǐdǎo xià zhèngquè shǐyòng", pos: "cụm", hanviet: "CHỈ ĐẠO HẠ CHÍNH XÁC SỬ DỤNG", meaning: "Sử dụng đúng cách dưới sự hướng dẫn" },
  { hanzi: "缓解症状", pinyin: "huǎnjiě zhèngzhuàng", pos: "cụm", hanviet: "HOÃN GIẢI CHỨNG TRẠNG", meaning: "Làm giảm nhẹ triệu chứng" },
];

// Bổ sung đầy đủ các câu Đặt câu mẫu từ Google Doc vào phần patterns của Bài 2, 3, 5
const EXTRA_PATTERN_SENTENCES = {
  // Bài 2
  "坚持下来": [["吵了半天，他们终于安静下来。", "Cãi nhau nửa ngày, cuối cùng họ cũng yên lặng lại được."]],
  "坚持下去": [["这工作太累了，我简直做不下去了。", "Công việc này mệt quá, tôi gần như không làm tiếp nổi nữa."]],
  "别提多": [["考试通过了，我别提多高兴了！", "Thi đậu rồi, tôi vui đến mức khỏi phải nói!"]],
  "非": [["要想到我的家，非坐地铁不可。", "Muốn đến nhà tôi thì nhất thiết phải đi tàu điện ngầm."]],
  "至于": [["考试失败一次，至于放弃吗？", "Thi trượt một lần, có đến mức phải bỏ cuộc không?"]],
  "千万": [["这份资料对明天的会议非常重要，你千万别忘。", "Tài liệu này rất quan trọng cho cuộc họp ngày mai, bạn tuyệt đối đừng quên."]],
  // Bài 3
  "惯": [["他住惯了北京，觉得南方太热了。", "Anh ấy ở quen Bắc Kinh rồi, thấy miền Nam nóng quá."]],
  "看来": [["他的脸都红了，看来生气了。", "Mặt anh ấy đỏ bừng lên rồi, xem ra giận rồi đấy."]],
  "要么": [["周末要么去爬山，要么在家看电影，你选吧。", "Cuối tuần hoặc đi leo núi, hoặc ở nhà xem phim, cậu chọn đi."]],
  "好说": [
    ["吃的好说，我可以带过去，但喝的你得自己准备。", "Đồ ăn thì dễ thôi, tôi mang qua được, nhưng đồ uống cậu phải tự chuẩn bị."],
    ["请假好说，我老板人很好，但是机票太贵了。", "Xin nghỉ phép thì dễ thôi, sếp tôi tốt tính lắm, nhưng vé máy bay đắt quá."],
    ["礼物好说，我已经买好了，难的是怎么开这个口。", "Quà cáp thì dễ nói, tôi mua sẵn rồi, khó là mở lời thế nào thôi."]
  ],
  "砸": [["他因为太紧张，把今天的面试弄砸了。", "Vì căng thẳng quá nên anh ấy làm hỏng bét buổi phỏng vấn hôm nay rồi."]],
  "大饱口福": [["这是我亲自做的菜，你们要大饱口福呀！", "Đây là món tự tay tôi nấu đấy, mọi người phải ăn cho thật đã nhé!"]],
  "有两下子": [["别看他年纪小，其实他游泳真有两下子。", "Đừng thấy cậu ấy nhỏ tuổi, thực ra cậu ấy bơi lội có nghề phết đấy."]],
  // Bài 5
  "可": [
    ["这本书内容丰富，是一本很可读的作品。", "Cuốn sách này nội dung phong phú, là một tác phẩm rất đáng đọc."],
    ["这种苹果又小又酸，有什么可买的？", "Loại táo này vừa nhỏ vừa chua, có gì đáng mua đâu?"]
  ],
  "好 + V": [["你把今天会议的内容写下来吧，明天好跟老板报告。", "Cậu ghi chép lại nội dung họp hôm nay đi, để mai tiện báo cáo với sếp."]],
  "遍": [
    ["为了找女儿，他跑遍了整个城市。", "Để tìm con gái, ông ấy chạy khắp cả thành phố."],
    ["我们把所有的答案试遍了，还是不对。", "Chúng tôi thử hết lượt tất cả đáp án rồi mà vẫn không đúng."],
    ["她问遍了所有的亲戚，也没人知道这事。", "Cô ấy hỏi khắp lượt hết mọi họ hàng mà cũng chẳng ai biết chuyện này."]
  ],
  "除非": [
    ["除非你好好练习，才能考上大学。", "Chỉ khi cậu luyện tập chăm chỉ thì mới thi đỗ đại học được."],
    ["除非我们找到钥匙，否则只好在外面睡一晚。", "Trừ phi tìm được chìa khóa, nếu không đành ngủ ngoài đường một đêm."],
    ["除非雨下太大，比赛才取消，否则一定会按时进行。", "Chỉ khi mưa quá to trận đấu mới hủy, nếu không nhất định diễn ra đúng giờ."],
    ["除非你现在马上出发，才赶得上车，否则只好走路回家。", "Chỉ khi cậu xuất phát ngay bây giờ mới kịp xe, nếu không đành đi bộ về nhà."],
    ["他这个人轻易不生气，除非你真的太过分了。", "Người như anh ấy ít khi nổi giận, trừ phi cậu thực sự quá đáng lắm rồi."]
  ],
  "中": [
    ["她选了半天，真没想到选中了那么酸的苹果。", "Cô ấy lựa mãi nửa ngày, chẳng ngờ lại chọn trúng quả táo chua thế."],
    ["世界上人那么多，你却刚好选中了我，真是太幸运了。", "Thế giới đông người thế, vậy mà cậu lại chọn trúng tớ, đúng là may mắn quá."]
  ],
  "说得过去": [["这次迟到还有点理由，勉强说得过去。", "Lần đi muộn này còn có chút lý do, tạm chấp nhận được."]]
};

function enrichPattern(p) {
  const title = p.title || "";
  for (const [key, list] of Object.entries(EXTRA_PATTERN_SENTENCES)) {
    if (title.includes(key) || (key === "好 + V" && title.includes("好 + V₂"))) {
      p.extraExamples = list.map(([zh, vi]) => {
        const py = computePy(zh);
        return { zh, pinyin: py.pinyin, pinyinHtml: py.pinyinHtml, vi };
      });
    }
  }
}

const book1 = JSON.parse(readFileSync(b1Path, "utf8"));

// Nâng cấp từng bài
for (const lesson of book1.lessons) {
  const isExamLesson = [2, 3, 5].includes(lesson.no);
  lesson.isExamScope = isExamLesson;

  // Bỏ các topic mới thêm từ lần chạy trước (để script chạy lại sạch sẽ idempotent)
  const existingTopics = lesson.topics.filter((t) => !/-q\d+$/.test(t.id));

  // Cập nhật metadata cho các câu có sẵn
  for (const t of existingTopics) {
    if (!isExamLesson) {
      t.isExamScope = false;
      continue;
    }
    const meta = EXISTING_EXAM_MAP[t.id];
    if (meta) {
      Object.assign(t, meta);
      if (meta.question) {
        const qp = computePy(meta.question);
        t.questionPinyin = qp.pinyin;
        t.questionPinyinHtml = qp.pinyinHtml;
      }
    }
  }

  // Gộp thêm câu mới cho Bài 2, 3, 5
  const additions = NEW_EXAM_TOPICS[lesson.no] || [];
  const mergedTopics = [...existingTopics, ...additions];

  // Sắp xếp lại: các câu đề thi theo đúng thứ tự examNo (1..16), câu ngoài đề thi (b5-c1, b5-c2) xuống cuối
  mergedTopics.sort((a, b) => {
    const aExam = a.isExamScope !== false;
    const bExam = b.isExamScope !== false;
    if (aExam && !bExam) return -1;
    if (!aExam && bExam) return 1;
    if (aExam && bExam) return (a.examNo || 99) - (b.examNo || 99);
    return (a.no || 99) - (b.no || 99);
  });

  lesson.topics = mergedTopics;

  // Bổ sung từ vựng cho Bài 2
  if (lesson.no === 2) {
    const seen = new Set(lesson.vocab.map((v) => v.hanzi));
    for (const v of EXTRA_B2_VOCAB) {
      if (!seen.has(v.hanzi)) {
        lesson.vocab.push(v);
        seen.add(v.hanzi);
      }
    }
  }

  // Bổ sung câu đặt câu mẫu cho Bài 2, 3, 5
  if (isExamLesson && Array.isArray(lesson.patterns)) {
    lesson.patterns.forEach(enrichPattern);
  }
}

book1.title = "Khẩu ngữ Tiếng Trung · Ôn thi";
book1.shortTitle = "汉语口语速成 (Ôn thi)";
book1.subtitle = "汉语口语速成 · 16 Câu thi (Bài 2,3,5) + Đặt câu + Tham khảo";

writeFileSync(b1Path, JSON.stringify(book1, null, 2), "utf8");

// Thống kê kiểm chứng
let examCount = 0;
let diffCount = 0;
let needAudio = [];
for (const l of book1.lessons) {
  for (const t of l.topics) {
    if (t.isExamScope) {
      examCount++;
      diffCount += (t.diffs || []).length;
      if (!t.audio) needAudio.push(t.id);
    }
  }
}
console.log(`✅ Đã cập nhật Quyển 1: ${examCount} câu thi chính thức (Bài 2, 3, 5). Tổng số câu sửa V1↔V2 (trong phạm vi thi): ${diffCount}.`);
console.log(`🎙️ Số câu thi cần tạo Audio mới (${needAudio.length}): ${needAudio.join(", ")}`);
