/**
 * Khẩu ngữ Trung cấp - Giao diện tra cứu & Quick Copy cho Doubao
 * Tối ưu hóa 100% cho điện thoại di động
 * Hỗ trợ Dual-Version: V1 (Bản gốc Word) & V2 (Bản tối ưu lồng ghép mẫu câu)
 * Hỗ trợ Audio A & B luyện nghe thụ động & Đồng bộ câu đọc (Karaoke Highlight)
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
    version: localStorage.getItem("kn_version") || "v2", // Mặc định V2 Tối ưu
    showPinyin: localStorage.getItem("kn_show_pinyin") !== "false", // Mặc định bật
    showVi: localStorage.getItem("kn_show_vi") !== "false", // Mặc định bật
    searchKeyword: "",
    expandedScripts: new Set(),
    compareFilter: "diffOnly", // 'diffOnly' | 'all'
    audioSpeed: parseFloat(localStorage.getItem("kn_audio_speed") || "1.0"),
    audioLoop: localStorage.getItem("kn_audio_loop") === "true"
  };

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

    // Dừng audio cũ nếu đang phát topic khác
    stopAudio();

    const audio = new Audio(topic.audio);
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
    const vTag = ver === "v1" ? "V1-Bản gốc" : "V2-Tối ưu";
    const header = `【第${topic.lessonNo}课 · 题${topic.no} · ${vTag}】${topic.question}`;
    const lines = getTopicLines(topic, ver).map((l) => `[${l.n}] ${l.role} ｜${l.zh}`).join("\n");
    return `${header}\n${lines}`;
  }

  function getDoubaoFullPayload(topic, ver = state.version) {
    return `${D.generalPrompt}\n\n————————\n${getDialogueScript(topic, ver)}`;
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
          const currentLines = getTopicLines(t, state.version);
          const diffCount = t.diffs ? t.diffs.length : 0;
          const isV2 = state.version === "v2";
          const isCurrentPlaying = currentPlayingTopicId === t.id && currentAudio && !currentAudio.paused;

          return `
            <article class="topic-card" id="card-${t.id}">
              <div class="topic-meta">
                <div class="topic-meta-badges">
                  <span class="topic-badge">Bài ${lesson.no} · Câu ${t.no}</span>
                  <span class="version-indicator ${state.version}">${isV2 ? "✨ V2 Tối ưu" : "📌 V1 Gốc"}</span>
                </div>
                <span class="topic-title-vi">${esc(t.titleVi)}</span>
              </div>

              <div class="topic-question">${esc(t.question)}</div>
              ${t.questionPinyinHtml ? `<div class="topic-pinyin">${t.questionPinyinHtml}</div>` : (t.questionPinyin ? `<div class="topic-pinyin">${esc(t.questionPinyin)}</div>` : "")}

              ${t.outline ? `<div class="topic-outline"><strong>Mạch ý:</strong> ${esc(t.outline)}</div>` : ""}

              ${t.takeaways ? `
                <details class="takeaways-box">
                  <summary class="takeaways-summary">
                    <span>💡 <strong>Ý chính để nói</strong> (Takeaways &amp; Câu chốt)</span>
                    <span class="chevron">▼</span>
                  </summary>
                  <div class="takeaways-content">
                    <ul class="takeaways-list">
                      ${t.takeaways.points.map((p) => `<li>${esc(p)}</li>`).join("")}
                    </ul>
                    ${t.takeaways.goldenQuotes ? `
                      <div class="golden-quote">
                        <span class="quote-tag">✨ Câu chốt ăn điểm</span>
                        <p class="quote-zh">${esc(t.takeaways.goldenQuotes)}</p>
                      </div>
                    ` : ""}
                  </div>
                </details>
              ` : ""}

              <div class="topic-actions">
                <button type="button" class="btn-primary-copy" data-action="copy-doubao" data-topic-id="${t.id}">
                  <span>⚡</span>
                  <span>Copy cho Doubao (${isV2 ? "V2 Tối ưu" : "V1 Gốc"})</span>
                </button>

                <div class="topic-secondary-actions">
                  <button type="button" class="btn-secondary btn-compare" data-action="open-compare" data-topic-id="${t.id}" title="Xem bản đối chiếu V1 gốc vs V2 nâng cấp">
                    <span>🔍 Đối chiếu (${diffCount})</span>
                  </button>

                  <button type="button" class="btn-secondary" data-action="copy-script-only" data-topic-id="${t.id}">
                    <span>📋</span>
                    <span>Chỉ Script</span>
                  </button>

                  <button type="button" class="btn-secondary" data-action="toggle-script" data-topic-id="${t.id}">
                    <span>${isExpanded ? "▲ Thu gọn" : "▼ Xem Script"}</span>
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

                      <label class="audio-loop-label" title="Tự động lặp lại khi hết bài để luyện nghe thụ động">
                        <input type="checkbox" class="audio-loop-cb" data-topic-id="${t.id}" ${state.audioLoop ? "checked" : ""} />
                        <span class="loop-txt">🔁 Lặp lại</span>
                      </label>
                    </div>
                  </div>
                ` : (state.version === "v1" ? `
                  <div class="audio-v1-notice">
                    <span>💡 <em>Audio A &amp; B được thu âm cho bản V2 (Tối ưu).</em></span>
                    <button type="button" class="btn-link-switch-v2" data-action="switch-to-v2">Chuyển sang V2 để nghe</button>
                  </div>
                ` : "")}

                <div class="script-intro">
                  <div class="script-version-info">
                    <span>Kịch bản 18 câu · <strong>${isV2 ? "✨ V2 Tối ưu" : "📌 V1 Gốc"}</strong></span>
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
                  <button type="button" class="btn-secondary" data-action="copy-doubao" data-topic-id="${t.id}" style="width:100%">
                    <span>⚡ Copy toàn bộ đề này cho Doubao (${isV2 ? "V2 Tối ưu" : "V1 Gốc"})</span>
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

    let bodyHtml = `
      <div class="compare-intro">
        <div class="compare-topic-name">
          <span class="badge-lesson">Bài ${topic.lessonNo} · Câu ${topic.no}</span>
          <div class="compare-title-zh">${esc(topic.question)}</div>
        </div>
        <div class="compare-stats-bar">
          <span class="stat-pill">📊 Nâng cấp: <strong>${diffs.length} / 18 câu</strong></span>
          <span class="stat-desc">Đã lồng ghép chuẩn mẫu câu của <em>Bài ${topic.lessonNo}</em></span>
        </div>

        <div class="compare-filter-tabs">
          <button type="button" class="tab-btn ${!isAllMode ? "active" : ""}" data-action="set-compare-filter" data-topic-id="${topic.id}" data-filter="diffOnly">
            ✨ Chỉ câu thay đổi (${diffs.length})
          </button>
          <button type="button" class="tab-btn ${isAllMode ? "active" : ""}" data-action="set-compare-filter" data-topic-id="${topic.id}" data-filter="all">
            📄 Toàn bộ 18 câu
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
          target.innerHTML = `<span>▼ Xem Script</span>`;
        } else {
          state.expandedScripts.add(topicId);
          target.innerHTML = `<span>▲ Thu gọn</span>`;
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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!modalBackdrop?.hidden) closeModal();
      if (!compareModalBackdrop?.hidden) closeCompareModal();
    }
  });

  // Khởi động
  updateVersionButtons();
  renderLessonChips();
  renderTopicList();

  // Đăng ký Service Worker cho PWA
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
