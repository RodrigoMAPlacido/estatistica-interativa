// =========================================================
// main.js PRO – com suporte a <head partial-head="...">
// Título automático e include do head seguro sem duplicação
// =========================================================

(function () {

  /* ---------------- 0. Anti-FOUC imediato ---------------- */
  document.body.classList.add("loading");

  /* ---------------- 1. Carrega partial do <head> ---------- */
  function loadHeadPartial(done) {
    const headEl = document.head;
    const partialPath = headEl.getAttribute("partial-head");

    if (!partialPath) return done?.(); // nada pra carregar

    fetch(partialPath)
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(html => {
        // Evita carregar head duas vezes
        if (!headEl.dataset.loaded) {
          headEl.insertAdjacentHTML("afterbegin", html);
          headEl.dataset.loaded = "true";
        }
      })
      .catch(err => console.warn("⚠️ Não foi possível carregar o head:", err))
      .finally(() => done?.());
  }

  /* ---------------- 2. Define título inteligente ---------- */
  function setDynamicTitle() {
    // Prioridade 1: página definiu título manual?
    if (window.pageTitle) {
      document.title = `${window.pageTitle} | Estatística Interativa`;
      return;
    }

    // Prioridade 2: usar o <h1> automaticamente
    const h1 = document.querySelector("h1");
    if (h1 && h1.textContent.trim()) {
      document.title = `${h1.textContent.trim()} | Estatística Interativa`;
      return;
    }

    // Fallback
    document.title = "Estatística Interativa";
  }

  /* ----- 3. Carrega partials do BODY com suporte a scripts ----- */
  function includeHTML(done) {
    const nodes = document.querySelectorAll("[include-html]");
    if (!nodes.length) return done?.();

    let loaded = 0;
    const waits = [];

    nodes.forEach(el => {
      fetch(el.getAttribute("include-html"))
        .then(r => r.ok ? r.text() : Promise.reject(r.status))
        .then(html => {
          el.innerHTML = html;
          el.removeAttribute("include-html");

          // executa qualquer <script> vindo do partial
          el.querySelectorAll("script").forEach(oldScript => {
            const s = document.createElement("script");
            if (oldScript.src) {
              s.src = oldScript.src;
              waits.push(new Promise(res => (s.onload = res)));
            } else {
              s.textContent = oldScript.textContent;
            }
            document.body.appendChild(s);
            oldScript.remove();
          });
        })
        .finally(() => (++loaded === nodes.length && Promise.all(waits).then(done)));
    });
  }

  /* ---- 4. Aguarda KGJS + KaTeX ---- */
  function waitForKGJS(done) {
    const deadline = Date.now() + 4000;

    (function check() {
      if (window.loadGraphs || window.renderMathInElement || Date.now() > deadline) {
        return done();
      }
      setTimeout(check, 60);
    })();
  }

  /* ---- 5. Render final da página ---- */
  function renderPage() {
    // Render KaTeX
    if (typeof renderMathInElement === "function") {
      renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ]
      });
    }

    // Render KGJS
    if (typeof loadGraphs === "function") {
      try { loadGraphs(); } catch (e) { console.error(e); }
    }

    // Libera FOUC
    document.body.classList.remove("loading");
    document.body.classList.add("ready");
  }

  /* ---------------- 6. Fluxo geral ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    loadHeadPartial(() => {
      setDynamicTitle();
      includeHTML(() => waitForKGJS(renderPage));
    });
  });

})();
