// =========================================================
// main.js – versão limpa para Jekyll (sem include via JS)
// =========================================================

(function () {

  /* ---------------- 0. Anti-FOUC ---------------- */
  document.body.classList.add("loading");

  /* ---------------- KGJS resize helpers ---------------- */
  const KG_RESIZE_RETRY_DELAY = 180;
  const KG_RESIZE_MAX_RETRIES = 8;
  let kgResizeRaf = 0;
  let kgEnsureTimer = 0;
  let kgEnsureAttempts = 0;

  const hasKGContainers = () => document.querySelector(".kg-container") !== null;

  function applyContainerAspect(view) {
    if (!view || typeof view.updateDimensions !== "function") {
      return;
    }
    const container = view.div && typeof view.div.node === "function" ? view.div.node() : null;
    if (!container) {
      return;
    }
    const data = container.dataset || {};
    if (!view.__baseAspectRatio) {
      view.__baseAspectRatio = view.aspectRatio;
    }
    let targetAspect = view.__baseAspectRatio;
    const attrAspect = parseFloat(data.kgAspect || "");
    if (!Number.isNaN(attrAspect) && attrAspect > 0) {
      targetAspect = attrAspect;
    }
    const attrMobile = parseFloat(data.kgMobileAspect || "");
    if (window.innerWidth <= 768 && !Number.isNaN(attrMobile) && attrMobile > 0) {
      targetAspect = attrMobile;
    }
    if (view.aspectRatio !== targetAspect) {
      view.aspectRatio = targetAspect;
    }
  }

  function resizeKGViews() {
    if (!hasKGContainers()) {
      kgEnsureAttempts = 0;
      if (kgEnsureTimer) {
        clearTimeout(kgEnsureTimer);
        kgEnsureTimer = 0;
      }
      return;
    }
    if (!Array.isArray(window.views) || window.views.length === 0) {
      if (kgEnsureAttempts < KG_RESIZE_MAX_RETRIES) {
        kgEnsureAttempts += 1;
        if (kgEnsureTimer) {
          clearTimeout(kgEnsureTimer);
        }
        kgEnsureTimer = window.setTimeout(() => {
          kgEnsureTimer = 0;
          resizeKGViews();
        }, KG_RESIZE_RETRY_DELAY);
      }
      return;
    }
    kgEnsureAttempts = 0;
    if (kgEnsureTimer) {
      clearTimeout(kgEnsureTimer);
      kgEnsureTimer = 0;
    }
    window.views.forEach((view) => {
      applyContainerAspect(view);
      view.updateDimensions();
    });
  }

  function scheduleKGResize() {
    if (!hasKGContainers()) {
      return;
    }
    if (kgResizeRaf) {
      cancelAnimationFrame(kgResizeRaf);
    }
    kgResizeRaf = window.requestAnimationFrame(() => {
      kgResizeRaf = 0;
      resizeKGViews();
    });
  }

  window.addEventListener("resize", scheduleKGResize, { passive: true });
  window.addEventListener("orientationchange", scheduleKGResize);

  /* ---------------- 1. Define título automático ---------------- */
  function setDynamicTitle() {
    if (window.pageTitle) {
      document.title = `${window.pageTitle} | Estatística Interativa`;
      return;
    }
    const h1 = document.querySelector("h1");
    if (h1) {
      document.title = `${h1.textContent.trim()} | Estatística Interativa`;
    } else {
      document.title = "Estatística Interativa";
    }
  }

  /* ---------------- 2. Aguarda KGJS + KaTeX ---------------- */
  function waitForReady(done) {
    const deadline = Date.now() + 4000;
    (function check() {
      if (window.loadGraphs || window.renderMathInElement || Date.now() > deadline) {
        return done();
      }
      setTimeout(check, 50);
    })();
  }

  /* ---------------- 3. Renderização final ---------------- */
  function renderPage() {
    if (typeof renderMathInElement === "function") {
      renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ]
      });
    }
    if (typeof loadGraphs === "function") {
      try { loadGraphs(); } catch (err) { console.error(err); }
    }
    if (hasKGContainers()) {
      scheduleKGResize();
      window.setTimeout(scheduleKGResize, 240);
    }
    document.body.classList.remove("loading");
    document.body.classList.add("ready");
  }

  /* ---------------- 4. Execução ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    setDynamicTitle();
    waitForReady(renderPage);
  });

})();
