// js/main.js
// Carrega partials, executa scripts internos, espera KGJS/KaTeX e evita FOUC

(function () {
  // ✅ Garante proteção anti-FOUC no começo do carregamento
  if (!document.body.classList.contains("loading")) {
    document.body.classList.add("loading");
  }

  // ===== 1. INCLUDE HTML (header, footer etc.) =====
  function includeHTML(done) {
    const nodes = document.querySelectorAll("[include-html]");
    const total = nodes.length;
    if (!total) return done?.();

    let loaded = 0;
    const scriptPromises = [];

    nodes.forEach(el => {
      const file = el.getAttribute("include-html");
      fetch(file)
        .then(r => {
          if (!r.ok) throw new Error("Erro ao carregar " + file);
          return r.text();
        })
        .then(html => {
          el.innerHTML = html;
          el.removeAttribute("include-html");

          // Executa <script> vindos dos includes
          el.querySelectorAll("script").forEach(old => {
            const s = document.createElement("script");
            if (old.src) {
              s.src = old.src;
              scriptPromises.push(new Promise(res => {
                s.onload = res;
                s.onerror = res;
              }));
            } else {
              s.textContent = old.textContent;
            }
            document.body.appendChild(s);
            old.remove();
          });
        })
        .catch(err => console.error("❌ includeHTML:", err))
        .finally(() => {
          loaded++;
          if (loaded === total) {
            Promise.all(scriptPromises).then(() => done?.());
          }
        });
    });
  }

  // ===== 2. GARANTE KGJS/KaTeX =====
  function waitForKGJS(cb, deadline = Date.now() + 3500) {
    if (window.loadGraphs || window.renderMathInElement) {
      return cb();
    }
    if (Date.now() > deadline) {
      console.warn("⚠️ KGJS demorou, seguindo assim mesmo.");
      return cb();
    }
    setTimeout(() => waitForKGJS(cb, deadline), 80);
  }

  // ===== 3. RENDERIZA PÁGINA =====
  function renderPage() {
    // Render matemática (KaTeX)
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
      try { loadGraphs(); } catch (e) { console.error(e); }
    }

    // ✅ Libera página com Anti-FOUC suave
    requestAnimationFrame(() => {
      document.body.classList.remove("loading");
      document.body.classList.add("ready");
    });
  }

  // ===== 4. FLUXO GERAL =====
  document.addEventListener("DOMContentLoaded", () => {
    includeHTML(() => {
      waitForKGJS(renderPage);
    });
  });

  // ===== 5. FAIL-SAFE =====
  setTimeout(() => {
    if (!document.body.classList.contains("ready")) {
      document.body.classList.remove("loading");
      document.body.classList.add("ready");
      console.warn("⚠️ Fail-Safe Anti-FOUC ativado.");
    }
  }, 5000);
})();
