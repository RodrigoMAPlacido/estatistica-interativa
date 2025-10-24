// =========================================================
// main.js
// Carrega head.html, partials do body, executa scripts incluídos,
// espera KGJS/KaTeX e controla Anti-FOUC
// =========================================================

(function () {

  /* -------------------------- 0. Anti-FOUC imediato -------------------------- */
  document.body.classList.add("loading");

  /* ------------------------- 1. Carrega partial do <head> -------------------- */
  function loadHeadPartial(done) {
    const path = location.pathname.includes("/capitulos/")
      ? "../../partials/head.html"
      : "partials/head.html";

    fetch(path)
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(html => document.head.insertAdjacentHTML("afterbegin", html))
      .catch(() => console.warn("⚠️ head.html não encontrado:", path))
      .finally(() => done && done());
  }

  /* ----------- 2. Carrega partials do BODY com suporte a <script> ------------ */
  function includeHTML(done) {
    const nodes = document.querySelectorAll("[include-html]:not(head)");
    if (!nodes.length) return done && done();

    let loaded = 0;
    const waitScripts = [];

    nodes.forEach(el => {
      fetch(el.getAttribute("include-html"))
        .then(r => r.ok ? r.text() : Promise.reject(r.status))
        .then(html => {
          el.innerHTML = html;
          el.removeAttribute("include-html");

          // Executa scripts vindos dos partials
          el.querySelectorAll("script").forEach(oldScript => {
            const s = document.createElement("script");
            if (oldScript.src) {
              s.src = oldScript.src;
              waitScripts.push(new Promise(res => (s.onload = s.onerror = res)));
            } else {
              s.textContent = oldScript.textContent;
            }
            document.body.appendChild(s);
            oldScript.remove();
          });
        })
        .catch(err => console.error("❌ Erro include:", err))
        .finally(() => (++loaded === nodes.length && Promise.all(waitScripts).then(done)));
    });
  }

  /* --------------- 3. Aguarda KGJS + KaTeX antes de renderizar --------------- */
  function waitForKGJS(done) {
    const deadline = Date.now() + 3500;

    (function check() {
      if (window.loadGraphs || window.renderMathInElement || Date.now() > deadline) {
        return done();
      }
      setTimeout(check, 70);
    })();
  }

  /* ---------------------- 4. Renderiza página final -------------------------- */
  function renderPage() {
    // Render fórmulas KaTeX
    if (typeof renderMathInElement === "function") {
      renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ]
      });
    }
    // Render gráficos KGJS
    if (typeof loadGraphs === "function") {
      try { loadGraphs(); } catch (err) { console.error(err); }
    }
    // Libera bloqueio FOUC
    requestAnimationFrame(() => {
      document.body.classList.remove("loading");
      document.body.classList.add("ready");
    });
  }

  /* -------------------------- 5. Flow Geral --------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    loadHeadPartial(() => {
      includeHTML(() => {
        waitForKGJS(renderPage);
      });
    });
  });

  /* ------------------------------ 6. Fail-safe ------------------------------- */
  setTimeout(() => {
    if (!document.body.classList.contains("ready")) {
      document.body.classList.remove("loading");
      document.body.classList.add("ready");
      console.warn("⚠️ Fail-safe ativado (FOUC liberado).");
    }
  }, 5000);

})();
