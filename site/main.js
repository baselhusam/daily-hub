(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let targetX = 0.62;
  let targetY = 0.28;
  let currentX = targetX;
  let currentY = targetY;
  let targetMx = window.innerWidth * 0.62;
  let targetMy = window.innerHeight * 0.28;
  let spotX = targetMx;
  let spotY = targetMy;
  let scale = 1;

  window.addEventListener(
    "pointermove",
    (event) => {
      document.body.classList.remove("is-idle");
      targetX = event.clientX / window.innerWidth;
      targetY = event.clientY / window.innerHeight;
      targetMx = event.clientX;
      targetMy = event.clientY;
    },
    { passive: true }
  );

  document.documentElement.addEventListener("mouseleave", () => {
    document.body.classList.add("is-idle");
  });

  const tick = () => {
    if (reduced) {
      root.style.setProperty("--px", "0.5");
      root.style.setProperty("--py", "0.32");
      return;
    }

    currentX += (targetX - currentX) * 0.035;
    currentY += (targetY - currentY) * 0.035;
    spotX += (targetMx - spotX) * 0.08;
    spotY += (targetMy - spotY) * 0.08;

    const speed = Math.hypot(targetMx - spotX, targetMy - spotY);
    const nextScale = 1 + Math.min(speed / 220, 0.12);
    scale += (nextScale - scale) * 0.08;

    root.style.setProperty("--px", currentX.toFixed(4));
    root.style.setProperty("--py", currentY.toFixed(4));
    root.style.setProperty("--mx", `${spotX.toFixed(1)}px`);
    root.style.setProperty("--my", `${spotY.toFixed(1)}px`);
    root.style.setProperty("--spot-scale", scale.toFixed(3));
    requestAnimationFrame(tick);
  };

  tick();

  const tabs = [...document.querySelectorAll("[data-tab]")];
  const panels = [...document.querySelectorAll(".panel")];
  const copyButton = document.querySelector("[data-copy]");
  const copyLabel = document.querySelector("[data-copy-label]");

  const activePanel = () => panels.find((panel) => !panel.hidden) ?? panels[0];

  const activate = (name) => {
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === name;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", String(on));
    });
    panels.forEach((panel) => {
      const on = panel.id === `panel-${name}`;
      panel.hidden = !on;
      panel.classList.toggle("is-active", on);
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activate(tab.dataset.tab));
  });

  document.querySelector(".tabs")?.addEventListener("keydown", (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next =
        event.key === "ArrowRight"
          ? tabs[(index + 1) % tabs.length]
          : tabs[(index - 1 + tabs.length) % tabs.length];
      next.focus();
      activate(next.dataset.tab);
    }
  });

  copyButton?.addEventListener("click", async () => {
    const command = activePanel()?.dataset.command;
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const field = document.createElement("textarea");
      field.value = command;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    copyButton.classList.add("is-copied");
    if (copyLabel) copyLabel.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.classList.remove("is-copied");
      if (copyLabel) copyLabel.textContent = "Copy";
    }, 1600);
  });
})();
