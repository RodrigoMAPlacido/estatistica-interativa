// =========================================================
// main.js – versão limpa para Jekyll (sem include via JS)
// =========================================================

(function () {

  /* ---------------- 0. Anti-FOUC ---------------- */
  document.body.classList.add("loading");

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
    document.body.classList.remove("loading");
    document.body.classList.add("ready");
  }

  /* ---------------- 4. Execução ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    setDynamicTitle();
    waitForReady(renderPage);
  });

})();
