/**
 * includeHTML()
 * Carrega trechos HTML reutilizáveis (partials) e injeta na página.
 * Após carregar todos os includes, ativa scripts e revela o conteúdo.
 */

function includeHTML() {
  const elements = document.querySelectorAll("[include-html]");
  let loaded = 0;
  const total = elements.length;
  const scriptPromises = [];

  elements.forEach(el => {
    const file = el.getAttribute("include-html");

    fetch(file)
      .then(response => {
        if (!response.ok) throw new Error("Erro ao carregar " + file);
        return response.text();
      })
      .then(data => {
        el.innerHTML = data;
        el.removeAttribute("include-html");
        loaded++;

        // Executa scripts que vierem dentro do include
        el.querySelectorAll("script").forEach(oldScript => {
          const newScript = document.createElement("script");
          if (oldScript.src) {
            newScript.src = oldScript.src;
            scriptPromises.push(new Promise(resolve => {
              newScript.onload = resolve;
              newScript.onerror = resolve;
            }));
          } else {
            newScript.textContent = oldScript.textContent;
          }
          document.body.appendChild(newScript);
          oldScript.remove();
        });

        // Quando todos os partials terminaram de carregar
        if (loaded === total) {
          Promise.all(scriptPromises).then(() => {
            console.log("✅ Partials carregados com sucesso");

            // Render KaTeX (vem pelo KGJS)
            if (typeof renderMathInElement === "function") {
              renderMathInElement(document.body, {
                delimiters: [
                  { left: "$$", right: "$$", display: true },
                  { left: "$", right: "$", display: false }
                ]
              });
            }

            // Renderiza gráficos KGJS (se houver)
            if (typeof loadGraphs === "function") loadGraphs();

            // Remove classe de loading para evitar FOUC
            document.body.classList.remove("loading");
            document.body.classList.add("ready");
          });
        }
      })
      .catch(err => console.error("❌ includeHTML error:", err));
  });
}

document.addEventListener("DOMContentLoaded", includeHTML);
