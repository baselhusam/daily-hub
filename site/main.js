(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reveals = [...document.querySelectorAll(".reveal")];

  const header = document.querySelector(".top");
  const onScroll = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (reduced || !("IntersectionObserver" in window)) {
    reveals.forEach((node) => node.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((node) => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        node.classList.add("is-in");
      } else {
        io.observe(node);
      }
    });
  }
  root.classList.add("js");
  let targetX = 0.62;
  let targetY = 0.32;
  let currentX = targetX;
  let currentY = targetY;
  let targetMx = window.innerWidth * 0.62;
  let targetMy = window.innerHeight * 0.28;
  let washX = targetMx;
  let washY = targetMy;

  window.addEventListener(
    "pointermove",
    (event) => {
      targetX = event.clientX / window.innerWidth;
      targetY = event.clientY / window.innerHeight;
      targetMx = event.clientX;
      targetMy = event.clientY;
    },
    { passive: true }
  );

  const tick = () => {
    if (reduced) {
      root.style.setProperty("--px", "0.5");
      root.style.setProperty("--py", "0.32");
      return;
    }

    currentX += (targetX - currentX) * 0.06;
    currentY += (targetY - currentY) * 0.06;
    washX += (targetMx - washX) * 0.1;
    washY += (targetMy - washY) * 0.1;

    root.style.setProperty("--px", currentX.toFixed(4));
    root.style.setProperty("--py", currentY.toFixed(4));
    root.style.setProperty("--mx", `${washX.toFixed(1)}px`);
    root.style.setProperty("--my", `${washY.toFixed(1)}px`);
    requestAnimationFrame(tick);
  };

  tick();

  const dateLabel = document.querySelector("[data-today-label]");
  const greeting = document.querySelector("[data-greeting]");
  if (dateLabel) {
    dateLabel.textContent = new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  }
  if (greeting) {
    const hour = new Date().getHours();
    const hello =
      hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
    greeting.textContent = hello;
  }

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

  document.querySelector(".segmented")?.addEventListener("keydown", (event) => {
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
    }, 1400);
  });

  const taskList = document.querySelector("[data-tasks]");
  const progressBar = document.querySelector("[data-progress-bar]");
  const progressLabel = document.querySelector("[data-progress-label]");
  const openCount = document.querySelector("[data-open-count]");

  const syncProgress = () => {
    const checks = [...(taskList?.querySelectorAll(".check") ?? [])];
    const done = checks.filter((check) => check.classList.contains("is-done")).length;
    const total = checks.length || 1;
    if (progressBar) progressBar.style.width = `${(done / total) * 100}%`;
    if (progressLabel) progressLabel.textContent = `${done} / ${total}`;
    if (openCount) openCount.textContent = String(total - done);
  };

  document.querySelectorAll(".tasks .check").forEach((check) => {
    check.addEventListener("click", () => {
      const on = !check.classList.contains("is-done");
      check.classList.toggle("is-done", on);
      check.setAttribute("aria-pressed", String(on));
      check.nextElementSibling?.classList.toggle("is-done", on);
      syncProgress();
    });
  });

  document.querySelectorAll(".habits .check").forEach((check) => {
    check.addEventListener("click", () => {
      const on = !check.classList.contains("is-done");
      check.classList.toggle("is-done", on);
      check.setAttribute("aria-pressed", String(on));
    });
  });
})();
