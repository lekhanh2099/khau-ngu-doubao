// tools/v2-enhancements.mjs
// Định nghĩa các câu được tối ưu hóa (V2) cho 13 chủ đề thi khẩu ngữ.
// Mục tiêu:
// 1. Lồng ghép các mẫu câu/ngữ pháp ăn điểm chính thức của 《汉语口语速成·提高篇》
// 2. TẬP QUÁN KHẨU NGỮ BẢN XỨ: Loại bỏ triệt để các câu cụt/1 chữ (như 对、是啊、没错、没有、不会),
//    thay bằng các quán dụng ngữ tán thành, cảm thán tự nhiên của người bản xứ (谁说不是呢、可不是嘛、你说得太对了、那倒是、就是说啊、那哪儿能啊、可太是了)
// 3. Giữ nguyên 100% mạch ý (argumentation flow) và tính đối thoại A-B 18 câu

export const V2_ENHANCEMENTS = {
  // ==========================================
  // BÀI 2: 健康第一
  // Mẫu câu: 坚持下来 / 坚持下去 / 别提多……了 / 非……不可 / 不至于…… / 千万
  // ==========================================
  "b2-c1": {
    "02": {
      zh: "嗨，可不是嘛！这段时间天天加班，早上起床别提多困难了。",
      vi: "Haizz, chứ còn gì nữa! Dạo này ngày nào cũng tăng ca, buổi sáng thức dậy đừng nhắc tới khó khăn thế nào nữa (cực kỳ khó dậy).",
      reason: "Bỏ cách mở đầu đơn điệu '是啊', dùng khẩu ngữ tự nhiên 【嗨，可不是嘛！】 và lồng ghép mẫu câu Bài 2 【别提多……了】."
    },
    "12": {
      zh: "谁说不是呢！要是三天打鱼、两天晒网，再好的计划也白搭。",
      vi: "Ai bảo không phải chứ! Nếu mà ba ngày đánh cá, hai ngày phơi lưới (bữa đực bữa cái), thì kế hoạch có hay đến mấy cũng công cốc.",
      reason: "Thay câu cụt '没错' bằng quán dụng ngữ đồng tình 【谁说不是呢！】, thay '没有用' bằng từ khẩu ngữ đắt giá 【白搭】."
    },
    "13": {
      zh: "那是不是每天非去运动一个小时不可才算健康？",
      vi: "Thế có phải mỗi ngày nhất thiết phải đi vận động một tiếng mới tính là khỏe mạnh không?",
      reason: "Áp dụng mẫu câu trọng tâm Bài 2 【非……不可】 (nhấn mạnh sự áp đặt/bắt buộc mang tính thái quá, giúp câu hỏi thảo luận sắc bén hơn)."
    },
    "14": {
      zh: "那倒不至于。关键是找到适合自己的节奏，慢慢养成习惯。",
      vi: "Thế thì không đến mức vậy đâu. Mấu chốt là tìm được nhịp điệu phù hợp với mình, dần dần hình thành thói quen.",
      reason: "Áp dụng cụm khẩu ngữ Bài 2 【不至于 / 那倒不至于】 (phản bác lại quan điểm cực đoan một cách hòa nhã, chuẩn phong cách nói chuyện của người bản xứ)."
    },
    "16": {
      zh: "你说得太对了！再忙也得喘口气，千万别为了赶进度一直硬熬着。",
      vi: "Cậu nói chuẩn quá luôn! Bận mấy cũng phải thở chút xíu, tuyệt đối đừng vì chạy tiến độ mà cứ cố gồng thức khuya miết.",
      reason: "Thay đáp từ cụt '对' bằng lời tán thành ấm áp 【你说得太对了！】, kết hợp mẫu Bài 2 【千万别……】 và khẩu ngữ 【喘口气 / 硬熬着】."
    }
  },

  "b2-c2": {
    "06": {
      zh: "那要是最近总觉得疲劳，是不是非吃点儿补药不可？",
      vi: "Thế nếu dạo này cứ thấy mệt mỏi, có phải nhất thiết phải uống chút thuốc bổ không?",
      reason: "Lồng ghép mẫu câu Bài 2 【非……不可】 (thay cho câu gốc '是不是应该买点儿补药' có phần bình dị, tăng tính đắt giá trong bài thi nói)."
    },
    "07": {
      zh: "那倒不至于。我觉得应该先看看到底是缺营养还是压力大，千万别一累就乱吃药。",
      vi: "Thế thì chưa đến mức đó. Mình thấy nên xem rốt cuộc là thiếu dinh dưỡng hay do áp lực lớn, tuyệt đối đừng hễ mệt là uống thuốc bừa bãi.",
      reason: "Kết hợp 2 mẫu trọng điểm của Bài 2: 【那倒不至于】 (bác bỏ thái quá) và 【千万别……】 (khuyên răn dứt khoát)."
    },
    "08": {
      zh: "这倒也是！现在的广告吹得别提多玄乎了，好像什么毛病都能包治百病似的。",
      vi: "Cái đó thì đúng thật! Quảng cáo bây giờ thổi phồng đừng nhắc tới thần thánh cỡ nào, cứ như thể chữa được bách bệnh vậy.",
      reason: "Thay '也对' bằng cụm tự nhiên 【这倒也是！】, kết hợp mẫu Bài 2 【别提多……了】."
    },
    "15": {
      zh: "那倒是！与其光想着靠补药，真不如先把吃饭、睡觉和运动规律理顺了。",
      vi: "Đúng là như vậy! So với việc chỉ chăm chăm dựa vào thuốc bổ, thật sự chẳng thà sắp xếp nề nếp ăn uống, ngủ nghỉ và vận động cho đâu vào đấy trước đã.",
      reason: "Thay chữ '对' bằng quán dụng ngữ đồng ý 【那倒是！】."
    },
    "17": {
      zh: "可不是嘛！关键是搞清楚自己的身体到底缺啥，绝不能盲目跟着广告瞎买。",
      vi: "Chứ còn gì nữa! Mấu chốt là phải hiểu rõ cơ thể mình rốt cuộc thiếu cái gì, tuyệt đối không được nhắm mắt mua bừa theo quảng cáo.",
      reason: "Thay chữ '没错' bằng khẩu ngữ tán đồng kinh điển 【可不是嘛！】 và từ khẩu ngữ đời sống 【缺啥 / 瞎买】."
    },
    "18": {
      zh: "我明白了。平时养成规律作息并坚持下去，比迷信补药管用多了。",
      vi: "Mình hiểu rồi. Ngày thường rèn nếp sống điều độ và kiên trì duy trì, hiệu quả hơn mê tín thuốc bổ nhiều.",
      reason: "Đưa mẫu câu chốt Bài 2 【坚持下去】 vào câu kết, giúp thông điệp vững vàng và bám sát giáo trình."
    }
  },

  // ==========================================
  // BÀI 3: 好东西人人爱吃
  // Mẫu câu: V+惯/吃不惯 / 看来…… / 要么……要么…… / 好说 / 大饱口福 / 有两下子
  // ==========================================
  "b3-c1": {
    "03": {
      zh: "我比较喜欢清淡一点儿的菜，酸甜口的也吃得惯，太辣的就吃不惯了。",
      vi: "Mình thích món thanh đạm một chút, vị chua ngọt cũng ăn quen, chứ cay quá thì ăn không quen rồi.",
      reason: "Áp dụng mẫu câu Bài 3 【V + 得惯 / V + 不惯】 (thay cho '不太能吃辣' bằng cách diễn đạt tập quán ăn uống chuẩn bài)."
    },
    "05": {
      zh: "看来你挺重口味的。麻辣火锅我偶尔尝尝还行，太辣的我真受不了。",
      vi: "Xem ra khẩu vị bạn khá đậm đấy. Lẩu cay tê mình thi thoảng nếm thử thì được, cay quá mình chịu thật.",
      reason: "Lồng ghép mẫu Bài 3 【看来……】 (suy đoán tự nhiên dựa trên thông tin vừa nghe từ đối phương)."
    },
    "06": {
      zh: "那倒是，麻辣火锅确实是我的心头好！不过大家一块儿吃饭，肯定得照顾每个人的口味。",
      vi: "Cái đó thì đúng rồi, lẩu cay tê đúng là món ruột của mình! Nhưng mà mọi người cùng đi ăn thì nhất định phải để tâm đến khẩu vị của từng người.",
      reason: "Thay '是啊' bằng 【那倒是，...确实是我的心头好】 (thể hiện món ăn yêu thích cực kỳ tự nhiên)."
    },
    "15": {
      zh: "好说！咱们要么点一道微辣的，要么让厨师少放辣，两全其美，怎么样？",
      vi: "Dễ nói thôi (chuyện nhỏ)! Chúng mình hoặc là gọi một món cay nhẹ, hoặc là bảo đầu bếp bớt cay, vẹn cả đôi đường, thấy sao?",
      reason: "Lồng ghép đồng thời 2 cấu trúc ăn điểm Bài 3: 【好说】 (dễ giải quyết) và 【要么……要么……】 (lựa chọn phương án dung hòa)."
    },
    "16": {
      zh: "太棒了！咱们再加一道清淡的鲜汤，少点一些，省得吃不完白白浪费。",
      vi: "Tuyệt vời luôn! Tụi mình gọi thêm một tô canh thanh mát, gọi ít một chút, đỡ bị ăn không hết rồi bỏ phí uổng công.",
      reason: "Thay '好主意' bằng cảm thán 【太棒了！】 và mẫu liên kết 【省得】."
    },
    "18": {
      zh: "走！今天咱们换换口味，一定让你大饱口福！",
      vi: "Đi thôi! Hôm nay tụi mình đổi khẩu vị, nhất định cho bạn thỏa thích thưởng thức món ngon!",
      reason: "Đưa thành ngữ khẩu ngữ Bài 3 【大饱口福】 vào câu chốt rủ rê đi ăn, cực kỳ hào hứng và tự nhiên."
    }
  },

  "b3-c2": {
    "06": {
      zh: "确实是这样！全家人围坐在一块儿，每人捧着一碗饭，热热闹闹地一起夹菜吃，特别温馨。",
      vi: "Chuẩn xác là như vậy luôn! Cả nhà quây quần ngồi lại, mỗi người bưng một chén cơm, rôm rả gắp thức ăn chung, vô cùng ấm cúng.",
      reason: "Thay đáp từ '没错' bằng 【确实是这样！】 và miêu tả sinh động không khí bữa cơm gia đình Việt."
    },
    "08": {
      zh: "越南菜整体偏清淡，外国朋友一般都吃得惯，因为调料丰富，可以自己加柠檬或辣椒。",
      vi: "Món Việt nhìn chung thiên về thanh đạm, bạn bè nước ngoài thường đều ăn quen được, vì gia vị phong phú, có thể tự vắt thêm chanh hoặc bỏ ớt.",
      reason: "Lồng ghép mẫu Bài 3 【吃得惯】 vào ngữ cảnh giới thiệu ẩm thực bản địa cho người nước ngoài."
    },
    "14": {
      zh: "差异还真不小呢！北方口味偏咸鲜适中，中部人特别能吃辣，而南部呢，口味往往偏甜一些。",
      vi: "Khác biệt thật sự không hề nhỏ đâu nha! Khẩu vị miền Bắc thiên về mặn mà vừa vặn, người miền Trung thì ăn cay siêu giỏi, còn miền Nam thì vị hay ngọt hơn một chút.",
      reason: "Thay câu cụt lủn '挺大的' bằng lối diễn đạt lưu loát 【差异还真不小呢！】."
    },
    "16": {
      zh: "好说！有机会来我家，我亲自下厨给你露两手，做正宗的越南春卷！",
      vi: "Chuyện nhỏ! Có dịp đến nhà mình, mình đích thân vào bếp trổ tài hai chiêu, làm nem cuốn Việt Nam chính tông cho bạn!",
      reason: "Đưa mẫu Bài 3 【好说】 và quán dụng ngữ 【露两手 / 有两下子】 (thể hiện sở trường nấu nướng) tạo nét thân tình, hiếu khách."
    },
    "17": {
      zh: "太好了！看来我以后有口福了，那咱们一言为定！",
      vi: "Tuyệt quá! Xem ra sau này mình có lộc ăn rồi, thế chúng mình chốt thế nhé!",
      reason: "Lồng ghép 【看来……】 và cụm 【有口福】 (có duyên được ăn ngon), đối đáp ăn khớp tuyệt đối với câu trước."
    }
  },

  // ==========================================
  // BÀI 5: 你喜欢逛商店吗？
  // Mẫu câu: 没有什么可+V+的 / V1……好+V2 / V+遍 / 除非……否则/才 / V+中(zhòng) / 说得过去
  // ==========================================
  "b5-c1": {
    "06": {
      zh: "这好办，大家商量好再去买，省得送重了；关系一般的送红包就挺体面。",
      vi: "Cái này dễ thôi, mọi người bàn bạc kỹ rồi hẵng đi mua, đỡ bị tặng trùng; quan hệ bình thường thì tặng phong bì là khá tươm tất rồi.",
      reason: "Áp dụng cấu trúc Bài 5 【V1……好 + V2……】 (商量好再去买) và cấu trúc tránh phiền phức 【省得】."
    },
    "08": {
      zh: "那红包里的金额一般包多少才说得过去？有没有什么讲究？",
      vi: "Thế tiền trong phong bì thường bỏ bao nhiêu thì coi như hợp lẽ (chấp nhận được)? Có kiêng kị hay lưu ý gì không?",
      reason: "Lồng ghép quán dụng ngữ Bài 5 【说得过去】 (mức độ thỏa đáng, coi được, không bị chê trách)."
    },
    "10": {
      zh: "除非关系特别铁才会包大红包，普通同事的话，两三百块钱就说得过去了。",
      vi: "Trừ phi quan hệ đặc biệt thân thiết mới đi phong bì lớn, còn đồng nghiệp bình thường thì hai ba trăm tệ là coi được rồi.",
      reason: "Lồng ghép mẫu liên từ quan trọng Bài 5 【除非……才……】 kết hợp 【说得过去】."
    },
    "17": {
      zh: "确实，心意到了比啥都强！没必要非买昂贵的奢侈品，实用得体、心意真诚就是最好的礼物。",
      vi: "Chuẩn luôn, tấm lòng gửi gắm đến nơi là quý hơn bất cứ thứ gì! Không cần thiết cứ phải mua đồ hiệu xa xỉ đắt tiền, thiết thực tươm tất và chân thành chính là món quà tuyệt nhất.",
      reason: "Thay chữ '对' bằng quán dụng ngữ khẩu ngữ ấm áp 【确实，心意到了比啥都强！】."
    }
  },

  "b5-c2": {
    "04": {
      zh: "那可不嘛！换季清仓大多是断码或者过季款，好看的款式早被人挑光了。",
      vi: "Chứ còn gì nữa! Xả hàng chuyển mùa phần lớn là hàng lẻ size hoặc mẫu cũ, mấy kiểu đẹp mắt người ta đã lựa sạch từ sớm rồi.",
      reason: "Thay câu cụt '是有这种情况' bằng quán dụng ngữ cực kỳ chuẩn miệng 【那可不嘛！】."
    },
    "06": {
      zh: "还有各大节假日和网购节，逛遍各大平台都在促销，别提多划算了。",
      vi: "Còn có các dịp lễ lớn và ngày hội mua sắm online, dạo khắp các sàn đều đang khuyến mãi, đừng nhắc tới hời thế nào nữa.",
      reason: "Lồng ghép mẫu Bài 5 【V + 遍】 (逛遍) và mẫu biểu cảm 【别提多……了】."
    },
    "08": {
      zh: "确实得留个心眼。除非真的刚需，否则别为了凑单买一堆用不上的东西。",
      vi: "Đúng là phải để tâm một chút. Trừ phi thật sự có nhu cầu cấp thiết, nếu không thì đừng vì gom đơn mà mua cả đống đồ không dùng tới.",
      reason: "Áp dụng cấu trúc liên từ Bài 5 【除非……否则……】 (nhấn mạnh nguyên tắc tiêu dùng tỉnh táo)."
    },
    "12": {
      zh: "可不是嘛！遇到商场反季清仓甩卖，价格真能砍下来一大截呢。",
      vi: "Chuẩn luôn chứ đâu! Gặp dịp trung tâm thương mại xả kho trái mùa, giá cả thực sự có thể ép xuống được một khoản lớn luôn đó.",
      reason: "Thay chữ '没错' bằng cảm thán 【可不是嘛！】 và từ khẩu ngữ mua bán 【砍下来一大截】."
    },
    "14": {
      zh: "当然是质量。要是没看中合适的款式和质量，价格再低也坚决不买。",
      vi: "Đương nhiên là chất lượng rồi. Nếu chưa ưng (chấm trúng) kiểu dáng và chất lượng phù hợp, giá có rẻ nữa cũng kiên quyết không mua.",
      reason: "Áp dụng bổ ngữ kết quả Bài 5 【看中 (zhòng)】 (chấm được, vừa mắt)."
    },
    "17": {
      zh: "那倒是，冲动是魔鬼嘛！我打算先列个刚需清单，耐着性子等大促。",
      vi: "Đúng thế thật, mua sắm bốc đồng là tai họa mà! Mình định lên sẵn danh sách đồ cần mua gấp, kiên nhẫn đợi đợt khuyến mãi lớn.",
      reason: "Thay chữ '没错' bằng tục ngữ khẩu ngữ nổi tiếng 【那倒是，冲动是魔鬼嘛！】."
    }
  },

  "b5-c3": {
    "04": {
      zh: "其实日常衣服没有什么可攀比的，名牌儿固然体面，但溢价实在太高了。",
      vi: "Thực ra quần áo thường ngày chẳng có gì đáng để so bì hơn thua cả, đồ hiệu thì sang thật, nhưng giá bị đội lên quá cao rồi.",
      reason: "Lồng ghép mẫu Bài 5 【没有什么可 + V + 的】 (没有什么可攀比的: không có gì để đua đòi)."
    },
    "05": {
      zh: "就是说啊！我倒不是全盘否定名牌，只是觉得没必要单为一个商标掏大笔冤枉钱。",
      vi: "Đấy, ý mình chính là thế! Mình không hề bài xích hoàn toàn đồ hiệu, chỉ là thấy chẳng cần thiết chỉ vì một cái logo nhãn mác mà phải móc hầu bao trả khoản tiền oan uổng.",
      reason: "Thay '是啊' bằng quán dụng ngữ đồng tình sâu sắc 【就是说啊！】 và cụm khẩu ngữ 【掏冤枉钱】."
    },
    "08": {
      zh: "只要款式大方、面料舒服，价格也说得过去，中档货完全够用了。你觉得呢？",
      vi: "Chỉ cần kiểu dáng trang nhã, chất vải thoải mái, giá cả cũng phải chăng hợp lý, thì hàng tầm trung hoàn toàn đủ dùng rồi. Bạn thấy sao?",
      reason: "Lồng ghép cụm Bài 5 【说得过去】 (giá cả hợp lý, chấp nhận được)."
    },
    "11": {
      zh: "除非出席很正式的商务场合需要撑场面，否则日常穿戴我坚决不买昂贵的名牌儿。",
      vi: "Trừ phi tham dự dịp thương mại rất trang trọng cần giữ thể diện, còn ngày thường mặc đồ mình kiên quyết không mua đồ hiệu đắt đỏ.",
      reason: "Áp dụng mẫu điều kiện Bài 5 【除非……否则……】 tạo lập luận sắc sảo, thuyết phục."
    },
    "15": {
      zh: "那倒是！网购虽然省事，但衣服版型合不合适，还是得亲自上身试穿才踏实。",
      vi: "Đúng là vậy! Mua online tuy tiện thật, nhưng form dáng quần áo có vừa vặn không, vẫn phải đích thân mặc thử lên người mới an tâm.",
      reason: "Thay '对' bằng liên từ khẩu ngữ chuẩn xác 【那倒是！】."
    },
    "17": {
      zh: "可不是嘛！只要做工扎实、版型板正，价格又说得过去，中档品牌绝对是首选。",
      vi: "Chứ còn gì nữa! Miễn là đường may chắc chắn, form dáng ngay ngắn chuẩn chỉnh, giá lại phải chăng hợp túi tiền, thì hàng tầm trung chắc chắn là lựa chọn số một.",
      reason: "Thay chữ '没错' bằng 【可不是嘛！】 và tính từ miêu tả quần áo đắt giá 【版型板正】."
    }
  },

  // ==========================================
  // BÀI 7: 让我们轻松一下
  // Mẫu câu: V+过来 / 为……起见 / 省得 / 接着…… / ……吧，……；……吧，……
  // ==========================================
  "b7-c1": {
    "04": {
      zh: "长假出门吧，到处人挤人；在家里宅着吧，又觉得虚度光阴。真是两难！",
      vi: "Nghỉ dài ngày mà ra ngoài thì nơi nơi chen chúc; rú rú ở nhà thì lại thấy lãng phí thời gian. Đúng là tiến thoái lưỡng nan!",
      reason: "Áp dụng cấu trúc nêu song song 2 tình huống khó xử Bài 7 【……吧，……；……吧，……】 cực kỳ đắt giá."
    },
    "08": {
      zh: "为安全起见，出发前一定要查好天气并把车票订好，省得临时手忙脚乱。",
      vi: "Để cho an toàn, trước khi xuất phát nhất định phải tra kỹ thời tiết và đặt vé xe sẵn, đỡ bị lâm vào cảnh cuống cuồng.",
      reason: "Lồng ghép đồng thời 2 mẫu Bài 7: 【为……起见】 (xét vì mục đích an toàn) và 【省得】 (đỡ phải, tránh phát sinh phiền phức)."
    },
    "10": {
      zh: "平时工作压力大，趁着假期彻底睡个饱觉，整个人的精神才能缓得过来。",
      vi: "Ngày thường áp lực công việc lớn, nhân kỳ nghỉ ngủ một giấc thật đã đời, tinh thần cả con người mới hồi phục lại được.",
      reason: "Áp dụng bổ ngữ khả năng Bài 7 【V + 得过来】 (缓得过来: hồi phục lại được sức lực/tinh thần)."
    },
    "14": {
      zh: "先在家睡个整觉，接着约几个老朋友喝咖啡，别提多惬意了。你呢？",
      vi: "Trước tiên ngủ một giấc đẫy ở nhà, tiếp đó hẹn mấy người bạn cũ đi uống cà phê, đừng nhắc tới khoan khoái thế nào nữa. Còn bạn?",
      reason: "Lồng ghép từ nối diễn tiến Bài 7 【接着……】 và mẫu cảm thán 【别提多……了】."
    },
    "16": {
      zh: "谁说不是呢！依我看哪，度假真不在于非跑多远，核心是把身心彻底放松下来。",
      vi: "Ai bảo không phải chứ! Theo như mình thấy á, nghỉ mát thật sự đâu cần cứ phải đi thật xa, cốt lõi là để cả thân lẫn tâm được thả lỏng hoàn toàn.",
      reason: "Thay chữ '对' bằng quán dụng ngữ đồng tình 【谁说不是呢！】."
    }
  },

  "b7-c2": {
    "06": {
      zh: "下班直接回家吧，觉得太闷；去远处的景点吧，时间又不够，喝咖啡正好！",
      vi: "Tan làm về thẳng nhà thì thấy bí bách quá; đi điểm tham quan xa thì thời gian lại không đủ, ngồi cà phê là vừa vặn nhất!",
      reason: "Áp dụng cấu trúc Bài 7 【……吧，……；……吧，……】 giải thích lý do văn hóa cà phê vỉa hè phổ biến ở Việt Nam."
    },
    "10": {
      zh: "为健康起见，现在很多年轻人也加入进来打羽毛球、跑步，出出汗才舒服。",
      vi: "Để hướng tới sức khỏe, hiện nay rất nhiều bạn trẻ cũng tham gia vào chơi cầu lông, chạy bộ, toát mồ hôi mới thấy sảng khoái.",
      reason: "Lồng ghép mẫu Bài 7 【为……起见】."
    },
    "14": {
      zh: "大家找个开阔的地方喝茶聚聚，省得整天憋在空调房里，别提多自在了。",
      vi: "Mọi người tìm một nơi thoáng đãng uống trà tụ họp, đỡ bị cả ngày giam mình trong phòng máy lạnh, đừng nhắc tới thoải mái thế nào nữa.",
      reason: "Lồng ghép mẫu Bài 7 【省得】 kết hợp 【别提多……了】."
    },
    "18": {
      zh: "可不是嘛！大伙儿虽然玩法各异，但归根结底都是为了给紧绷的生活解解压。",
      vi: "Chứ còn gì nữa! Mọi người dù cách chơi có khác nhau, nhưng quy cho cùng đều là để xả bớt áp lực cho cuộc sống căng thẳng.",
      reason: "Thay chữ '对' bằng quán dụng ngữ 【可不是嘛！】 và cụm từ đắt giá 【给生活解解压】."
    }
  },

  // ==========================================
  // BÀI 8: 计划赶不上变化
  // Mẫu câu: 不光……还…… / V重叠+看 / 当天 / 准 / 万一…… / 打个招呼
  // ==========================================
  "b8-c1": {
    "04": {
      zh: "那阵子不光白天要赶项目，晚上还得备考，我只得按轻重缓急列个清单。",
      vi: "Đợt đó không những ban ngày phải chạy dự án, buổi tối lại còn phải ôn thi, mình đành xếp danh sách theo thứ tự việc gấp việc quan trọng.",
      reason: "Áp dụng mẫu tăng tiến Bài 8 【不光……还……】."
    },
    "08": {
      zh: "每天做计划留出一点儿空当，万一有紧急事情插进来，也不至于手忙脚乱。",
      vi: "Mỗi ngày lập kế hoạch nên chừa ra chút thời gian trống, ngộ nhỡ có việc khẩn cấp chen ngang thì cũng không đến mức luống cuống chân tay.",
      reason: "Lồng ghép giả định tình huống bất ngờ Bài 8 【万一……】 kết hợp 【不至于】."
    },
    "09": {
      zh: "可太是了！真是计划赶不上变化。我上周突然被塞了一个紧急任务，差点儿把考试复习全搅黄了。",
      vi: "Chuẩn không cần chỉnh luôn! Đúng là kế hoạch không đuổi kịp biến hóa. Tuần trước mình tự dưng bị nhét thêm một nhiệm vụ gấp, suýt nữa làm hỏng bét cả việc ôn thi.",
      reason: "Thay '是啊' bằng câu cửa miệng thế hệ mới 【可太是了！】 và thành ngữ khẩu ngữ 【搅黄了】."
    },
    "10": {
      zh: "就是说啊！越是忙得不可开交，越得学会果断推掉那些无关紧要的无效社交。",
      vi: "Đấy, chính là như thế! Càng bận rộn đến mức tối tăm mặt mũi, càng phải học cách dứt khoát từ chối những cuộc xã giao vô bổ không quan trọng.",
      reason: "Thay '没错' bằng 【就是说啊！】 và thành ngữ 【忙得不可开交】."
    },
    "14": {
      zh: "要是工作实在赶不过来，得提前跟主管打个招呼，商量一下调整方案。",
      vi: "Nếu công việc thật sự làm không kịp, phải báo trước một tiếng với sếp, cùng bàn bạc phương án điều chỉnh.",
      reason: "Áp dụng quán dụng ngữ giao tiếp công sở Bài 8 【打个招呼】."
    },
    "16": {
      zh: "你照这个办法试试看，心里准能踏实很多，干起活来也更有劲儿。",
      vi: "Bạn thử làm theo cách này xem, trong lòng chắc chắn yên tâm hơn nhiều, làm việc cũng có tinh thần hơn.",
      reason: "Lồng ghép 2 mẫu Bài 8: 【V+看】 (试试看) và phó từ khẩu ngữ chắc chắn 【准】."
    }
  },

  "b8-c2": {
    "06": {
      zh: "当天下午先到酒店放行李、歇口气，傍晚才去海边散步，晚上尝当地小吃。",
      vi: "Ngay buổi chiều hôm đó trước tiên tới khách sạn gửi hành lý, nghỉ ngơi lấy sức, chập tối mới ra biển tản bộ, tối thưởng thức ăn vặt địa phương.",
      reason: "Sử dụng từ chỉ mốc thời gian đặc trưng Bài 8 【当天】."
    },
    "08": {
      zh: "第二天不光逛了核心景点，还留出大半个下午喝咖啡看海，节奏很舒服。",
      vi: "Ngày thứ hai không những dạo qua các điểm chính, mà còn chừa hẳn nửa buổi chiều ngồi cà phê ngắm biển, nhịp điệu rất dễ chịu.",
      reason: "Áp dụng cấu trúc liên kết Bài 8 【不光……还……】."
    },
    "14": {
      zh: "可不是嘛！做两手准备就是防着万一下雨；万一室外泡汤了，准能立马切换成室内逛展。",
      vi: "Chứ sao nữa! Lên kế hoạch hai phương án chính là phòng ngộ nhỡ trời mưa; nhỡ hoạt động ngoài trời bị đổ bể, thì chắc chắn chuyển hướng ngay sang đi bảo tàng trong nhà.",
      reason: "Thay chữ '对' bằng 【可不是嘛！】 và cụm khẩu ngữ dí dỏm 【泡汤了】."
    },
    "16": {
      zh: "自由行多好，行程变动提前跟民宿老板打声招呼就行，既随性又舒服。",
      vi: "Đi tự túc thích bao nhiêu, lịch trình có đổi thì chỉ cần báo trước một tiếng với chủ homestay là xong, vừa tự do lại thoải mái.",
      reason: "Áp dụng mẫu Bài 8 【打声招呼】."
    }
  },

  // ==========================================
  // BÀI 9: 大手大脚还是精打细算
  // Mẫu câu: 干吗……？ / 跟自己过不去 / 靠…… / 即使……也…… / 此外…… / 一年下来
  // ==========================================
  "b9-c1": {
    "06": {
      zh: "干吗非要克制自己呢？我以前看到喜欢的衣服，经常忍不住马上买下来。",
      vi: "Việc gì cứ phải kiềm chế bản thân chứ? Ngày trước mình hễ thấy quần áo thích là thường nhịn không được mua ngay lập tức.",
      reason: "Áp dụng câu hỏi tu từ mang sắc thái khẩu ngữ Bài 9 【干吗……？】."
    },
    "10": {
      zh: "谁说不是呢！节省固然值得提倡，但即使要存钱，也犯不上处处跟自己过不去嘛。",
      vi: "Ai bảo không phải chứ! Tiết kiệm thì đúng là đáng hoan nghênh, nhưng dù có phải tích lũy tiền, cũng đâu đáng để chỗ nào cũng tự làm khổ mình đâu nè.",
      reason: "Thay '是啊' bằng 【谁说不是呢！】 và lồng ghép cấu trúc nhượng bộ Bài 9 【即使……也……】 cùng quán dụng ngữ 【跟自己过不去】."
    },
    "14": {
      zh: "此外，每个月按时存下一笔备用金，一年下来就是一笔不小的数目。",
      vi: "Ngoài ra, mỗi tháng đúng hạn để dành một khoản tiền dự phòng, cả một năm trôi qua sẽ là một con số không hề nhỏ.",
      reason: "Lồng ghép từ nối chuyển đoạn Bài 9 【此外】 và bổ ngữ xu hướng kết quả 【一年下来】."
    },
    "16": {
      zh: "可不是嘛！我现在也琢磨着得学会精打细算过日子。你平时都有啥独家秘诀呀？",
      vi: "Chứ còn gì nữa! Dạo này mình cũng đang tính toán phải học cách tính toán chi li vun vén cuộc sống. Bạn thường ngày có bí quyết gia truyền nào thế?",
      reason: "Thay '对' bằng câu cảm thán thân mật 【可不是嘛！】 và từ khẩu ngữ 【琢磨着 / 独家秘诀】."
    },
    "18": {
      zh: "好啊！靠科学规划把钱花在刀刃上，过日子才能既踏实又开心。",
      vi: "Nhất trí! Dựa vào việc lập kế hoạch khoa học để tiêu tiền đúng chỗ cần thiết, cuộc sống mới vừa vững tâm vừa vui vẻ.",
      reason: "Lồng ghép giới từ Bài 9 【靠……】 (靠科学规划) nâng cao tầm nhận thức về tài chính."
    }
  },

  "b9-c2": {
    "04": {
      zh: "干吗非等月底没钱了才后悔？坚持记账，一个月下来花销一目了然。",
      vi: "Việc gì cứ phải đợi đến cuối tháng hết nhẵn tiền rồi mới hối hận? Kiên trì ghi chép, hết một tháng chi tiêu rõ mười mươi.",
      reason: "Lồng ghép mẫu Bài 9 【干吗……？】 và bổ ngữ thời gian 【一个月下来】."
    },
    "06": {
      zh: "那哪儿能啊！每个月工资一到账，我铁定先扣除房租和饭钱，雷打不动存下一笔，剩下的才做零花。",
      vi: "Ui trời, đâu có tùy tiện thế được! Mỗi tháng lương vừa về tài khoản là mình nhất định trích sẵn tiền nhà với tiền ăn, kiên định gửi tiết kiệm một khoản, phần dôi dư mới dám tiêu vặt.",
      reason: "Thay đáp từ cụt '不会' bằng câu phản bác tự nhiên cực đỉnh 【那哪儿能啊！】 và quán dụng ngữ 【铁定 / 雷打不动】."
    },
    "08": {
      zh: "此外，我把收入分成生活费、储蓄和应急金三部分，专款专用。",
      vi: "Ngoài ra, mình chia thu nhập làm ba phần: sinh hoạt phí, tiết kiệm và tiền ứng cấp, khoản nào dùng riêng việc nấy.",
      reason: "Lồng ghép từ nối bổ sung thông tin Bài 9 【此外……】."
    },
    "10": {
      zh: "即使遇到生病或者电脑坏了等突发情况，有了应急金，心里也很有底。",
      vi: "Dù cho gặp tình huống bất ngờ như ốm đau hay hỏng máy tính, có tiền khẩn cấp rồi, trong lòng cũng rất vững dạ.",
      reason: "Áp dụng cấu trúc liên kết Bài 9 【即使……也……】."
    },
    "14": {
      zh: "我会坦诚说明，理性理财又不是跟自己过不去，真朋友都能互相理解。",
      vi: "Mình sẽ nói thật rõ ràng, quản lý tài chính lý trí đâu phải là tự làm khó mình, bạn bè thật sự đều sẽ thông cảm cho nhau.",
      reason: "Lồng ghép quán dụng ngữ trọng điểm Bài 9 【跟自己过不去】."
    },
    "16": {
      zh: "确实是这样！每个月一到月底，我就把那些乱花钱的账目揪出来复盘，及时修正下个月的预算。",
      vi: "Đúng thật sự là vậy luôn! Cứ hễ cuối tháng là mình lại lôi mấy khoản tiêu linh tinh ra mổ xẻ đánh giá, kịp thời điều chỉnh lại hạn mức ngân sách tháng sau.",
      reason: "Thay '对' bằng câu khẩu ngữ sống động 【确实是这样！】 và từ hành động 【揪出来复盘】."
    }
  }
};
