// js/main.js
// Injeta head.html no <head>, carrega partials do BODY (executando <script>),
// espera KGJS/KaTeX e evita FOUC.

(function () {
  // 0) Anti-FOUC imediato
  document.body.classList.add("loading");

  // 1) Carrega head.html no <head> antes de tudo
  function loadHeadPartial(done) {
    const headPath = location.pathname.includes("/capitulos/")
      ? "../../partials/head.html"
      : "partials/head.html";

    fetch(headPath)
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(html => {
        // Insere no início do <head>
        document.head.insertAdjacentHTML("afterbegin", html);
      })
      .catch(err => console.warn("⚠️ head.html não encontrado:", err))
      .finally(() => done && done());
  }

  // 2) Carrega partials marcados com [include-html] no BODY e EXECUTA <script>
  function includeHTML(done) {
    // evita processar <head include-html> (o head já é injetado pela função acima)
    const nodes = document.querySelectorAll("[include-html]:not(head)");
    const total = nodes.length;
    if (!total) return done && done();

    let loaded = 0;
    const scriptPromises = [];

    nodes.forEach(el => {
      const file = el.getAttribute("include-html");

      fetch(file)
        .then(r => {
          if (!r.ok) throw new Error("HTTP " + r.status + " em " + file);
          return r.text();
        })
        .then(html => {
          el.innerHTML = html;
          el.removeAttribute("include-html");

          // Executa <script> vindos dos includes (necessário p/ body.html -> KGJS/KaTeX)
          el.querySelectorAll("script").forEach(old => {
            const s = document.createElement("script");
            // Copia atributos relevantes
            Array.from(old.attributes).forEach(a => s.setAttribute(a.name, a.value));

            if (old.src) {
              // aguarda carregamento de scripts externos
              scriptPromises.push(new Promise(res => {
                s.onload = s.onerror = res;
              }));
              s.src = old.src;
            } else {
              s.textContent = old.textContent;
            }

            // Usa <body> como alvo padrão
            (document.body || document.documentElement).appendChild(s);
            old.remove();
          });
        })
        .catch(err => console.error("❌ includeHTML:", err))
        .finally(() => {
          loaded++;
          if (loaded === total) {
            Promise.all(scriptPromises).then(() => done && done());
          }
        });
    });
  }

  // 3) Espera KGJS/KaTeX aparecerem (trazidos pelo body.html)
  function waitForKGJS(cb, deadline = Date.now() + 4000) {
    if (window.loadGraphs || window.renderMathInElement) return cb();
    if (Date.now() > deadline) {
      console.warn("⚠️ KGJS/KaTeX demoraram; seguindo mesmo assim.");
      return cb();
    }
    setTimeout(() => waitForKGJS(cb, deadline), 80);
  }

  // 4) Renderiza matemática e gráficos, libera Anti-FOUC
  function renderPage() {
    // KaTeX
    if (typeof renderMathInElement === "function") {
      renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ]
      });
    }
    // KGJS
    if (typeof loadGraphs === "function") {
      try { loadGraphs(); } catch (e) { console.error(e); }
    }
    // Mostra a página
    requestAnimationFrame(() => {
      document.body.classList.remove("loading");
      document.body.classList.add("ready");
    });
  }

  // 5) Fluxo geral
  document.addEventListener("DOMContentLoaded", () => {
    // 1º injeta head, 2º carrega partials do BODY (inclui body.html), 3º espera KGJS/KaTeX, 4º renderiza
    loadHeadPartial(() => {
      includeHTML(() => {
        waitForKGJS(renderPage);
      });
    });
  });

  // 6) Fail-safe
  setTimeout(() => {
    if (!document.body.classList.contains("ready")) {
      document.body.classList.remove("loading");
      document.body.classList.add("ready");
      console.warn("⚠️ Fail-safe Anti-FOUC ativado.");
    }
  }, 5000);
})();
