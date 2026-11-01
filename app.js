/**
 * Khẩu ngữ Trung cấp - Giao diện tra cứu & Quick Copy cho Doubao
 * Tối ưu hóa 100% cho điện thoại di động
 */
(() => {
  "use strict";

  const D = window.APP_DATA;
  if (!D) {
    console.error("APP_DATA chưa được nạp!");
    return;
  }

  // Tiện ích DOM
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const esc = (str) =>
    String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Trạng thái ứng dụng (lưu localStorage)
  const state = {
    selectedLesson: localStorage.getItem("kn_selected_lesson") || "all",
    showPinyin: localStorage.getItem("kn_show_pinyin") !== "false", // Mặc định bật
    showVi: localStorage.getItem("kn_show_vi") !== "false", // Mặc định bật
    searchKeyword: "",
    expandedScripts: new Set()
  };

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

  // Định dạng nội dung kịch bản để gửi Doubao
  function getDialogueScript(topic) {
    const header = `【第${topic.lessonNo}课 · 题${topic.no}】${topic.question}`;
    const lines = topic.lines.map((l) => `[${l.n}] ${l.role} ｜${l.zh}`).join("\n");
    return `${header}\n${lines}`;
  }

  function getDoubaoFullPayload(topic) {
    return `${D.generalPrompt}\n\n————————\n${getDialogueScript(topic)}`;
  }

  // Chuẩn bị danh sách phẳng các topic
  const allTopics = [];
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

  // ================================================= Render Giao Diện =================================================

  // 1. Render thanh Lesson Chips cuộn ngang
  function renderLessonChips() {
    const container = $("#lessonChips");
    if (!container) return;

    const chips = [
      { id: "all", label: `Tất cả (${allTopics.length})` },
      ...D.lessons.map((l) => ({
        id: l.id,
        label: `Bài ${l.no} · ${l.title} (${l.topics.length})`
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
      // Lọc các topic trong bài này theo từ khóa tìm kiếm
      const matchedTopics = lesson.topics.filter((t) => {
        if (!query) return true;
        const searchTarget = `${t.no} ${t.titleVi} ${t.question} ${t.questionPinyin || ""} ${t.outline || ""}`.toLowerCase();
        return searchTarget.includes(query);
      });

      if (!matchedTopics.length) return;
      totalMatched += matchedTopics.length;

      const topicsHtml = matchedTopics
        .map((t) => {
          const isExpanded = state.expandedScripts.has(t.id);
          const fullTopic = { ...t, lessonNo: lesson.no, lessonTitle: lesson.title };

          return `
            <article class="topic-card" id="card-${t.id}">
              <div class="topic-meta">
                <span class="topic-badge">Bài ${lesson.no} · Câu ${t.no}</span>
                <span class="topic-title-vi">${esc(t.titleVi)}</span>
              </div>

              <div class="topic-question">${esc(t.question)}</div>
              ${t.questionPinyinHtml ? `<div class="topic-pinyin">${t.questionPinyinHtml}</div>` : (t.questionPinyin ? `<div class="topic-pinyin">${esc(t.questionPinyin)}</div>` : "")}

              ${t.outline ? `<div class="topic-outline"><strong>Mạch ý:</strong> ${esc(t.outline)}</div>` : ""}

              <div class="topic-actions">
                <button type="button" class="btn-primary-copy" data-action="copy-doubao" data-topic-id="${t.id}">
                  <span>⚡</span>
                  <span>Copy cho Doubao (Prompt + Script)</span>
                </button>

                <div class="topic-secondary-actions">
                  <button type="button" class="btn-secondary" data-action="copy-script-only" data-topic-id="${t.id}">
                    <span>📋</span>
                    <span>Chỉ Script</span>
                  </button>

                  <button type="button" class="btn-secondary" data-action="toggle-script" data-topic-id="${t.id}">
                    <span>${isExpanded ? "▲ Thu gọn" : "▼ Xem Script (18 câu)"}</span>
                  </button>
                </div>
              </div>

              <!-- Phần hiển thị kịch bản 18 câu khi nhấn mở -->
              <div class="script-drawer" id="script-${t.id}" ${isExpanded ? "" : "hidden"}>
                <div class="script-intro">
                  <span>Kịch bản 18 câu</span>
                  <span class="sandhi-legend">💡 <span class="t3">Màu cam</span> = biến điệu thanh 3</span>
                </div>

                <div class="dialogue-list">
                  ${t.lines
                    .map(
                      (line) => `
                    <div class="dialogue-line" data-action="copy-single-line" data-line-text="${esc(line.zh)}" title="Bấm để copy câu này">
                      <span class="role-badge role-${line.role}">${line.role === "A" ? "🤖 A" : "🗣️ B"}</span>
                      <div class="line-content">
                        <div class="line-zh">${esc(line.zh)}</div>
                        ${line.pinyinHtml ? `<div class="line-pinyin">${line.pinyinHtml}</div>` : (line.pinyin ? `<div class="line-pinyin">${esc(line.pinyin)}</div>` : "")}
                        ${line.vi ? `<div class="line-vi">${esc(line.vi)}</div>` : ""}
                      </div>
                    </div>
                  `
                    )
                    .join("")}
                </div>

                <div class="script-bottom-bar">
                  <button type="button" class="btn-secondary" data-action="copy-doubao" data-topic-id="${t.id}" style="width:100%">
                    <span>⚡ Copy toàn bộ đề này cho Doubao</span>
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
                📚 Từ vựng (${lesson.vocab.length})
              </button>
              <button type="button" class="btn-sub" data-action="open-patterns" data-lesson-id="${lesson.id}">
                🧩 Mẫu câu (${lesson.patterns.length})
              </button>
            </div>
          </div>
          ${topicsHtml}
        </section>
      `);
    });

    if (totalMatched === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
          <div style="font-size: 36px; margin-bottom: 8px;">🔍</div>
          <p>Không tìm thấy đề thi nào phù hợp với từ khóa "<strong>${esc(query)}</strong>"</p>
        </div>
      `;
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

  // Mở modal Mẫu câu
  function showPatternsModal(lessonId) {
    const lesson = D.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    const cards = lesson.patterns
      .map(
        (p) => `
        <div class="pattern-card">
          <h4>${esc(p.title)}</h4>
          <p class="pattern-explain">${esc(p.explain)}</p>
          <div class="pattern-ex">
            <span class="ex-zh">${esc(p.example)}</span>
            ${p.examplePinyin ? `<span class="ex-py">${esc(p.examplePinyin)}</span>` : ""}
            <span class="ex-vi">→ ${esc(p.exampleVi)}</span>
          </div>
        </div>
      `
      )
      .join("");

    openModal(`Bài ${lesson.no} · 词语例释 Mẫu câu (${lesson.patterns.length} mẫu)`, cards);
  }

  // ================================================= Đăng Ký Sự Kiện =================================================

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

    if (action === "copy-doubao") {
      const topic = allTopics.find((t) => t.id === topicId);
      if (topic) {
        copyText(getDoubaoFullPayload(topic), `Đã copy Đề ${topic.no} (Prompt + Script)!`);
      }
      return;
    }

    if (action === "copy-script-only") {
      const topic = allTopics.find((t) => t.id === topicId);
      if (topic) {
        copyText(getDialogueScript(topic), `Đã copy Hội thoại Đề ${topic.no}!`);
      }
      return;
    }

    if (action === "toggle-script") {
      const scriptDrawer = $(`#script-${topicId}`);
      if (scriptDrawer) {
        const isNowHidden = !scriptDrawer.hidden;
        scriptDrawer.hidden = isNowHidden;
        if (isNowHidden) {
          state.expandedScripts.delete(topicId);
          target.innerHTML = `<span>▼ Xem Script (18 câu)</span>`;
        } else {
          state.expandedScripts.add(topicId);
          target.innerHTML = `<span>▲ Thu gọn</span>`;
        }
      }
      return;
    }

    if (action === "copy-single-line") {
      const lineText = target.dataset.lineText;
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

  // Đóng Modal
  $("#btnModalClose")?.addEventListener("click", closeModal);
  modalBackdrop?.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalBackdrop.hidden) {
      closeModal();
    }
  });

  // Khởi động
  renderLessonChips();
  renderTopicList();

  // Đăng ký Service Worker cho PWA
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
