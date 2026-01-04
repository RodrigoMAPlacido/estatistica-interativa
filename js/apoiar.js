console.log("[apoiar.js] carregou");

document.addEventListener("DOMContentLoaded", () => {
  const WIDGET_ID = "support-widget";
  const HINT_ID = "support-hint";

  // hint some depois de 2 min (desktop)
  const HINT_MS = 2 * 60 * 1000;

  // quão antes do final esconder (quando nav-links estiver chegando)
  const HIDE_BEFORE_END_PX = 90;

  const widget = document.getElementById(WIDGET_ID);
  const hint = document.getElementById(HINT_ID);

  if (!widget) return;

  // 1) Esconde o hint depois de 2 min (se existir)
  if (hint) {
    window.setTimeout(() => {
      hint.classList.add("is-hidden");
      hint.setAttribute("aria-hidden", "true");
    }, HINT_MS);
  }

  // 2) Esconde o widget antes do final, igual aos outros botões
  const navLinks = document.querySelector(".nav-links");

  // Preferência: IntersectionObserver (mais estável que “pixels do scroll”)
  if ("IntersectionObserver" in window && navLinks) {
    const io = new IntersectionObserver(
      (entries) => {
        const nearEnd = entries.some((e) => e.isIntersecting);
        widget.classList.toggle("is-hidden-by-scroll", nearEnd);
      },
      {
        root: null,
        threshold: 0,
        // expande o “alcance” para baixo -> some ANTES do .nav-links aparecer
        rootMargin: `0px 0px ${HIDE_BEFORE_END_PX}px 0px`,
      }
    );

    io.observe(navLinks);
    return;
  }

  // Fallback: distância do fim (caso não tenha .nav-links ou IO)
  const updateByScroll = () => {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const viewportH = window.innerHeight || 0;
    const docH = Math.max(doc.scrollHeight, document.body.scrollHeight);
    const remaining = docH - (scrollTop + viewportH);

    widget.classList.toggle("is-hidden-by-scroll", remaining < HIDE_BEFORE_END_PX);
  };

  let raf = null;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      updateByScroll();
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateByScroll);
  updateByScroll();
});
