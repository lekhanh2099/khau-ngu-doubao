/**
 * Khẩu ngữ Trung cấp - Giao diện tra cứu & Quick Copy cho Doubao
 * Tối ưu hóa 100% cho điện thoại di động
 * Hỗ trợ Dual-Version: V1 (Bản gốc Word) & V2 (Bản tối ưu lồng ghép mẫu câu)
 * Hỗ trợ Audio A & B luyện nghe thụ động & Đồng bộ câu đọc (Karaoke Highlight)
 */
(() => {
  "use strict";

  function loadMasteredSet() {
    try {
      const raw = JSON.parse(localStorage.getItem("kn_mastered_topics") || "[]");
      return new Set(Array.isArray(raw) ? raw : []);
    } catch {
      return new Set();
    }
  }

  function saveMasteredSet(setObj) {
    try {
      localStorage.setItem("kn_mastered_topics", JSON.stringify([...setObj]));
    } catch {}
  }

  function getInitialBookId() {
    const saved = localStorage.getItem("kn_active_book");
    if (saved && window.APP_BOOKS && window.APP_BOOKS[saved]) return saved;
    if (window.APP_BOOKS) {
      const entries = Object.entries(window.APP_BOOKS);
      const examBook = entries.find(([, b]) =>
        (b.lessons || []).some((l) => (l.topics || []).some((t) => t.isExamScope))
      );
      if (examBook) return examBook[0];
      if (window.APP_BOOKS["giao-trinh"]) return "giao-trinh";
      if (entries.length) return entries[0][0];
    }
    return "trung-cap";
  }

  // Trạng thái ứng dụng (lưu localStorage)
  const state = {
    book: getInitialBookId(),
    selectedLesson: localStorage.getItem("kn_selected_lesson") || "all",
    examFilter: localStorage.getItem("kn_exam_filter") || "examOnly", // 'examOnly' | 'priorityOnly' | 'unmasteredOnly' | 'all'
    masteredIds: loadMasteredSet(),
    version: localStorage.getItem("kn_version") || "v2", // Mặc định V2 Tối ưu
    showPinyin: localStorage.getItem("kn_show_pinyin") !== "false", // Mặc định bật
    showVi: localStorage.getItem("kn_show_vi") !== "false", // Mặc định bật
    searchKeyword: "",
    expandedScripts: new Set(),
    compareFilter: "diffOnly", // 'diffOnly' | 'all'
    audioSpeed: parseFloat(localStorage.getItem("kn_audio_speed") || "1.0"),
    audioLoop: localStorage.getItem("kn_audio_loop") === "true"
  };

  function getActiveBook() {
    if (window.APP_BOOKS && window.APP_BOOKS[state.book]) {
      return window.APP_BOOKS[state.book];
    }
    return window.APP_DATA || {};
  }

  let D = getActiveBook();
  let allTopics = [];

  function refreshTopics() {
    allTopics = [];
    if (D && D.lessons) {
      D.lessons.forEach((lesson) => {
        lesson.topics.forEach((t) => {
          allTopics.push({
            ...t,
            lessonId: lesson.id,
            lessonNo: lesson.no,
            lessonTitle: lesson.title
          });
        });
      });
    }
  }
  refreshTopics();

  function hasExamScopeTopics() {
    return allTopics.some((t) => t.isExamScope === true);
  }

  function isSituationBook() {
    return allTopics.length > 0 && allTopics.every((t) => (t.id && t.id.startsWith("gt-")) || t.isSituation === true);
  }

  function matchesExamFilter(topic) {
    if (!hasExamScopeTopics()) return true;
    switch (state.examFilter) {
      case "examOnly":
        return topic.isExamScope === true;
      case "priorityOnly":
        return Boolean(topic.priority);
      case "unmasteredOnly":
        return topic.isExamScope === true && !state.masteredIds.has(topic.id);
      case "all":
      default:
        return true;
    }
  }

  // Tiện ích DOM
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const esc = (str) =>
    String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ================================================= Audio Player Engine =================================================
  let currentAudio = null;
  let currentPlayingTopicId = null;
  let currentHighlightedLineN = null;

  function formatTime(seconds) {
    const s = Math.floor(seconds || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? "0" : ""}${rem}`;
  }

  function stopAudio() {
    if (currentAudio) {
      try { currentAudio.pause(); } catch {}
      currentAudio = null;
    }
    if (currentPlayingTopicId) {
      const btn = $(`[data-action="toggle-audio"][data-topic-id="${currentPlayingTopicId}"]`);
      if (btn) {
        btn.classList.remove("playing");
        const icon = $(".audio-btn-icon", btn);
        const text = $(".audio-btn-text", btn);
        if (icon) icon.textContent = "▶";
        if (text) text.textContent = "Nghe A & B (Hội thoại)";
      }
      $$(".dialogue-line.speaking-active").forEach((el) => el.classList.remove("speaking-active"));
      currentPlayingTopicId = null;
      currentHighlightedLineN = null;
    }
  }

  function playTopicAudio(topicId, startTime = 0) {
    const topic = allTopics.find((t) => t.id === topicId);
    if (!topic || !topic.audio) {
      showToast("Không tìm thấy audio cho bài này!", "⚠️");
      return;
    }

    // Nếu đang phát chính topic này và người dùng nhấn Play/Pause chung
    if (currentPlayingTopicId === topicId && currentAudio && startTime === 0) {
      if (!currentAudio.paused) {
        currentAudio.pause();
        const btn = $(`[data-action="toggle-audio"][data-topic-id="${topicId}"]`);
        if (btn) {
          btn.classList.remove("playing");
          const icon = $(".audio-btn-icon", btn);
          const text = $(".audio-btn-text", btn);
          if (icon) icon.textContent = "▶";
          if (text) text.textContent = "Tiếp tục nghe";
        }
        return;
      } else {
        currentAudio.play().catch(() => {});
        const btn = $(`[data-action="toggle-audio"][data-topic-id="${topicId}"]`);
        if (btn) {
          btn.classList.add("playing");
          const icon = $(".audio-btn-icon", btn);
          const text = $(".audio-btn-text", btn);
          if (icon) icon.textContent = "⏸";
          if (text) text.textContent = "Đang phát A & B";
        }
        return;
      }
    }

    // Cùng bài đang mở sẵn audio -> chỉ tua tới câu cần nghe, không tải lại file
    if (currentPlayingTopicId === topicId && currentAudio && startTime > 0) {
      currentAudio.currentTime = startTime;
      currentAudio.play().catch(() => {});
      const btn = $(`[data-action="toggle-audio"][data-topic-id="${topicId}"]`);
      if (btn) {
        btn.classList.add("playing");
        const icon = $(".audio-btn-icon", btn);
        const text = $(".audio-btn-text", btn);
        if (icon) icon.textContent = "⏸";
        if (text) text.textContent = "Đang phát A & B";
      }
      return;
    }

    // Dừng audio cũ nếu đang phát topic khác
    stopAudio();

    const audio = new Audio(topic.audio);
    audio.preload = "auto";
    audio.preservesPitch = true; // giữ cao độ giọng khi đổi tốc độ 0.8x / 1.2x
    audio.webkitPreservesPitch = true;
    currentAudio = audio;
    currentPlayingTopicId = topicId;
    audio.playbackRate = state.audioSpeed || 1.0;

    const btn = $(`[data-action="toggle-audio"][data-topic-id="${topicId}"]`);
    if (btn) {
      btn.classList.add("playing");
      const icon = $(".audio-btn-icon", btn);
      const text = $(".audio-btn-text", btn);
      if (icon) icon.textContent = "⏸";
      if (text) text.textContent = "Đang phát A & B";
    }

    const curTimeEl = $(`#curTime-${topicId}`);
    const progFill = $(`#progFill-${topicId}`);

    audio.ontimeupdate = () => {
      const cur = audio.currentTime;
      const dur = audio.duration || topic.audioDuration || 1;
      if (curTimeEl) curTimeEl.textContent = formatTime(cur);
      if (progFill) progFill.style.width = `${Math.min(100, (cur / dur) * 100)}%`;

      // Đồng bộ câu đang đọc (Karaoke Highlight)
      if (topic.audioTimings) {
        const activeTiming = topic.audioTimings.find((t) => cur >= t.start && cur < t.end);
        const activeLineN = activeTiming ? activeTiming.n : null;

        if (activeLineN !== currentHighlightedLineN) {
          currentHighlightedLineN = activeLineN;
          $$(`.dialogue-line.speaking-active`).forEach((el) => el.classList.remove("speaking-active"));

          if (activeLineN) {
            const lineEl = $(`#line-${topicId}-${activeLineN}`);
            if (lineEl) {
              lineEl.classList.add("speaking-active");
              // Cuộn nhẹ nhàng để câu đang đọc luôn nằm trong tầm nhìn
              lineEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          }
        }
      }
    };

    audio.onended = () => {
      if (state.audioLoop) {
        // Tự động lặp lại cho việc luyện nghe thụ động
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        stopAudio();
      }
    };

    audio.onerror = () => {
      showToast("Không thể tải file âm thanh!", "⚠️");
      stopAudio();
    };

    if (startTime > 0) {
      audio.currentTime = startTime;
    }

    audio.play().catch((err) => {
      console.warn("Autoplay bị chặn hoặc có lỗi:", err);
    });
  }

  // ================================================= Toast & Clipboard =================================================
  let toastTimer = null;
  function showToast(message, icon = "✓") {
    const toast = $("#toast");
    if (!toast) return;

    toast.innerHTML = `<span style="color:#22c55e;font-size:16px;">${icon}</span> <span>${message}</span>`;
    toast.hidden = false;

    // Haptic feedback nhẹ trên điện thoại
    if (navigator.vibrate) {
      try { navigator.vibrate(35); } catch {}
    }

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2200);
  }

  async function copyText(text, successMsg = "Đã copy vào bộ nhớ tạm!") {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      showToast(successMsg);
    } catch (err) {
      console.error("Copy thất bại:", err);
      showToast("Không thể copy tự động, vui lòng chọn văn bản!", "⚠️");
    }
  }

  // Lấy danh sách câu theo phiên bản (v1 hoặc v2)
  function getTopicLines(topic, ver = state.version) {
    if (ver === "v1" && topic.v1_lines) return topic.v1_lines;
    if (ver === "v2" && topic.v2_lines) return topic.v2_lines;
    return topic.lines || [];
  }

  // Định dạng nội dung kịch bản để gửi Doubao
  function getDialogueScript(topic, ver = state.version) {
    if (state.book === "giao-trinh") {
      const header = `第${topic.lessonNo}课，情景${topic.no}\n开始对话`;
      const lines = getTopicLines(topic, ver).map((l) => `${l.role}: ${l.zh}`).join("\n");
      return `${header}\n${lines}\n结束对话`;
    }
    const vTag = ver === "v1" ? "V1-Bản gốc" : "V2-Tối ưu";
    const header = `【第${topic.lessonNo}课 · 题${topic.no} · ${vTag}】${topic.question}`;
    const lines = getTopicLines(topic, ver).map((l) => `[${l.n}] ${l.role} ｜${l.zh}`).join("\n");
    return `${header}\n${lines}`;
  }

  function getDoubaoFullPayload(topic, ver = state.version) {
    if (state.book === "giao-trinh") {
      return `${D.generalPrompt}\n\n${getDialogueScript(topic, ver)}`;
    }
    return `${D.generalPrompt}\n\n————————\n${getDialogueScript(topic, ver)}`;
  }

  // Tạo Prompt đàm thoại tự do / thi thử phản xạ (Free Talk Roleplay) cho Doubao
  function getFreeTalkPrompt(topic) {
    const isBook2 = (topic.id && topic.id.startsWith("gt-")) || isSituationBook();
    const bookTitle = D.name ? `《${D.name}》` : (isBook2 ? "《汉语口语教程》" : "《汉语口语速成 · 中级篇》");
    let lessonNo = topic.lessonNo;
    if (!lessonNo && D && D.lessons) {
      const foundLesson = D.lessons.find((l) => l.topics.some((t) => t.id === topic.id));
      if (foundLesson) lessonNo = foundLesson.no;
    }
    const topicLabel = isBook2
      ? (lessonNo ? `第${lessonNo}课 · 情景${topic.no}` : `情景${topic.no}`)
      : (topic.examNo
        ? `考题 #${topic.examNo}（第${lessonNo}课）`
        : (lessonNo ? `第${lessonNo}课 · 题${topic.no}` : `题${topic.no}`));

    const slideFollowups = Array.isArray(topic.slideQuestions) && topic.slideQuestions.length
      ? `\n\n【课堂 Slide 延伸追问参考（请在对话中自然穿插 1~2 个追问）】：\n${topic.slideQuestions.map((q) => `- ${q}`).join("\n")}`
      : "";

    const takeawaysHint = topic.takeaways && Array.isArray(topic.takeaways.points) && topic.takeaways.points.length
      ? `\n\n【核心语境提示】：\n${topic.takeaways.points.slice(0, 3).map((p) => `- ${p}`).join("\n")}`
      : "";

    return `你是我的中文口语考官与对话搭档。今天我们进行【${bookTitle} ${topicLabel}】的【自由口语模拟实战 / 角色扮演】。

【本次对话主题与情境】：
《${topic.question}》
${topic.titleVi ? `（情境说明：${topic.titleVi}）` : ""}${slideFollowups}${takeawaysHint}

【你的角色与练习规则】：
1. 【完全入戏】：请根据上述情境主动代入角色（如：朋友/同事/考官/服务员/路人），和我展开真实、生动的口语交流。不要念死记硬背的固定剧本，而是根据我的实际回复灵活应对。
2. 【控制句长】：每次只回复 1~2 句话（像真人日常聊天一样自然），然后停下来等待我开口。绝对不要一次性说一大段独白。
3. 【地道表达】：请使用地道、自然的现代中文口语（多用日常高频词与习惯搭配，避免书面化或机械翻译腔）。
4. 【互动推进】：积极接住我抛出的话题，自然追问、表达看法或提出新点子，让对话自然推进 6~8 个回合。
5. 【沉浸式纠错】：对话进行中【不要中断我进行语法或发音纠错】，保持对话的沉浸感与流畅度。等我说“结束对话”或者本轮交流完成后，你再简要总结：
   - 夸奖我表达好的 1~2 个亮点；
   - 给出 2~3 个可以让表达更地道、更像母语者的词汇/句式替换建议。

收到后，请直接以角色的身份说出你的第一句开场白，等待我的回复！`;
  }

  // Render Book Tabs động từ window.APP_BOOKS (dễ mở rộng giáo trình tương lai)
  function renderBookTabs() {
    const tabsWrap = $("#bookNav .book-tabs");
    if (!tabsWrap || !window.APP_BOOKS) return;
    const entries = Object.entries(window.APP_BOOKS);
    if (!entries.length) return;

    tabsWrap.innerHTML = entries
      .map(([bookId, bookData]) => {
        const topics = (bookData.lessons || []).flatMap((l) => l.topics || []);
        const examCount = topics.filter((t) => t.isExamScope).length;
        const icon = bookData.icon || (examCount > 0 ? "🎯" : "📖");
        const name = bookData.name || bookData.title || bookId;
        const badge = examCount > 0 ? `${examCount}` : `${topics.length}`;
        const isActive = state.book === bookId;
        return `
          <button type="button" class="book-tab ${isActive ? "active" : ""}" data-book="${esc(bookId)}" role="tab" aria-selected="${isActive ? "true" : "false"}">
            <span class="book-tab-text">${esc(name)}</span>
            <span class="book-tab-count">${esc(badge)}</span>
          </button>
        `;
      })
      .join("");
  }

  // Chuyển đổi môn / giáo trình
  function switchBook(bookId) {
    if (!window.APP_BOOKS || !window.APP_BOOKS[bookId]) return;
    if (state.book === bookId) return;
    stopAudio();
    state.book = bookId;
    localStorage.setItem("kn_active_book", bookId);
    state.selectedLesson = "all";
    localStorage.setItem("kn_selected_lesson", "all");
    state.searchKeyword = "";
    const searchEl = $("#searchInput");
    const clearBtn = $("#btnClearSearch");
    if (searchEl) searchEl.value = "";
    if (clearBtn) clearBtn.hidden = true;
    state.expandedScripts.clear();

    D = getActiveBook();
    refreshTopics();

    // Cập nhật tab active
    $$(".book-tab").forEach((tab) => {
      const isActive = tab.dataset.book === bookId;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    // Cập nhật Header text
    const appTitle = $("#appTitle");
    const appSubtitle = $("#appSubtitle");
    if (appTitle) appTitle.textContent = D.title || "Khẩu ngữ Tiếng Trung";
    if (appSubtitle) appSubtitle.textContent = D.subtitle || "";

    // Ẩn/hiện version toggle nếu sách không có V1/V2
    const versionToggle = $("#versionToggle");
    if (versionToggle) {
      const hasDiffs = allTopics.some((t) => t.diffs && t.diffs.length > 0);
      versionToggle.style.display = hasDiffs ? "inline-flex" : "none";
    }

    renderExamFocusBar();
    renderLessonChips();
    renderTopicList();
    showToast(`Đã chuyển sang ${D.name || D.title}`, "📖");
  }

  // ================================================= Render Giao Diện =================================================

  // 0. Thanh Ôn thi trọng tâm & Theo dõi tiến độ (chỉ hiện cho giáo trình có isExamScope)
  function ensureExamFocusBar() {
    let bar = $("#examFocusBar");
    if (!bar) {
      const listContainer = $("#topicListContainer");
      if (listContainer && listContainer.parentNode) {
        bar = document.createElement("section");
        bar.id = "examFocusBar";
        bar.className = "exam-focus-bar";
        listContainer.parentNode.insertBefore(bar, listContainer);
      }
    }
    return bar;
  }

  function renderExamFocusBar() {
    const bar = ensureExamFocusBar();
    if (!bar) return;

    if (!hasExamScopeTopics()) {
      bar.hidden = true;
      bar.innerHTML = "";
      return;
    }

    bar.hidden = false;
    const examTopics = allTopics.filter((t) => t.isExamScope === true);
    const totalExam = examTopics.length;
    const masteredCount = examTopics.filter((t) => state.masteredIds.has(t.id)).length;
    const priorityCount = allTopics.filter((t) => Boolean(t.priority)).length;
    const unmasteredCount = totalExam - masteredCount;
    const pct = totalExam > 0 ? Math.round((masteredCount / totalExam) * 100) : 0;

    const filters = [
      { id: "examOnly", label: `${totalExam} Câu thi` },
      { id: "priorityOnly", label: `Trọng tâm (${priorityCount})` },
      { id: "unmasteredOnly", label: `Chưa thuộc (${unmasteredCount})` },
      { id: "all", label: `Tất cả (${allTopics.length})` }
    ];

    bar.innerHTML = `
      <div class="exam-bar-top">
        <div class="exam-progress-info">
          <span class="exam-bar-title">Ôn thi Khẩu ngữ</span>
          <span class="exam-bar-stat">Đã thuộc <strong>${masteredCount}/${totalExam}</strong> (${pct}%)</span>
        </div>
        <button type="button" class="btn-random-exam" data-action="pick-random-exam" title="Bốc ngẫu nhiên 1 câu thi để luyện phản xạ">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
          <span>Bốc đề ngẫu nhiên</span>
        </button>
      </div>
      <div class="exam-progress-track" aria-hidden="true">
        <div class="exam-progress-fill" style="width: ${pct}%"></div>
      </div>
      <div class="exam-filter-pills" role="tablist" aria-label="Lọc câu hỏi ôn thi">
        ${filters
          .map(
            (f) => `
          <button type="button" class="exam-filter-pill ${state.examFilter === f.id ? "active" : ""}" data-action="set-exam-filter" data-filter="${f.id}">
            ${esc(f.label)}
          </button>
        `
          )
          .join("")}
      </div>
    `;
  }

  function pickRandomExamTopic() {
    const examTopics = allTopics.filter((t) => t.isExamScope === true);
    if (!examTopics.length) return;

    // Ưu tiên bốc trong nhóm đang lọc (hoặc các câu chưa thuộc nếu đang lọc tất cả)
    let pool = examTopics.filter((t) => !state.masteredIds.has(t.id));
    if (state.examFilter === "priorityOnly") {
      const prioPool = examTopics.filter((t) => Boolean(t.priority));
      if (prioPool.length) pool = prioPool;
    } else if (!pool.length) {
      pool = examTopics;
    }

    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (!picked) return;

    // Đảm bảo bộ lọc không ẩn mất câu vừa bốc
    if (state.examFilter === "priorityOnly" && !picked.priority) {
      state.examFilter = "examOnly";
      localStorage.setItem("kn_exam_filter", state.examFilter);
    }
    if (state.selectedLesson !== "all" && state.selectedLesson !== picked.lessonId) {
      state.selectedLesson = "all";
      localStorage.setItem("kn_selected_lesson", "all");
    }
    state.searchKeyword = "";
    const searchEl = $("#searchInput");
    const clearBtn = $("#btnClearSearch");
    if (searchEl) searchEl.value = "";
    if (clearBtn) clearBtn.hidden = true;

    renderExamFocusBar();
    renderLessonChips();
    renderTopicList();

    requestAnimationFrame(() => {
      const card = $(`#card-${picked.id}`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.remove("is-random-picked");
        void card.offsetWidth;
        card.classList.add("is-random-picked");
      }
      const numLabel = picked.examNo ? `Đề thi #${picked.examNo}` : `Câu ${picked.no}`;
      showToast(`🎲 Trúng ${numLabel}: ${picked.titleVi}`, "🎯");
    });
  }

  // 1. Render thanh Lesson Chips cuộn ngang
  function renderLessonChips() {
    const container = $("#lessonChips");
    if (!container) return;

    const lessonCounts = D.lessons.map((l) => ({
      lesson: l,
      count: l.topics.filter(matchesExamFilter).length
    }));
    const visibleLessons = hasExamScopeTopics() && state.examFilter !== "all"
      ? lessonCounts.filter((x) => x.count > 0)
      : lessonCounts;

    // Nếu bài đang chọn bị ẩn theo filter hiện tại, tự chuyển về 'all'
    if (
      state.selectedLesson !== "all" &&
      !visibleLessons.some((x) => x.lesson.id === state.selectedLesson)
    ) {
      state.selectedLesson = "all";
      localStorage.setItem("kn_selected_lesson", "all");
    }

    const totalVisible = visibleLessons.reduce((sum, x) => sum + x.count, 0);
    const chips = [
      { id: "all", label: `Tất cả (${totalVisible})` },
      ...visibleLessons.map(({ lesson, count }) => ({
        id: lesson.id,
        label: `Bài ${lesson.no} · ${lesson.title} (${count})`
      }))
    ];

    container.innerHTML = chips
      .map(
        (chip) => `
        <button type="button" class="chip-btn ${state.selectedLesson === chip.id ? "active" : ""}" data-lesson-id="${chip.id}">
          ${esc(chip.label)}
        </button>
      `
      )
      .join("");
  }

  // Cập nhật trạng thái nút Version trên Header
  function updateVersionButtons() {
    $$(".v-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.v === state.version);
    });
  }

  function setVersion(newVer) {
    if (newVer !== "v1" && newVer !== "v2") return;
    if (state.version === newVer) return;
    stopAudio(); // Dừng audio nếu đang phát khi đổi phiên bản
    state.version = newVer;
    localStorage.setItem("kn_version", newVer);
    updateVersionButtons();
    renderTopicList();
    showToast(`Đã chuyển sang ${newVer === "v1" ? "📌 Bản gốc (V1)" : "✨ Bản tối ưu (V2)"}`);
  }

  // 2. Render danh sách bài & đề thi
  function renderTopicList() {
    const container = $("#topicListContainer");
    if (!container) return;

    const query = state.searchKeyword.trim().toLowerCase();

    // Lọc theo Bài đã chọn
    let targetLessons = D.lessons;
    if (state.selectedLesson !== "all") {
      targetLessons = D.lessons.filter((l) => l.id === state.selectedLesson);
    }

    let totalMatched = 0;
    const htmlChunks = [];

    targetLessons.forEach((lesson) => {
      // Lọc các topic trong bài này theo chế độ ôn thi & từ khóa tìm kiếm
      const matchedTopics = lesson.topics.filter((t) => {
        if (!matchesExamFilter(t)) return false;
        if (!query) return true;
        const slideText = Array.isArray(t.slideQuestions) ? t.slideQuestions.join(" ") : "";
        const searchTarget = `${t.no} ${t.examNo || ""} ${t.titleVi} ${t.question} ${t.questionPinyin || ""} ${t.outline || ""} ${slideText}`.toLowerCase();
        return searchTarget.includes(query);
      });

      if (!matchedTopics.length) return;
      totalMatched += matchedTopics.length;

      const hasExam = hasExamScopeTopics();
      const isSituation = isSituationBook();

      const topicsHtml = matchedTopics
        .map((t) => {
          const isExpanded = state.expandedScripts.has(t.id);
          const currentLines = getTopicLines(t, state.version);
          const diffCount = t.diffs ? t.diffs.length : 0;
          const isV2 = state.version === "v2";
          const isCurrentPlaying = currentPlayingTopicId === t.id && currentAudio && !currentAudio.paused;
          const isMastered = state.masteredIds.has(t.id);
          const isOutOfScope = hasExam && t.isExamScope === false;

          const badgeText = isSituation
            ? `Bài ${lesson.no} · Tình huống ${t.no}`
            : (t.examNo ? `Đề #${t.examNo} · Bài ${lesson.no}` : `Bài ${lesson.no} · Câu ${t.no}`);

          const lessonTag = "";

          let priorityBadge = "";
          if (t.priority === "red") {
            priorityBadge = `<span class="priority-badge priority-red"><span class="prio-dot"></span>Khoanh đỏ</span>`;
          } else if (t.priority === "yellow") {
            priorityBadge = `<span class="priority-badge priority-yellow"><span class="prio-dot"></span>Khoanh vàng</span>`;
          } else if (t.priority === "green") {
            priorityBadge = `<span class="priority-badge priority-green"><span class="prio-dot"></span>Khoanh xanh</span>`;
          }

          const scopeBadge = isOutOfScope
            ? `<span class="scope-badge-ref">Ngoài đề thi</span>`
            : "";

          const versionBadge = diffCount > 0
            ? `<span class="meta-ver-note ${state.version}">${isV2 ? "V2" : "V1"} · ${currentLines.length} câu</span>`
            : `<span class="meta-ver-note">${currentLines.length} câu</span>`;

          const copyLabel = diffCount > 0
            ? `Kịch bản (${isV2 ? "V2" : "V1"})`
            : `Kịch bản (TH ${t.no})`;

          const masteredBtn = `
            <button type="button" class="btn-mastered ${isMastered ? "active" : ""}" data-action="toggle-mastered" data-topic-id="${t.id}" aria-pressed="${isMastered}" title="Đánh dấu đã thuộc câu này">
              ${isMastered ? "✓ Đã thuộc" : "○ Thuộc"}
            </button>
          `;

          const slideQuestionsHtml = Array.isArray(t.slideQuestions) && t.slideQuestions.length
            ? `
              <details class="slide-questions-box">
                <summary class="slide-questions-summary">
                  <span>Câu hỏi slide trên lớp (${t.slideQuestions.length} câu)</span>
                  <span class="chevron">▾</span>
                </summary>
                <ul class="slide-questions-list">
                  ${t.slideQuestions.map((sq) => `<li>${esc(sq)}</li>`).join("")}
                </ul>
              </details>
            `
            : "";

          return `
            <article class="topic-card ${isMastered ? "is-mastered" : ""} ${isOutOfScope ? "is-out-of-scope" : ""}" id="card-${t.id}">
              <div class="topic-meta-top">
                <div class="topic-meta-badges">
                  <span class="topic-badge">${badgeText}</span>
                  ${priorityBadge}
                  ${scopeBadge}
                  ${versionBadge}
                </div>
                ${masteredBtn}
              </div>

              <div class="topic-hero">
                <div class="topic-question">${esc(t.question)}</div>
                ${t.questionPinyinHtml ? `<div class="topic-pinyin">${t.questionPinyinHtml}</div>` : (t.questionPinyin ? `<div class="topic-pinyin">${esc(t.questionPinyin)}</div>` : "")}
                <div class="topic-title-vi">${esc(t.titleVi)}</div>
              </div>

              ${t.outline ? `<div class="topic-outline"><strong>Mạch ý:</strong> ${esc(t.outline)}</div>` : ""}

              ${slideQuestionsHtml}

              ${t.takeaways ? `
                <details class="takeaways-box">
                  <summary class="takeaways-summary">
                    <span>Ý chính &amp; Câu chốt</span>
                    <span class="chevron">▾</span>
                  </summary>
                  <div class="takeaways-content">
                    <ul class="takeaways-list">
                      ${t.takeaways.points.map((p) => `<li>${esc(p)}</li>`).join("")}
                    </ul>
                    ${t.takeaways.goldenQuotes ? `
                      <div class="golden-quote">
                        <span class="quote-tag">Câu chốt ăn điểm</span>
                        <p class="quote-zh">${esc(t.takeaways.goldenQuotes)}</p>
                      </div>
                    ` : ""}
                  </div>
                </details>
              ` : ""}

              <div class="topic-actions">
                <div class="topic-main-copy-group">
                  <button type="button" class="btn-primary-copy btn-freetalk-copy" data-action="copy-freetalk" data-topic-id="${t.id}" title="Copy Prompt đàm thoại tự do / thi thử phản xạ với Doubao">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                    <span>Nói tự do</span>
                  </button>
                  <button type="button" class="btn-secondary btn-script-copy" data-action="copy-doubao" data-topic-id="${t.id}" title="Copy kịch bản thoại mẫu cho Doubao">
                    <span>${copyLabel}</span>
                  </button>
                </div>

                <div class="topic-secondary-actions">
                  ${diffCount > 0 ? `
                    <button type="button" class="btn-ghost btn-compare" data-action="open-compare" data-topic-id="${t.id}" title="Xem bản đối chiếu V1 gốc vs V2 nâng cấp">
                      <span>Đối chiếu (${diffCount})</span>
                    </button>
                  ` : ""}

                  <button type="button" class="btn-ghost" data-action="copy-script-only" data-topic-id="${t.id}" title="Chỉ copy phần văn bản kịch bản">
                    <span>Chỉ Script</span>
                  </button>

                  <button type="button" class="btn-ghost btn-toggle-script" data-action="toggle-script" data-topic-id="${t.id}">
                    <span>${isExpanded ? "Thu gọn ▴" : "Xem Script ▾"}</span>
                  </button>
                </div>
              </div>

              <!-- Phần hiển thị kịch bản khi nhấn mở -->
              <div class="script-drawer" id="script-${t.id}" ${isExpanded ? "" : "hidden"}>

                <!-- Audio Player Luyện nghe thụ động A & B (Dành cho bản V2 mới nhất) -->
                ${isV2 && t.audio ? `
                  <div class="passive-audio-player" id="player-${t.id}">
                    <div class="player-main-row">
                      <button type="button" class="btn-audio-toggle ${isCurrentPlaying ? "playing" : ""}" data-action="toggle-audio" data-topic-id="${t.id}" title="Phát / Dừng đoạn hội thoại">
                        <span class="audio-btn-icon">${isCurrentPlaying ? "⏸" : "▶"}</span>
                        <span class="audio-btn-text">${isCurrentPlaying ? "Đang phát A &amp; B" : "Nghe A &amp; B (Hội thoại)"}</span>
                      </button>

                      <div class="audio-time-wrap">
                        <span class="audio-cur-time" id="curTime-${t.id}">0:00</span>
                        <span class="audio-sep">/</span>
                        <span class="audio-total-time">${formatTime(t.audioDuration || 90)}</span>
                      </div>
                    </div>

                    <!-- Thanh tiến trình cuộn audio -->
                    <div class="audio-progress-container" data-action="seek-audio" data-topic-id="${t.id}" title="Chạm để tua audio">
                      <div class="audio-progress-track">
                        <div class="audio-progress-fill" id="progFill-${t.id}" style="width: 0%"></div>
                      </div>
                    </div>

                    <div class="player-sub-row">
                      <div class="audio-speed-group">
                        <span class="speed-title">Tốc độ:</span>
                        <button type="button" class="speed-chip ${state.audioSpeed === 0.8 ? "active" : ""}" data-action="change-speed" data-speed="0.8" data-topic-id="${t.id}">0.8x</button>
                        <button type="button" class="speed-chip ${state.audioSpeed === 1.0 ? "active" : ""}" data-action="change-speed" data-speed="1.0" data-topic-id="${t.id}">1.0x</button>
                        <button type="button" class="speed-chip ${state.audioSpeed === 1.2 ? "active" : ""}" data-action="change-speed" data-speed="1.2" data-topic-id="${t.id}">1.2x</button>
                      </div>

                      <div class="player-sub-actions">
                        <label class="audio-loop-label" title="Tự động lặp lại khi hết bài để luyện nghe thụ động">
                          <input type="checkbox" class="audio-loop-cb" data-topic-id="${t.id}" ${state.audioLoop ? "checked" : ""} />
                          <span class="loop-txt">🔁 Lặp</span>
                        </label>

                        <a href="${t.audio}" download="${t.id}-audio.m4a" class="btn-download-audio" title="Tải file âm thanh về máy để nghe offline">
                          <span>⬇️ Tải</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ` : (state.version === "v1" && t.audio ? `
                  <div class="audio-v1-notice">
                    <span>💡 <em>Audio A &amp; B được thu âm cho bản V2 (Tối ưu).</em></span>
                    <button type="button" class="btn-link-switch-v2" data-action="switch-to-v2">Chuyển sang V2 để nghe</button>
                  </div>
                ` : "")}

                <div class="script-intro">
                  <div class="script-version-info">
                    <span>Kịch bản ${currentLines.length} câu · <strong>${isV2 ? "✨ V2 Tối ưu" : "📌 V1 Gốc"}</strong></span>
                    ${diffCount > 0 ? `
                      <button type="button" class="btn-compare-mini" data-action="open-compare" data-topic-id="${t.id}">
                        🔍 Chế độ đối chiếu (${diffCount} câu đổi)
                      </button>
                    ` : ""}
                  </div>
                  <span class="sandhi-legend">💡 <span class="t3">Màu cam</span> = biến điệu thanh 3</span>
                </div>

                <!-- Danh sách câu thoại sạch sẽ, tối ưu để học và nghe -->
                <div class="dialogue-list">
                  ${currentLines
                    .map(
                      (line) => `
                    <div class="dialogue-line" id="line-${t.id}-${line.n}" data-topic-id="${t.id}" data-line-n="${line.n}" data-action="line-click" data-line-text="${esc(line.zh)}" title="Bấm để nghe hoặc copy">
                      <span class="role-badge role-${line.role}">${line.role === "A" ? "🤖 A" : "🗣️ B"}</span>
                      <div class="line-content">
                        <div class="line-zh">${esc(line.zh)}</div>
                        ${line.pinyinHtml ? `<div class="line-pinyin">${line.pinyinHtml}</div>` : (line.pinyin ? `<div class="line-pinyin">${esc(line.pinyin)}</div>` : "")}
                        ${line.vi ? `<div class="line-vi">${esc(line.vi)}</div>` : ""}
                      </div>
                      ${isV2 && t.audio ? `
                        <button type="button" class="btn-line-speak" data-action="play-single-line" data-topic-id="${t.id}" data-line-n="${line.n}" title="Nghe câu [${line.n}]">
                          <span>🔊</span>
                        </button>
                      ` : ""}
                    </div>
                  `
                    )
                    .join("")}
                </div>

                <div class="script-bottom-bar">
                  <button type="button" class="btn-primary-copy btn-freetalk-copy" data-action="copy-freetalk" data-topic-id="${t.id}" style="width:100%; margin-bottom: 8px;">
                    <span>🎙️ Copy Prompt Nói tự do (Thi thử với Doubao)</span>
                  </button>
                  <button type="button" class="btn-secondary" data-action="copy-doubao" data-topic-id="${t.id}" style="width:100%">
                    <span>⚡ Copy kịch bản mẫu cho Doubao (${isV2 ? "V2 Tối ưu" : "V1 Gốc"})</span>
                  </button>
                </div>
              </div>
            </article>
          `;
        })
        .join("");

      htmlChunks.push(`
        <section class="lesson-section" id="lesson-${lesson.id}">
          <div class="lesson-header">
            <h2 class="lesson-title">Bài ${lesson.no} <span class="zh">${esc(lesson.title)}</span></h2>
            <div class="lesson-actions">
              <button type="button" class="btn-sub" data-action="open-vocab" data-lesson-id="${lesson.id}">
                Từ vựng (${lesson.vocab.length})
              </button>
              <button type="button" class="btn-sub" data-action="open-patterns" data-lesson-id="${lesson.id}">
                Đặt câu &amp; Ngữ pháp (${lesson.patterns.length})
              </button>
            </div>
          </div>
          ${topicsHtml}
        </section>
      `);
    });

    if (totalMatched === 0) {
      if (hasExamScopeTopics() && state.examFilter === "unmasteredOnly" && !query) {
        container.innerHTML = `
          <div style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
            <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
            <p style="font-weight: 700; color: var(--text); margin-bottom: 6px;">Xuất sắc! Bạn đã đánh dấu thuộc hết toàn bộ câu thi.</p>
            <p style="font-size: 13.5px; margin-bottom: 14px;">Bạn có thể bấm xem lại toàn bộ 16 câu hoặc bốc đề ngẫu nhiên để luyện phản xạ.</p>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
            <div style="font-size: 36px; margin-bottom: 8px;">🔍</div>
            <p>Không tìm thấy đề thi nào phù hợp${query ? ` với từ khóa "<strong>${esc(query)}</strong>"` : ""}.</p>
          </div>
        `;
      }
    } else {
      container.innerHTML = htmlChunks.join("");
    }
  }

  // ================================================= Modal: Từ vựng & Mẫu câu =================================================

  const modalBackdrop = $("#modalBackdrop");
  const modalTitle = $("#modalTitle");
  const modalBody = $("#modalBody");

  function openModal(title, contentHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = contentHtml;
    modalBackdrop.hidden = false;
    document.body.style.overflow = "hidden"; // Khóa cuộn trang nền
  }

  function closeModal() {
    modalBackdrop.hidden = true;
    document.body.style.overflow = "";
  }

  // Mở modal Từ vựng
  function showVocabModal(lessonId) {
    const lesson = D.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    const rows = lesson.vocab
      .map(
        (v, i) => `
        <div class="vocab-row">
          <div class="vocab-top">
            <span class="vocab-idx">${i + 1}</span>
            <span class="vocab-zh">${esc(v.hanzi)}</span>
            <span class="vocab-py">${esc(v.pinyin)}</span>
          </div>
          <div class="vocab-vi">${esc(v.vi)}</div>
        </div>
      `
      )
      .join("");

    const notes = lesson.notes && lesson.notes.length
      ? `<div style="margin-top:14px;padding:12px;background:var(--surface-raised);border-radius:10px;font-size:13px;color:var(--text-muted);">${lesson.notes.map(esc).join("<br>")}</div>`
      : "";

    openModal(
      `Bài ${lesson.no} · 生词 Từ vựng (${lesson.vocab.length} từ)`,
      `<div class="vocab-list">${rows}</div>${notes}`
    );
  }

  // Mở modal Mẫu câu & Ngữ pháp
  function showPatternsModal(lessonId) {
    const lesson = D.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    const cards = lesson.patterns
      .map((p) => {
        const title = p.pattern || p.title || "";
        const explain = p.note || p.explain || "";
        let exHtml = "";
        if (Array.isArray(p.examples) && p.examples.length) {
          exHtml = p.examples
            .map(
              (ex) => `
            <div class="pattern-ex">
              <span class="ex-zh">${esc(ex.zh)}</span>
              ${ex.vi ? `<span class="ex-vi">→ ${esc(ex.vi)}</span>` : ""}
            </div>
          `
            )
            .join("");
        } else if (p.example) {
          exHtml = `
            <div class="pattern-ex">
              <span class="ex-zh">${esc(p.example)}</span>
              ${p.examplePinyin ? `<span class="ex-py">${esc(p.examplePinyin)}</span>` : ""}
              <span class="ex-vi">→ ${esc(p.exampleVi)}</span>
            </div>
          `;
        }

        let extraExHtml = "";
        if (Array.isArray(p.extraExamples) && p.extraExamples.length) {
          extraExHtml = `
            <div class="pattern-extra-block">
              <div class="pattern-extra-label">📝 Ví dụ đặt câu (Chú thích thi):</div>
              ${p.extraExamples
                .map(
                  (ex) => `
                <div class="pattern-ex pattern-ex-extra">
                  <span class="ex-zh">${esc(ex.zh)}</span>
                  ${ex.pinyinHtml ? `<span class="ex-py">${ex.pinyinHtml}</span>` : (ex.pinyin ? `<span class="ex-py">${esc(ex.pinyin)}</span>` : "")}
                  ${ex.vi ? `<span class="ex-vi">→ ${esc(ex.vi)}</span>` : ""}
                </div>
              `
                )
                .join("")}
            </div>
          `;
        }

        return `
          <div class="pattern-card">
            <h4>${esc(title)}</h4>
            ${explain ? `<p class="pattern-explain">${esc(explain)}</p>` : ""}
            ${exHtml}
            ${extraExHtml}
          </div>
        `;
      })
      .join("");

    let expSection = "";
    if (lesson.expressions && lesson.expressions.length) {
      expSection = `
        <div style="margin-top: 16px; padding: 12px; background: var(--surface-raised); border-radius: 12px; border: 1px solid var(--border);">
          <h4 style="margin-bottom: 8px; font-size: 14px; font-weight: 700;">💡 Cụm diễn đạt 表达法:</h4>
          <ul style="padding-left: 18px; font-size: 13.5px; line-height: 1.6;">
            ${lesson.expressions.map((e) => `<li>${esc(e)}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    openModal(`Bài ${lesson.no} · 词语例释 Mẫu câu & Ngữ pháp (${lesson.patterns.length} mục)`, cards + expSection);
  }

  // ================================================= Modal: Chế độ Đối chiếu V1 ↔ V2 =================================================

  const compareModalBackdrop = $("#compareModalBackdrop");
  const compareModalTitle = $("#compareModalTitle");
  const compareModalBody = $("#compareModalBody");

  function closeCompareModal() {
    if (compareModalBackdrop) {
      compareModalBackdrop.hidden = true;
      document.body.style.overflow = "";
    }
  }

  function showCompareModal(topicId, filterMode = state.compareFilter) {
    const topic = allTopics.find((t) => t.id === topicId);
    if (!topic) return;

    state.compareFilter = filterMode;
    const diffs = topic.diffs || [];
    const v1Lines = topic.v1_lines || [];
    const v2Lines = topic.v2_lines || [];

    const isAllMode = filterMode === "all";
    const isBook2 = topic.id && topic.id.startsWith("gt-");
    const badgeLabel = isBook2
      ? `Bài ${topic.lessonNo} · Tình huống ${topic.no}`
      : `Bài ${topic.lessonNo} · Câu ${topic.no}`;
    const totalLinesCount = (v2Lines && v2Lines.length) || (v1Lines && v1Lines.length) || 20;
    const statDesc = isBook2
      ? "Đã tối ưu khẩu ngữ đàm thoại &amp; tính thực tế đời sống"
      : `Đã lồng ghép chuẩn mẫu câu của <em>Bài ${topic.lessonNo}</em>`;

    let bodyHtml = `
      <div class="compare-intro">
        <div class="compare-topic-name">
          <span class="badge-lesson">${badgeLabel}</span>
          <div class="compare-title-zh">${esc(topic.question || topic.title || "")}</div>
        </div>
        <div class="compare-stats-bar">
          <span class="stat-pill">📊 Nâng cấp: <strong>${diffs.length} / ${totalLinesCount} câu</strong></span>
          <span class="stat-desc">${statDesc}</span>
        </div>

        <div class="compare-filter-tabs">
          <button type="button" class="tab-btn ${!isAllMode ? "active" : ""}" data-action="set-compare-filter" data-topic-id="${topic.id}" data-filter="diffOnly">
            ✨ Chỉ câu thay đổi (${diffs.length})
          </button>
          <button type="button" class="tab-btn ${isAllMode ? "active" : ""}" data-action="set-compare-filter" data-topic-id="${topic.id}" data-filter="all">
            📄 Toàn bộ ${totalLinesCount} câu
          </button>
        </div>
      </div>
    `;

    if (!isAllMode && diffs.length === 0) {
      bodyHtml += `<div class="compare-empty">Đề này giữ nguyên 100% bản gốc (không có câu nào bị thay đổi).</div>`;
    } else {
      bodyHtml += `<div class="compare-diff-list">`;

      if (!isAllMode) {
        // Chỉ hiện các câu có thay đổi
        diffs.forEach((d) => {
          bodyHtml += `
            <div class="diff-card">
              <div class="diff-card-header">
                <span class="diff-line-num">Câu [${d.n}]</span>
                <span class="role-badge role-${d.role}">${d.role === "A" ? "🤖 A" : "🗣️ B"}</span>
              </div>

              <div class="diff-grid">
                <div class="diff-col col-v1">
                  <div class="diff-col-tag">📌 V1: Bản gốc Word</div>
                  <div class="diff-zh">${esc(d.v1.zh)}</div>
                  <div class="diff-py">${d.v1.pinyinHtml || esc(d.v1.pinyin)}</div>
                  <div class="diff-vi">${esc(d.v1.vi)}</div>
                </div>

                <div class="diff-col col-v2">
                  <div class="diff-col-tag">✨ V2: Bản tối ưu</div>
                  <div class="diff-zh">${esc(d.v2.zh)}</div>
                  <div class="diff-py">${d.v2.pinyinHtml || esc(d.v2.pinyin)}</div>
                  <div class="diff-vi">${esc(d.v2.vi)}</div>
                </div>
              </div>

              <div class="diff-reason-box">
                <span class="reason-icon">💡</span>
                <div class="reason-text"><strong>Đánh giá &amp; Lý do sửa:</strong> ${esc(d.reason)}</div>
              </div>
            </div>
          `;
        });
      } else {
        // Hiện toàn bộ 18 câu
        v1Lines.forEach((v1, idx) => {
          const v2 = v2Lines[idx] || v1;
          const isModified = v2.modified;

          bodyHtml += `
            <div class="diff-card ${isModified ? "diff-card-modified" : "diff-card-unchanged"}">
              <div class="diff-card-header">
                <span class="diff-line-num">Câu [${v1.n}]</span>
                <span class="role-badge role-${v1.role}">${v1.role === "A" ? "🤖 A" : "🗣️ B"}</span>
                ${isModified ? `<span class="badge-modified-tag">✨ Đã tối ưu</span>` : `<span class="badge-unchanged-tag">✓ Trùng khớp</span>`}
              </div>

              <div class="diff-grid">
                <div class="diff-col col-v1">
                  <div class="diff-col-tag">📌 V1: Gốc</div>
                  <div class="diff-zh">${esc(v1.zh)}</div>
                  <div class="diff-py">${v1.pinyinHtml || esc(v1.pinyin)}</div>
                  <div class="diff-vi">${esc(v1.vi)}</div>
                </div>

                <div class="diff-col col-v2">
                  <div class="diff-col-tag">✨ V2: Tối ưu</div>
                  <div class="diff-zh">${esc(v2.zh)}</div>
                  <div class="diff-py">${v2.pinyinHtml || esc(v2.pinyin)}</div>
                  <div class="diff-vi">${esc(v2.vi)}</div>
                </div>
              </div>

              ${isModified && v2.reason ? `
                <div class="diff-reason-box">
                  <span class="reason-icon">💡</span>
                  <div class="reason-text"><strong>Đánh giá:</strong> ${esc(v2.reason)}</div>
                </div>
              ` : ""}
            </div>
          `;
        });
      }

      bodyHtml += `</div>`;
    }

    bodyHtml += `
      <div class="compare-actions-bar">
        <button type="button" class="btn-secondary" data-action="copy-diff-v1" data-topic-id="${topic.id}">
          📋 Copy Script V1 (Gốc)
        </button>
        <button type="button" class="btn-primary-copy" data-action="copy-diff-v2" data-topic-id="${topic.id}">
          ✨ Copy Script V2 (Tối ưu)
        </button>
      </div>
    `;

    if (compareModalBackdrop && compareModalTitle && compareModalBody) {
      compareModalTitle.textContent = `Chế độ đối chiếu · Đề ${topic.no}`;
      compareModalBody.innerHTML = bodyHtml;
      compareModalBackdrop.hidden = false;
      document.body.style.overflow = "hidden";
    }
  }

  // ================================================= Đăng Ký Sự Kiện =================================================

  // Nút chuyển Version trên header
  $("#versionToggle")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-v]");
    if (!btn) return;
    setVersion(btn.dataset.v);
  });

  // Bật / tắt hiển thị Pinyin
  const pinyinToggle = $("#pinyinToggle");
  if (pinyinToggle) {
    pinyinToggle.checked = state.showPinyin;
    document.body.classList.toggle("hide-pinyin", !state.showPinyin);

    pinyinToggle.addEventListener("change", (e) => {
      state.showPinyin = e.target.checked;
      localStorage.setItem("kn_show_pinyin", state.showPinyin);
      document.body.classList.toggle("hide-pinyin", !state.showPinyin);
    });
  }

  // Bật / tắt hiển thị bản dịch tiếng Việt
  const viToggle = $("#viToggle");
  if (viToggle) {
    viToggle.checked = state.showVi;
    document.body.classList.toggle("hide-vi", !state.showVi);

    viToggle.addEventListener("change", (e) => {
      state.showVi = e.target.checked;
      localStorage.setItem("kn_show_vi", state.showVi);
      document.body.classList.toggle("hide-vi", !state.showVi);
    });
  }

  // Copy Prompt chung
  $("#btnCopyGeneralPrompt")?.addEventListener("click", () => {
    copyText(D.generalPrompt, "Đã copy Prompt chung cho Doubao!");
  });

  // Tìm kiếm tức thì
  const searchInput = $("#searchInput");
  const btnClearSearch = $("#btnClearSearch");

  searchInput?.addEventListener("input", (e) => {
    state.searchKeyword = e.target.value;
    btnClearSearch.hidden = !state.searchKeyword;
    renderTopicList();
  });

  btnClearSearch?.addEventListener("click", () => {
    searchInput.value = "";
    state.searchKeyword = "";
    btnClearSearch.hidden = true;
    searchInput.focus();
    renderTopicList();
  });

  // Chọn bài học qua Lesson Chips
  $("#lessonChips")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-lesson-id]");
    if (!btn) return;

    state.selectedLesson = btn.dataset.lessonId;
    localStorage.setItem("kn_selected_lesson", state.selectedLesson);
    renderLessonChips();
    renderTopicList();

    // Scroll lên đầu danh sách nhẹ nhàng
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Event Delegation trên danh sách topic
  $("#topicListContainer")?.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const topicId = target.dataset.topicId;
    const lessonId = target.dataset.lessonId;

    if (action === "copy-freetalk") {
      const topic = allTopics.find((t) => t.id === topicId);
      if (topic) {
        copyText(getFreeTalkPrompt(topic), `Đã copy Prompt Nói tự do (Thi thử) cho Đề ${topic.no}!`);
      }
      return;
    }

    if (action === "copy-doubao") {
      const topic = allTopics.find((t) => t.id === topicId);
      if (topic) {
        const vLabel = state.version === "v1" ? "V1 Gốc" : "V2 Tối ưu";
        copyText(getDoubaoFullPayload(topic), `Đã copy Đề ${topic.no} (${vLabel})!`);
      }
      return;
    }

    if (action === "copy-script-only") {
      const topic = allTopics.find((t) => t.id === topicId);
      if (topic) {
        const vLabel = state.version === "v1" ? "V1 Gốc" : "V2 Tối ưu";
        copyText(getDialogueScript(topic), `Đã copy Hội thoại Đề ${topic.no} (${vLabel})!`);
      }
      return;
    }

    if (action === "open-compare") {
      showCompareModal(topicId);
      return;
    }

    if (action === "toggle-mastered") {
      if (state.masteredIds.has(topicId)) {
        state.masteredIds.delete(topicId);
      } else {
        state.masteredIds.add(topicId);
      }
      saveMasteredSet(state.masteredIds);
      const isNowMastered = state.masteredIds.has(topicId);
      target.classList.toggle("active", isNowMastered);
      target.setAttribute("aria-pressed", isNowMastered ? "true" : "false");
      target.textContent = isNowMastered ? "✓ Đã thuộc" : "○ Thuộc";
      const card = $(`#card-${topicId}`);
      if (card) card.classList.toggle("is-mastered", isNowMastered);
      renderExamFocusBar();
      if (state.examFilter === "unmasteredOnly" && isNowMastered) {
        renderLessonChips();
        renderTopicList();
      }
      showToast(isNowMastered ? "Đã đánh dấu thuộc câu này!" : "Đã bỏ đánh dấu thuộc", isNowMastered ? "✓" : "○");
      return;
    }

    if (action === "switch-to-v2") {
      setVersion("v2");
      return;
    }

    if (action === "toggle-script") {
      const scriptDrawer = $(`#script-${topicId}`);
      if (scriptDrawer) {
        const isNowHidden = !scriptDrawer.hidden;
        scriptDrawer.hidden = isNowHidden;
        if (isNowHidden) {
          state.expandedScripts.delete(topicId);
          target.innerHTML = `<span>Xem Script ▾</span>`;
        } else {
          state.expandedScripts.add(topicId);
          target.innerHTML = `<span>Thu gọn ▴</span>`;
        }
      }
      return;
    }

    // Phát / Dừng Audio toàn bài
    if (action === "toggle-audio") {
      playTopicAudio(topicId, 0);
      return;
    }

    // Tua tiến trình audio khi bấm vào thanh track
    if (action === "seek-audio") {
      if (currentAudio && currentPlayingTopicId === topicId) {
        const rect = target.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, clickX / rect.width));
        currentAudio.currentTime = percent * (currentAudio.duration || 1);
      }
      return;
    }

    // Thay đổi tốc độ audio
    if (action === "change-speed") {
      const speed = parseFloat(target.dataset.speed || "1.0");
      state.audioSpeed = speed;
      localStorage.setItem("kn_audio_speed", speed);
      if (currentAudio) {
        currentAudio.playbackRate = speed;
      }
      // Update UI active chip
      const parent = target.closest(".audio-speed-group");
      if (parent) {
        $$(".speed-chip", parent).forEach((c) => c.classList.toggle("active", parseFloat(c.dataset.speed) === speed));
      }
      return;
    }

    // Bấm vào nút loa 🔊 ở từng câu
    if (action === "play-single-line") {
      e.stopPropagation();
      const lineN = target.dataset.lineN;
      const topic = allTopics.find((t) => t.id === topicId);
      if (topic && topic.audioTimings) {
        const timing = topic.audioTimings.find((t) => t.n === lineN);
        const startTime = timing ? timing.start : 0;
        playTopicAudio(topicId, startTime);
      }
      return;
    }

    // Bấm vào dòng thoại để copy hoặc nhảy audio
    if (action === "line-click") {
      const lineText = target.dataset.lineText;
      const lineN = target.dataset.lineN;
      const topic = allTopics.find((t) => t.id === topicId);

      // Nếu đang mở audio V2, nhảy audio tới câu đó
      if (state.version === "v2" && topic && topic.audioTimings) {
        const timing = topic.audioTimings.find((t) => t.n === lineN);
        if (timing) {
          playTopicAudio(topicId, timing.start);
          return;
        }
      }

      // Mặc định copy câu thoại
      if (lineText) {
        copyText(lineText, "Đã copy câu thoại!");
      }
      return;
    }

    if (action === "open-vocab") {
      showVocabModal(lessonId);
      return;
    }

    if (action === "open-patterns") {
      showPatternsModal(lessonId);
      return;
    }
  });

  // Bắt sự kiện checkbox lặp lại audio
  $("#topicListContainer")?.addEventListener("change", (e) => {
    if (e.target.classList.contains("audio-loop-cb")) {
      state.audioLoop = e.target.checked;
      localStorage.setItem("kn_audio_loop", state.audioLoop);
      $$(".audio-loop-cb").forEach((cb) => (cb.checked = state.audioLoop));
      showToast(state.audioLoop ? "Đã bật lặp lại tự động!" : "Đã tắt lặp lại");
    }
  });

  // Event Delegation trong Compare Modal
  $("#compareModalBackdrop")?.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const topicId = target.dataset.topicId;

    if (action === "set-compare-filter") {
      const filter = target.dataset.filter;
      showCompareModal(topicId, filter);
      return;
    }

    if (action === "copy-diff-v1") {
      const topic = allTopics.find((t) => t.id === topicId);
      if (topic) {
        copyText(getDialogueScript(topic, "v1"), `Đã copy Script V1 (Gốc) Đề ${topic.no}!`);
      }
      return;
    }

    if (action === "copy-diff-v2") {
      const topic = allTopics.find((t) => t.id === topicId);
      if (topic) {
        copyText(getDialogueScript(topic, "v2"), `Đã copy Script V2 (Tối ưu) Đề ${topic.no}!`);
      }
      return;
    }
  });

  // Đóng Modal Từ vựng / Mẫu câu
  $("#btnModalClose")?.addEventListener("click", closeModal);
  modalBackdrop?.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  // Đóng Compare Modal
  $("#btnCompareModalClose")?.addEventListener("click", closeCompareModal);
  compareModalBackdrop?.addEventListener("click", (e) => {
    if (e.target === compareModalBackdrop) closeCompareModal();
  });

  // Phím tắt bàn phím tiện ích cho desktop (Escape, /, Cmd+K)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!modalBackdrop?.hidden) {
        closeModal();
        return;
      }
      if (!compareModalBackdrop?.hidden) {
        closeCompareModal();
        return;
      }
      if (document.activeElement === searchInput) {
        searchInput.blur();
        return;
      }
    }

    // Nhấn '/' hoặc Cmd+K / Ctrl+K để focus ô tìm kiếm
    const isEditing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
    if (!isEditing) {
      if (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchInput?.focus();
        searchInput?.select();
      }
    }
  });

  // Hỗ trợ cuộn chuột ngang mượt mà cho thanh Lesson Chips trên desktop
  const chipsContainer = $("#lessonChips");
  if (chipsContainer) {
    chipsContainer.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        chipsContainer.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  // Nút Cuộn lên đầu trang (Back to top)
  const btnBackToTop = $("#btnBackToTop");
  if (btnBackToTop) {
    window.addEventListener("scroll", () => {
      const show = window.scrollY > 350;
      if (btnBackToTop.hidden === show) {
        btnBackToTop.hidden = !show;
      }
    }, { passive: true });

    btnBackToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Thanh lọc ôn thi & bốc đề ngẫu nhiên
  $(".main-content")?.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    if (action === "set-exam-filter") {
      const nextFilter = target.dataset.filter || "examOnly";
      if (state.examFilter === nextFilter) return;
      state.examFilter = nextFilter;
      localStorage.setItem("kn_exam_filter", nextFilter);
      renderExamFocusBar();
      renderLessonChips();
      renderTopicList();
      return;
    }

    if (action === "pick-random-exam") {
      pickRandomExamTopic();
      return;
    }
  });

  // Chuyển giáo trình / môn học
  $("#bookNav")?.addEventListener("click", (e) => {
    const tab = e.target.closest(".book-tab");
    if (!tab) return;
    const bookId = tab.dataset.book;
    if (bookId) switchBook(bookId);
  });

  // Khởi động
  renderBookTabs();
  if (state.book) {
    $$(".book-tab").forEach((tab) => {
      const isActive = tab.dataset.book === state.book;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    const appTitle = $("#appTitle");
    const appSubtitle = $("#appSubtitle");
    if (appTitle) appTitle.textContent = D.title || "Khẩu ngữ Tiếng Trung";
    if (appSubtitle) appSubtitle.textContent = D.subtitle || "";
    const versionToggle = $("#versionToggle");
    if (versionToggle) {
      const hasDiffs = allTopics.some((t) => t.diffs && t.diffs.length > 0);
      versionToggle.style.display = hasDiffs ? "inline-flex" : "none";
    }
  }

  updateVersionButtons();
  renderExamFocusBar();
  renderLessonChips();
  renderTopicList();

  // Đăng ký Service Worker cho PWA & tự động cập nhật khi có phiên bản mới
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js", { updateViaCache: "none" })
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {});
    });
  }
})();
