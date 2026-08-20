(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let targetX = 0.62;
  let targetY = 0.28;
  let currentX = targetX;
  let currentY = targetY;

  window.addEventListener(
    "pointermove",
    (event) => {
      targetX = event.clientX / window.innerWidth;
      targetY = event.clientY / window.innerHeight;
    },
    { passive: true }
  );

  const tick = () => {
    const ease = reduced ? 1 : 0.06;
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    root.style.setProperty("--px", currentX.toFixed(4));
    root.style.setProperty("--py", currentY.toFixed(4));
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
