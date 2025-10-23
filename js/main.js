// js/main.js
// Carrega partials, executa <script> internos, espera o KGJS ficar pronto
// e então renderiza KaTeX (se disponível) e os gráficos. Sem loaders de KaTeX.

(function () {
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

          // Executa <script> vindos do include
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

  // Espera o KGJS expor algo (p.ex. loadGraphs) por até 3s
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
    // KaTeX via KGJS (se existir)
    if (typeof window.renderMathInElement === "function") {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$",  right: "$",  display: false }
        ]
      });
      console.log("✅ KaTeX renderizado");
    } else {
      console.log("ℹ️ KaTeX não encontrado (ok se a página não usa fórmulas).");
    }

    // Gráficos do KGJS (se existir)
    if (typeof window.loadGraphs === "function") {
      try { window.loadGraphs(); } catch (e) { console.error(e); }
      console.log("✅ Gráficos (KGJS) prontos");
    }

    // Evita FOUC
    document.body.classList.remove("loading");
    document.body.classList.add("ready");
    console.log("✅ Página pronta");
  }

  document.addEventListener("DOMContentLoaded", () => {
    includeHTML(() => {
      console.log("✅ Includes carregados");
      waitForKGJS(renderPage);
    });
  });
})();
