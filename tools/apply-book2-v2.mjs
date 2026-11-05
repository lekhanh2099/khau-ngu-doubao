// tools/apply-book2-v2.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pinyin, customPinyin } from "pinyin-pro";

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

  return { plain: plainOut.join(" "), html: htmlOut.join(" ") };
}

// Danh mục các cải tiến V2 chuẩn hóa cho 13 tình huống Book 2
export const B2_V2_EDITS = {
  "gt-b3-c1": [
    {
      n: "08",
      reason: "Bỏ từ ngữ sách vở '原来如此' (nghe như dịch phim), dùng khẩu ngữ tự nhiên '怪不得！' và cụm từ '先尝哪道菜最稳妥'.",
      zh: "怪不得！那你觉得我头一次吃，先尝哪道菜最稳妥？",
      vi: "Thảo nào! Thế cậu thấy người lần đầu ăn như tớ thì nên nếm món nào trước cho an toàn nhất?"
    },
    {
      n: "11",
      reason: "Bỏ câu mở đầu cụt '对，...', thay bằng quán dụng ngữ '可不是嘛！', bổ sung chi tiết đời sống thực tế '扫码点菜' và '备注微辣'.",
      zh: "可不是嘛！麻辣正是川菜的灵魂。不过你要是怕太辣，咱们扫码点菜时可以备注微辣，交代少放点儿花椒。",
      vi: "Đúng thế còn gì nữa! Tê cay chính là linh hồn của món Tứ Xuyên mà. Cơ mà nếu cậu sợ cay quá, lúc quét mã gọi món tụi mình có thể ghi chú 'cay ít', dặn họ bớt hạt tiêu lại."
    },
    {
      n: "15",
      reason: "Bổ sung hình ảnh sinh động '辣得直冒汗' và quán dụng ngữ khẩu ngữ '爱上这口儿' (nghiện cái vị này).",
      zh: "我以前在成都跟朋友吃过几次，一开始辣得直冒汗，慢慢就彻底爱上这口儿了！",
      vi: "Hồi trước tớ đi Thành Đô ăn với bạn mấy lần, lúc đầu cay toát mồ hôi hột, mà dần dà lại đâm ra nghiện luôn cái vị này đấy!"
    },
    {
      n: "19",
      reason: "Thay '好，那我们今天先点菜吧' bằng khẩu ngữ tự nhiên '行，那咱们先扫码下单，边吃边聊！'.",
      zh: "行，那咱们先扫码下单，边吃边聊！",
      vi: "Ok, thế tụi mình quét mã lên món trước đã, rồi vừa ăn vừa thong thả chuyện trò!"
    }
  ],
  "gt-b3-c2": [
    {
      n: "06",
      reason: "Lồng ghép câu tục ngữ văn hóa trà nổi tiếng '宁可三日无粮，不可一日无茶', tăng tính tri thức và phản xạ khẩu ngữ.",
      zh: "这我才明白。听说在中国是“宁可三日无粮，不可一日无茶”，日常大家真这么爱喝茶吗？",
      vi: "Giờ tớ mới vỡ lẽ. Nghe bảo ở Trung Quốc có câu 'thà ba ngày không cơm, chứ một ngày không thể thiếu trà', ngoài đời mọi người chuộng trà đến vậy thật à cậu?"
    },
    {
      n: "11",
      reason: "Dùng từ ngữ thưởng trà chuẩn xác '品出这茶的回甘和韵味' thay cho câu chung chung '尝出茶的味道'.",
      zh: "我倒是更享受喝热茶，心静下来慢慢品，才能品出这茶的回甘和韵味。",
      vi: "Tớ thì lại thích nhâm nhi trà nóng hơn, lòng tĩnh lại thong thả thưởng thức thì mới cảm nhận hết được vị ngọt hậu và phong vị của trà."
    },
    {
      n: "20",
      reason: "Sửa lỗi dịch nguyên ngữ '用茶干杯' thành thành ngữ văn hóa trà chuẩn xác kinh điển: 【以茶代酒，干一杯！】.",
      zh: "太棒了！那咱们今天就以茶代酒，干一杯！",
      vi: "Tuyệt vời quá! Thế hôm nay tụi mình lấy trà thay rượu, cùng cạn chén nào!"
    }
  ],
  "gt-b3-c3": [
    {
      n: "03",
      reason: "Bỏ câu cụt '对，...', dùng cụm khẩu ngữ hiếu khách '特地为你露了一手' và thành ngữ ẩm thực gia đình '三菜一汤'.",
      zh: "嗨，今天特地为你露了一手，做了三菜一汤，你快坐下尝尝！",
      vi: "Hây, hôm nay tớ trổ tài làm hẳn ba món một canh đãi cậu đấy, mau ngồi xuống nếm thử đi!"
    },
    {
      n: "08",
      reason: "Dùng khẩu ngữ nấu nướng tự nhiên '听着步骤挺利落的', '火候的拿捏才是关键'.",
      zh: "听着步骤挺利落的，不过做清蒸鱼，火候的拿捏才是关键吧？",
      vi: "Nghe các bước thì nhanh gọn đấy, cơ mà làm món cá hấp này thì căn chuẩn độ lửa mới là mấu chốt đúng không?"
    },
    {
      n: "15",
      reason: "Dùng thành ngữ khẩu ngữ sinh động '心里一直七上八下的' (bồn chồn lo lắng) và cụm '张罗', '做砸了'.",
      zh: "合胃口就好！我头一回张罗着给你做饭，生怕做砸了，心里一直七上八下的。",
      vi: "Hợp khẩu vị là tớ mừng rồi! Lần đầu đích thân chuẩn bị cơm cho cậu, tớ cứ sợ làm hỏng bét, trong lòng cứ thấp thỏm không yên."
    },
    {
      n: "20",
      reason: "Bỏ '好，谢谢你请我吃饭！' máy móc, dùng thành ngữ khẩu ngữ cực kỳ đời thường '大快朵颐' và '盛情款待'.",
      zh: "成！那我今天就甩开腮帮子大快朵颐啦，太感谢你的盛情款待了！",
      vi: "Nhất trí! Thế thì hôm nay tớ sẽ đánh chén no nê thả phanh luôn, cảm ơn lòng hiếu khách nồng nhiệt của cậu nhé!"
    }
  ],
  "gt-b3-c4": [
    {
      n: "01",
      reason: "Dùng cụm từ dân văn phòng hiện đại '点外卖凑合', '手头活儿连轴转', '抽不出空儿做饭'.",
      zh: "哎，今天中午我又点外卖快餐凑合了，手头活儿连轴转，实在抽不出空儿做饭。",
      vi: "Haizz, trưa nay tớ lại phải gọi đồ ăn nhanh giao tới ăn tạm rồi, công việc cứ xoay như chong chóng, chẳng tài nào dứt ra nấu nướng được."
    },
    {
      n: "14",
      reason: "Bỏ '对，...', dùng quán dụng ngữ '可不就是嘛！', chi tiết sinh hoạt đời thường '囤在冰箱里', '微波炉一热'.",
      zh: "可不就是嘛！平时把半成品囤在冰箱里，忙起来微波炉一热就能吃，既省事儿又卫生。",
      vi: "Chuẩn cơm nấu luôn rồi! Bình thường cứ trữ sẵn đồ sơ chế trong tủ lạnh, lúc bận đem bỏ lò vi sóng quay nóng là ăn được ngay, vừa tiện lại vừa sạch sẽ."
    },
    {
      n: "20",
      reason: "Thay '好，就这么说定了！' bằng tiếng lóng chốt hẹn khẩu ngữ dứt khoát: '妥了，那就这么说定了！'.",
      zh: "妥了，那就这么说定了，明天中午不见不散！",
      vi: "Chốt kèo! Thế cứ thống nhất vậy nhé, trưa mai không gặp không về!"
    }
  ],
  "gt-b4-c1": [
    {
      n: "07",
      reason: "Lồng ghép trải nghiệm thực tế tắc đường giờ cao điểm '早晚高峰堵得水泄不通', khen tàu điện ngầm '准时靠谱'.",
      zh: "我强烈建议你坐地铁，赶上早晚高峰地上堵得水泄不通，还是地铁准时靠谱。",
      vi: "Tớ khuyên thật lòng là cậu nên đi tàu điện ngầm, trúng giờ cao điểm sáng tối thì đường bộ tắc nghẽn cứng ngắc, chỉ có tàu điện ngầm là đúng giờ và tin cậy nhất thôi."
    },
    {
      n: "16",
      reason: "Bỏ từ cứng nhắc '没错。', thêm cách nói khẩu ngữ tự nhiên '看好末班车', '逛嗨了', '打车可老贵了'.",
      zh: "确实！尤其要看好地铁的末班车时间，免得逛嗨了赶不上末班车，打车可老贵了。",
      vi: "Chuẩn đấy! Nhất là phải canh giờ chuyến tàu cuối, kẻo đi chơi hăng quá lỡ mất chuyến thì tiền bắt taxi về đắt đỏ lắm."
    },
    {
      n: "19",
      reason: "Thay câu cảm ơn đơn điệu '好，今天多亏你帮我看地图' bằng lời thoại sinh động kèm hình ảnh '拿着手机导航也得绕晕了'.",
      zh: "太感谢了！今天多亏你帮我指路，要不然我光拿着手机导航也得绕晕了。",
      vi: "Cảm ơn cậu nhiều nha! Hôm nay may mà có cậu chỉ đường cặn kẽ, chứ không thì tớ có cầm điện thoại dò map cũng dễ đi lòng vòng lạc lối mất."
    }
  ],
  "gt-b4-c2": [
    {
      n: "05",
      reason: "Dùng thuật ngữ mua hàng điện máy thực tế: '4K超高清', '客厅视距', '色彩还原度'.",
      zh: "那您可以重点看这款五十五寸的4K超高清电视，客厅视距正合适，色彩还原度特别高。",
      vi: "Thế thì bác nên xem kỹ mẫu TV 4K siêu sắc nét 55 inch này, khoảng cách xem trong phòng khách cực kỳ vừa tầm mà độ chân thực của màu sắc lại rất cao."
    },
    {
      n: "19",
      reason: "Thay câu cụt '好，我看完再决定买哪一台' bằng thói quen mua sắm thông thái hiện đại: '对比一下各平台的参数和评价'.",
      zh: "行，我先对比一下各平台的参数和评价，再定买哪一款。",
      vi: "Được rồi, để tôi lên mạng so sánh đối chiếu thêm thông số với đánh giá của người dùng xem sao, rồi hẵng chốt mua chiếc nào."
    },
    {
      n: "20",
      reason: "Khẩu ngữ nhân viên bán hàng chu đáo: '您随时招呼我', '称心如意'.",
      zh: "没问题，您随时招呼我，祝您挑到最称心如意的好电视！",
      vi: "Vâng không sao ạ, bác cần gì cứ gọi em nhé, chúc bác chọn được chiếc TV ưng ý vừa lòng nhất!"
    }
  ],
  "gt-b4-c3": [
    {
      n: "04",
      reason: "Dùng cụm từ nóng về việc làm ở TQ: '进大厂' (vào các tập đoàn công nghệ lớn), '挤破头想考公' (tranh nhau thi công chức).",
      zh: "在我们看来，福利待遇和稳定性往往排第一位，所以很多人挤破头想进大厂或者考公务员。",
      vi: "Theo góc nhìn của tụi mình, chế độ đãi ngộ và tính ổn định luôn đứng hàng đầu, nên nhiều bạn trẻ đua nhau tranh một suất vào các tập đoàn lớn hoặc thi công chức."
    },
    {
      n: "14",
      reason: "Bổ sung từ khóa thời sự việc làm '盲目跟风瞎内卷' (cuốn vào vòng xoáy cạnh tranh mù quáng), '身心俱疲'.",
      zh: "太有同感了！求职最怕的就是自己没主见，盲目跟风瞎内卷，到头来身心俱疲。",
      vi: "Tớ đồng cảm sâu sắc luôn! Đi xin việc sợ nhất là không có lập trường riêng, cứ mù quáng cuốn theo trào lưu cạnh tranh khốc liệt, để rồi cuối cùng kiệt sức cả thể xác lẫn tinh thần."
    },
    {
      n: "19",
      reason: "Thay '好啊。' bằng cụm khẩu ngữ đắt giá '交流碰撞，开阔了眼界'.",
      zh: "确实是这样！今天这一场交流碰撞，真是让我开阔了眼界。",
      vi: "Quả đúng là như thế! Buổi trao đổi cởi mở hôm nay thực sự đã giúp tớ mở mang thêm rất nhiều góc nhìn mới mẻ."
    }
  ],
  "gt-b10-c1": [
    {
      n: "09",
      reason: "Dùng khẩu ngữ mặc cả kinh điển của người bản xứ: '开价也太狠了', '对半砍八十块卖不卖？'.",
      zh: "哎哟老板，您这开价也太狠了，对半砍八十块卖不卖？",
      vi: "Ôi bác chủ ơi, bác thét giá rát quá đấy, em chém nửa giá tám mươi tệ bác có bán không nào?"
    },
    {
      n: "16",
      reason: "Lời đáp tiểu thương chợ đêm sống động: '得嘞！', '看您有诚意', '就当交个朋友，亏本给您拿了！'.",
      zh: "得嘞！看您这么有诚意，又一人拿两件，我就当交个朋友，亏本给您拿了！",
      vi: "Thôi được rồi! Thấy em thiện chí mà lại lấy một lúc hai cái, bác coi như bán kết bạn, chịu lỗ để lại cho em đấy nhé!"
    },
    {
      n: "19",
      reason: "Thay '我付钱' bằng thao tác đời thực 100% tại Trung Quốc: '成！一共一百四十，我扫微信转给您。'.",
      zh: "成！一共一百四十，我扫微信转给您。",
      vi: "Xong! Tổng cộng một trăm bốn mươi, em quét mã WeChat chuyển khoản cho bác luôn đây."
    },
    {
      n: "20",
      reason: "Lời tiễn khách buôn bán chân thực: '款到账了！您慢走啊，穿得舒服多帮我带几个回头客！'.",
      zh: "款到账了！您慢走啊，穿得舒服多帮我带几个回头客！",
      vi: "Tiền vào tài khoản rồi nhé! Em đi thong thả, mặc thấy êm đẹp thì nhớ giới thiệu thêm khách quen quay lại ủng hộ bác nha!"
    }
  ],
  "gt-b10-c2": [
    {
      n: "03",
      reason: "Dùng thuật ngữ chọn cà chua ngon của người bản xứ: '沙瓤' (cà chua bột ngọt lịm), '掐指一捏就知道新鲜'.",
      zh: "老板，这西红柿怎么个卖法？红彤彤沙瓤的，掐指一捏就知道新鲜！",
      vi: "Bác chủ ơi, cà chua này bán làm sao thế? Quả đỏ au mọng bột thế này, bấm nhẹ tay là biết tươi rói rồi!"
    },
    {
      n: "11",
      reason: "Thay câu đáp cụt '好吧，...', dùng cách hỏi thực phẩm tươi: '今儿一早刚宰送来的不？'.",
      zh: "行吧，二十七就二十七。不过您这鸡肉是今儿一早刚宰送来的不？",
      vi: "Thôi được, hai mươi bảy thì hai mươi bảy. Cơ mà thịt gà này có chắc là sáng sớm nay vừa mổ chuyển đến không bác?"
    },
    {
      n: "17",
      reason: "Văn hóa đi chợ bình dân: '称好装袋', '顺带搭两根小葱呗？' (xin thêm vài cọng hành ngò).",
      zh: "妥了，先把这几样给我称好装袋。老板，顺带搭两根小葱呗？",
      vi: "Xong xuôi, bác cứ cân rồi bỏ bao mấy món này giùm em. Bác ơi, tiện tay cho em xin thêm hai nhánh hành lá nghen?"
    },
    {
      n: "18",
      reason: "Người bán hàng xởi lởi chiều khách: '葱随手给您塞袋里了！', '抹个零，给六十五就成！'.",
      zh: "行嘞，葱随手给您塞袋里了！一共六十七，给您抹个零，给六十五就成！",
      vi: "Được liền, hành bác nhét sẵn vào túi cho em rồi nhé! Hết thảy sáu mươi bảy tệ, bác bớt số lẻ đi, đưa bác sáu mươi lăm là được rồi!"
    }
  ],
  "gt-b12-c1": [
    {
      n: "02",
      reason: "Khẩu ngữ diễn đạt phong phú: '招人稀罕' (đáng yêu hết nấc), '吃不消', '天天伺候吃喝拉撒'.",
      zh: "看着确实招人稀罕。不过换作我可吃不消，天天伺候宠物吃喝拉撒，太费精力了。",
      vi: "Trông cưng ghê gớm thật đấy. Nhưng đổi lại là tớ thì chịu thua thôi, ngày nào cũng phải cung phụng chuyện ăn uống vệ sinh cho thú cưng, hao tâm tổn sức lắm."
    },
    {
      n: "08",
      reason: "Lồng ghép quán dụng ngữ đắt giá '三分钟热度' (hứng thú nhất thời, mau chán) trong việc nuôi thú cưng.",
      zh: "特别理解你的顾虑。养小动物是一辈子的承诺，绝不能三分钟热度，只图一时好玩儿。",
      vi: "Tớ cực kỳ thấu hiểu nỗi băn khoăn của cậu. Nhận nuôi một con vật là lời cam kết cả đời, tuyệt đối không thể hứng lên ba phút rồi chán, chỉ ham vui lúc ban đầu."
    },
    {
      n: "20",
      reason: "Dùng từ ngữ sinh động '冷不丁' (bất thình lình), gọi thú cưng thân mật là '你家宝贝'.",
      zh: "行啊！只要它不冷不丁朝我扑过来，我就敢去跟你家宝贝交个朋友！",
      vi: "Được chứ! Miễn là ẻm không thình lình lao bổ về phía tớ, thì tớ sẵn sàng sang kết thân làm bạn với bé cưng nhà cậu ngay!"
    }
  ],
  "gt-b12-c2": [
    {
      n: "09",
      reason: "Dùng thuật ngữ hiện đại của mọt phim: '千万打住，可别给我剧透啊！' (đừng spoil phim).",
      zh: "那你挑的那部悬疑片怎么样？千万打住，可别给我剧透啊！",
      vi: "Thế bộ phim trinh thám hồi hộp cậu chọn xem thế nào? Nhớ phanh lại kịp thời nha, cấm chỉ không được spoil kết cục cho tớ đấy!"
    },
    {
      n: "14",
      reason: "Thay '对。' bằng '可不嘛！', dùng cụm khẩu ngữ hiện đại '一码事是一码事', '拍得太拉胯' (nửa sau đuối sức, dở tệ).",
      zh: "可不嘛！喜欢这个悬疑题材是一码事，但这导演后半段拍得太拉胯又是另一码事。",
      vi: "Chuẩn luôn chứ còn gì! Mê cái thể loại giật gân này là một chuyện, nhưng việc ông đạo diễn làm nửa sau phim đuối như cọng bún thiu lại là chuyện hoàn toàn khác."
    },
    {
      n: "19",
      reason: "Từ ngữ xem phim chuẩn gu giới trẻ: '口碑大片', '抢首映场', '二刷'.",
      zh: "赞成！等下周院线上了新口碑大片，咱们抢首映场一起去影院二刷！",
      vi: "Nhất trí hai tay! Đợi tuần tới rạp chiếu phim có bom tấn nào được khen nức nở, tụi mình săn vé suất chiếu đầu tiên đi xem cùng nhau nhé!"
    }
  ],
  "gt-b17-c1": [
    {
      n: "01",
      reason: "Nâng cấp từ ngữ hiện đại, bình đẳng giới: '全职家庭主妇或者主夫', '正儿八经的职业'.",
      zh: "今天咱们来聊个挺有争议性的话题：全职家庭主妇或者主夫，到底算不算一种正儿八经的职业？",
      vi: "Hôm nay tụi mình cùng bàn về một chủ đề khá nhiều luồng ý kiến trái chiều nhé: làm nội trợ toàn thời gian (dù là phụ nữ hay đàn ông), thì rốt cuộc có được coi là một nghề nghiệp đàng hoàng chính quy hay không?"
    },
    {
      n: "05",
      reason: "Miêu tả sinh động thực tế gánh nặng gia đình: '一日三餐、带娃辅导功课', '从早忙到晚脚不沾地', '耗费心血'.",
      zh: "问题症结就在这儿！一日三餐、带娃辅导功课、伺候老人，从早忙到晚脚不沾地，哪一样不耗费心血？",
      vi: "Mấu chốt vấn đề nằm ở chính chỗ đó đấy! Cơm nước ngày ba bữa, chăm con dạy học, phụng dưỡng người già, bận từ sáng bảnh mắt tới khuya chân không chạm đất, có việc nào mà không hao tâm tổn sức đâu?"
    },
    {
      n: "14",
      reason: "Bỏ '对，...', dùng cụm khen '你说到点子上了！', dùng từ vựng tư duy cao '刻板印象' (định kiến), '包揽'.",
      zh: "你说到点子上了！“家庭妇女”这称呼本身就带有刻板印象，搞得好像家务劳动天生就该女人包揽似的。",
      vi: "Cậu nói trúng phóc tim đen rồi! Cái danh xưng 'phụ nữ nội trợ' tự thân nó đã mang nặng định kiến, làm như thể việc nhà cửa con cái sinh ra là mặc định phụ nữ phải ôm hết vậy."
    }
  ],
  "gt-b17-c2": [
    {
      n: "01",
      reason: "Văn phong lập luận khẩu ngữ sắc sảo: '依我看', '不可逆转的污染负担'.",
      zh: "依我看，盲目扩张汽车工业，势必会给生态环境带来不可逆转的污染负担。",
      vi: "Theo góc nhìn của tớ, việc phát triển ồ ạt ngành công nghiệp ô tô chắc chắn sẽ tạo ra gánh nặng ô nhiễm không thể cứu vãn cho môi trường sinh thái."
    },
    {
      n: "06",
      reason: "Bổ sung chi tiết thực tế đời sống Trung Quốc: '绿牌新能源车遍地开花' (xe biển xanh năng lượng mới khắp nơi), '零尾气排放'.",
      zh: "不过你看现在绿牌新能源车遍地开花，行驶过程中零尾气排放，环保效益还是很明显的。",
      vi: "Nhưng cậu nhìn xem, bây giờ xe điện năng lượng mới biển số xanh chạy đầy đường rồi, trong quá trình lăn bánh không hề xả khói bụi độc hại, lợi ích bảo vệ môi trường là thấy rõ mồn một mà."
    },
    {
      n: "17",
      reason: "Bỏ '没错。', dùng cụm từ tư duy phản biện cao: '这话在理！', '绝不是非黑即白，不能搞成零和博弈'.",
      zh: "这话在理！发展经济跟保护生态绝不是非黑即白，不能搞成零和博弈。",
      vi: "Câu này cậu nói rất có lý! Phát triển kinh tế với gìn giữ môi trường tuyệt đối không phải câu chuyện trắng hay đen, càng không thể biến nó thành một cuộc chiến mất còn một mất một còn."
    },
    {
      n: "20",
      reason: "Bỏ '对。', dùng cụm chốt tranh luận đắt giá: '说得太透彻了！', lồng ghép thành ngữ kinh điển '绿水青山的环境代价'.",
      zh: "说得太透彻了！日子要向前过，但这绿水青山的环境代价，任谁也忽视不得。",
      vi: "Phân tích quá đỗi sâu sắc! Đời sống thì vẫn phải tiến lên, nhưng cái giá phải trả của non xanh nước biếc môi trường sống, chẳng một ai được phép ngó lơ."
    }
  ]
};

async function main() {
  const jsonPath = join(root, "tools", "book2-data.json");
  const rawData = JSON.parse(readFileSync(jsonPath, "utf-8"));

  let totalDiffs = 0;

  for (const lesson of rawData.lessons) {
    for (const topic of lesson.topics) {
      const topicId = topic.id;
      const edits = B2_V2_EDITS[topicId] || [];

      // Giữ nguyên v1_lines là bản gốc nguyên bản
      const v1Lines = topic.lines.map((l) => ({ ...l }));
      topic.v1_lines = v1Lines;

      // Tạo v2_lines
      const v2Lines = topic.lines.map((l) => ({ ...l }));
      const diffs = [];

      for (const edit of edits) {
        const idx = v2Lines.findIndex((l) => l.n === edit.n);
        if (idx !== -1) {
          const oldLine = v1Lines[idx];
          const pyRes = computePy(edit.zh);

          v2Lines[idx] = {
            ...v2Lines[idx],
            zh: edit.zh,
            pinyin: pyRes.plain,
            pinyinHtml: pyRes.html,
            vi: edit.vi,
            modified: true,
            reason: edit.reason
          };

          diffs.push({
            n: edit.n,
            role: oldLine.role,
            reason: edit.reason,
            v1: {
              zh: oldLine.zh,
              pinyin: oldLine.pinyin,
              pinyinHtml: oldLine.pinyinHtml,
              vi: oldLine.vi
            },
            v2: {
              zh: edit.zh,
              pinyin: pyRes.plain,
              pinyinHtml: pyRes.html,
              vi: edit.vi
            }
          });
        }
      }

      topic.v2_lines = v2Lines;
      topic.diffs = diffs;
      totalDiffs += diffs.length;

      console.log(`✓ ${topicId}: ${diffs.length} câu được nâng cấp V2`);
    }
  }

  writeFileSync(jsonPath, JSON.stringify(rawData, null, 2), "utf-8");
  console.log(`\n🎉 Hoàn tất! Đã nâng cấp thành công ${totalDiffs} câu thoại cho toàn bộ 13 tình huống của Book 2.`);
}

main().catch(console.error);
