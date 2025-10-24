// js/main.js
// Carrega partials, executa scripts internos, espera KGJS/KaTeX e evita FOUC

(function () {

  // ✅ Garante proteção anti-FOUC no começo do carregamento
  document.body.classList.add("loading");

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

          el.querySelectorAll("script").forEach(old => {
            const s = document.createElement("script");
            if (old.src) {
              s.src = old.src;
              scriptPromises.push(
                new Promise(res => {
                  s.onload = res;
                  s.onerror = res;
                })
              );
            } else {
              s.textContent = old.textContent;
            }
            document.body.appendChild(s);
            old.remove();
          });
        })
        .catch(err => {
          console.error("❌ includeHTML:", err);
        })
        .finally(() => {
          loaded++;
          if (loaded === total) {
            Promise.all(scriptPromises).then(() => done?.());
          }
        });
    });
  }

  function waitForKGJS(cb, deadline = Date.now() + 3000) {
    if (typeof window.loadGraphs === "function" || typeof window.renderMathInElement === "function") {
      cb();
      return;
    }
    if (Date.now() > deadline) {
      console.warn("⚠️ KGJS não foi detectado (seguindo mesmo assim).");
      cb();
      return;
    }
    setTimeout(() => waitForKGJS(cb, deadline), 60);
  }

  function renderPage() {
    if (typeof window.renderMathInElement === "function") {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$",  right: "$",  display: false }
        ]
      });
      console.log("✅ KaTeX renderizado");
    }

    if (typeof window.loadGraphs === "function") {
      try { window.loadGraphs(); } catch (e) { console.error(e); }
      console.log("✅ Gráficos KGJS carregados");
    }

    // ✅ Libera a página (anti-FOUC)
    requestAnimationFrame(() => {
      document.body.classList.remove("loading");
      document.body.classList.add("ready");
      console.log("✅ Página pronta");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    includeHTML(() => {
      console.log("✅ Includes carregados");
      waitForKGJS(renderPage);
    });
  });

  // ✅ Fallback anti-FOUC
  setTimeout(() => {
    if (!document.body.classList.contains("ready")) {
      document.body.classList.remove("loading");
      document.body.classList.add("ready");
      console.warn("⚠️ Fallback anti-FOUC ativado");
    }
  }, 4000);

})();
