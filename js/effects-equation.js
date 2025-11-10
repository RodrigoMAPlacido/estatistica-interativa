// js/effects-bgmath.js
(function () {
  const eqs = document.querySelectorAll(".bg-math .eq");
  if (!eqs.length) return;

  // Adiciona wrapper para separar float x interação
  eqs.forEach(eq => {
    const inner = document.createElement("span");
    inner.className = "eq-inner";
    inner.innerHTML = eq.innerHTML;
    eq.innerHTML = "";
    eq.appendChild(inner);
  });

  let mouseX = 0, mouseY = 0;
  let active = false;

  // Estado de animação para suavizar movimento
  const state = new WeakMap();
  eqs.forEach(eq => {
    state.set(eq, { x: 0, y: 0 }); // começa parado
  });

  function animate() {
    eqs.forEach(eq => {
      const rect = eq.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - mouseX;
      const dy = rect.top + rect.height / 2 - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 430;
      const force = active && dist < maxDist ? ((maxDist - dist) / maxDist) * 1.8 : 0;

      const hasForce = active && dist !== 0;
      const targetX = hasForce ? (dx / dist) * force * -45 : 0;
      const targetY = hasForce ? (dy / dist) * force * -45 : 0;

      // LERP (interpolação linear) para fluidez
      const e = state.get(eq);
      e.x += (targetX - e.x) * 0.08;
      e.y += (targetY - e.y) * 0.08;

      eq.style.setProperty("--move-x", `${e.x}px`);
      eq.style.setProperty("--move-y", `${e.y}px`);
    });

    requestAnimationFrame(animate);
  }

  // Eventos
  document.addEventListener("mousemove", e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    active = true;
  });
  document.addEventListener("mouseleave", () => active = false);
  document.addEventListener("touchmove", e => {
    const t = e.touches[0];
    mouseX = t.clientX;
    mouseY = t.clientY;
    active = true;
  });
  document.addEventListener("touchend", () => active = false);

  animate();
})();
