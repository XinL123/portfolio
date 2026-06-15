const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-toggle");
const themeButton = document.querySelector(".pull-chain");
const orangeStage = document.querySelector(".orange-stage");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const applyTheme = (theme) => {
  document.body.dataset.theme = theme;

  if (themeButton) {
    const isDark = theme === "dark";
    themeButton.setAttribute("aria-pressed", String(isDark));
    themeButton.setAttribute(
      "aria-label",
      isDark ? "Pull chain to switch to light mode" : "Pull chain to switch to dark mode"
    );
  }
};

const savedTheme = localStorage.getItem("portfolio-theme");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
applyTheme(savedTheme || systemTheme);

const SCROLLED_ENTER_Y = 48;
const SCROLLED_EXIT_Y = 12;
let scrollFrame = null;

const syncHeaderScroll = () => {
  if (!header) return;
  const isScrolled = header.classList.contains("is-scrolled");

  if (!isScrolled && window.scrollY >= SCROLLED_ENTER_Y) {
    header.classList.add("is-scrolled");
  }

  if (isScrolled && window.scrollY <= SCROLLED_EXIT_Y) {
    header.classList.remove("is-scrolled");
  }
};

syncHeaderScroll();
window.addEventListener(
  "scroll",
  () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      syncHeaderScroll();
    });
  },
  { passive: true }
);

if (header && menuButton) {
  header.querySelectorAll(".main-nav a").forEach((link) => {
    const label = link.textContent.trim();
    if (!label || link.querySelector(".nav-link-label")) return;

    link.dataset.navLabel = label;
    link.textContent = "";

    const labelNode = document.createElement("span");
    labelNode.className = "nav-link-label";
    labelNode.textContent = label;
    link.append(labelNode);
  });

  menuButton.addEventListener("click", () => {
    const isOpen = header.classList.toggle("nav-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.textContent = "Menu";
  });

  header.querySelectorAll(".main-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("nav-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.textContent = "Menu";
    });
  });
}

if (themeButton) {
  themeButton.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("portfolio-theme", nextTheme);
    themeButton.classList.remove("is-pulled");
    void themeButton.offsetWidth;
    themeButton.classList.add("is-pulled");
    applyTheme(nextTheme);
  });
}

document.querySelectorAll(".play-card video").forEach((video) => {
  const play = () => video.play().catch(() => {});
  const pause = () => {
    video.pause();
    video.currentTime = 0;
  };

  video.closest(".play-card")?.addEventListener("mouseenter", play);
  video.closest(".play-card")?.addEventListener("mouseleave", pause);
});

const artLightbox = document.querySelector(".art-lightbox");

if (artLightbox) {
  const lightboxImage = artLightbox.querySelector(".art-lightbox-image");
  const lightboxCount = artLightbox.querySelector(".art-lightbox-count");
  const closeButton = artLightbox.querySelector(".art-lightbox-close");
  const prevButton = artLightbox.querySelector(".art-lightbox-prev");
  const nextButton = artLightbox.querySelector(".art-lightbox-next");
  const groups = Array.from(document.querySelectorAll(".art-year-group")).map((group) =>
    Array.from(group.querySelectorAll(".art-card.filled")).map((card) => ({
      card,
      src: card.getAttribute("href"),
      alt: card.querySelector("img")?.getAttribute("alt") || "Artwork"
    }))
  );

  let activeGroupIndex = 0;
  let activeImageIndex = 0;

  const stripCacheQuery = (src) => src?.replace(/\?v=.*$/, "") || "";

  const syncLightbox = () => {
    const activeGroup = groups[activeGroupIndex] || [];
    const activeItem = activeGroup[activeImageIndex];
    if (!activeItem || !lightboxImage || !lightboxCount) return;

    lightboxImage.src = stripCacheQuery(activeItem.src);
    lightboxImage.alt = activeItem.alt;
    lightboxCount.textContent = `${activeImageIndex + 1}/${activeGroup.length}`;
  };

  const openLightbox = (groupIndex, imageIndex) => {
    activeGroupIndex = groupIndex;
    activeImageIndex = imageIndex;
    syncLightbox();
    artLightbox.hidden = false;
    document.body.classList.add("is-lightbox-open");
    closeButton?.focus({ preventScroll: true });
  };

  const closeLightbox = () => {
    artLightbox.hidden = true;
    document.body.classList.remove("is-lightbox-open");
    lightboxImage?.removeAttribute("src");
  };

  const showOffset = (offset) => {
    const activeGroup = groups[activeGroupIndex] || [];
    if (!activeGroup.length) return;
    activeImageIndex = (activeImageIndex + offset + activeGroup.length) % activeGroup.length;
    syncLightbox();
  };

  groups.forEach((group, groupIndex) => {
    group.forEach(({ card }, imageIndex) => {
      card.addEventListener("click", (event) => {
        event.preventDefault();
        openLightbox(groupIndex, imageIndex);
      });
    });
  });

  closeButton?.addEventListener("click", closeLightbox);
  prevButton?.addEventListener("click", () => showOffset(-1));
  nextButton?.addEventListener("click", () => showOffset(1));
  artLightbox.addEventListener("click", (event) => {
    if (event.target === artLightbox) closeLightbox();
  });

  window.addEventListener("keydown", (event) => {
    if (artLightbox.hidden) return;

    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") showOffset(-1);
    if (event.key === "ArrowRight") showOffset(1);
  });
}

if (orangeStage) {
  const leftEye = orangeStage.querySelector(".orange-eye-left");
  const rightEye = orangeStage.querySelector(".orange-eye-right");
  const eyes = [leftEye, rightEye].filter(Boolean);
  orangeStage.classList.add("has-random-blink");
  const maxX = 82;
  const maxY = 62;
  const smoothness = 0.1;
  const convergence = 11;
  const leftReachBoost = 14;
  const downReachBoost = 8;
  const upBoost = 1.1;
  const downReduce = 0.85;
  const deadZone = 0.02;
  const eyeState = {
    currentX: 0,
    currentY: 0,
    currentLeftInner: 0,
    currentRightInner: 0,
    targetX: 0,
    targetY: 0,
    targetLeftInner: 0,
    targetRightInner: 0,
    frame: null,
    active: true
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomBlinkDelay = () => 2600 + Math.random() * 5200;

  let blinkTimer = null;

  const blinkOnce = () => {
    eyes.forEach((eye) => {
      eye.classList.remove("is-blinking");
      void eye.offsetWidth;
      eye.classList.add("is-blinking");
    });
  };

  const scheduleBlink = (delay = randomBlinkDelay()) => {
    window.clearTimeout(blinkTimer);
    blinkTimer = window.setTimeout(() => {
      blinkOnce();

      if (Math.random() < 0.18) {
        window.setTimeout(blinkOnce, 210 + Math.random() * 80);
      }

      scheduleBlink();
    }, delay);
  };

  const scheduleEyes = () => {
    if (!eyeState.frame) {
      eyeState.frame = requestAnimationFrame(renderEyes);
    }
  };

  const renderEyes = () => {
    eyeState.currentX += (eyeState.targetX - eyeState.currentX) * smoothness;
    eyeState.currentY += (eyeState.targetY - eyeState.currentY) * smoothness;
    eyeState.currentLeftInner += (eyeState.targetLeftInner - eyeState.currentLeftInner) * smoothness;
    eyeState.currentRightInner += (eyeState.targetRightInner - eyeState.currentRightInner) * smoothness;

    const x = Math.round(eyeState.currentX * 100) / 100;
    const y = Math.round(eyeState.currentY * 100) / 100;
    const leftInner = Math.round(eyeState.currentLeftInner * 100) / 100;
    const rightInner = Math.round(eyeState.currentRightInner * 100) / 100;

    if (leftEye) {
      leftEye.style.setProperty("--eye-translate", `translate3d(${x + leftInner}px, ${y}px, 0)`);
    }

    if (rightEye) {
      rightEye.style.setProperty("--eye-translate", `translate3d(${x + rightInner}px, ${y}px, 0)`);
    }

    if (
      Math.abs(eyeState.targetX - eyeState.currentX) > 0.02 ||
      Math.abs(eyeState.targetY - eyeState.currentY) > 0.02 ||
      Math.abs(eyeState.targetLeftInner - eyeState.currentLeftInner) > 0.02 ||
      Math.abs(eyeState.targetRightInner - eyeState.currentRightInner) > 0.02
    ) {
      eyeState.frame = requestAnimationFrame(renderEyes);
    } else {
      eyeState.frame = null;
    }
  };

  const updateEyeTarget = (event) => {
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;

    const rect = orangeStage.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let relativeX = (event.clientX - centerX) / (rect.width / 2);
    let relativeY = (event.clientY - centerY) / (rect.height / 2);

    relativeX = clamp(relativeX, -1, 1);
    relativeY = clamp(relativeY, -1, 1);

    if (Math.abs(relativeX) < deadZone) relativeX = 0;
    if (Math.abs(relativeY) < deadZone) relativeY = 0;

    const yMultiplier = relativeY < 0 ? upBoost : downReduce;
    const sideAmount = Math.abs(relativeX);
    const directionalConvergence = sideAmount * convergence;
    const leftReach = relativeX < 0 ? Math.abs(relativeX) * leftReachBoost : 0;
    const lowerLeftReach = relativeX < 0 && relativeY > 0 ? Math.min(relativeY, 1) * downReachBoost : 0;

    eyeState.targetX = relativeX * maxX - leftReach;
    eyeState.targetY = relativeY * maxY * yMultiplier + lowerLeftReach;
    eyeState.targetLeftInner = relativeX < 0 ? -directionalConvergence * 0.35 : directionalConvergence;
    eyeState.targetRightInner = -directionalConvergence;

    scheduleEyes();
  };

  const resetEyes = () => {
    eyeState.targetX = 0;
    eyeState.targetY = 0;
    eyeState.targetLeftInner = 0;
    eyeState.targetRightInner = 0;
    scheduleEyes();
  };

  window.addEventListener("pointermove", updateEyeTarget, { passive: true });
  window.addEventListener("mousemove", updateEyeTarget, { passive: true });
  window.addEventListener("pointerleave", resetEyes);
  window.addEventListener("blur", resetEyes);
  scheduleBlink(900 + Math.random() * 1800);
}

const revealSections = document.querySelectorAll(".reveal-section");

if (revealSections.length && !prefersReducedMotion.matches) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealSections.forEach((section) => observer.observe(section));
} else {
  revealSections.forEach((section) => section.classList.add("is-visible"));
}
