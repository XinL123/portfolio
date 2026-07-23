const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-toggle");
const themeButton = document.querySelector(".pull-chain");
const orangeStage = document.querySelector(".orange-stage");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const HOME_LOGO_SKIP_KEY = "portfolio-logo-skip-intro";

// The Projects section lives in the home page (it is the target of the hero
// handoff), but it is addressed by its own url so it matches About / Resume /
// Playground instead of showing as index.html#work. /projects is a clean route
// served from this document by a server rewrite (vite.config.js / netlify.toml),
// so the url survives a refresh, a bookmark and a cross-page click; from the
// home page the nav swaps it in with pushState and never reloads. Keep this a
// clean, extensionless path — it is what the address bar shows verbatim.
const PROJECTS_PATH = "/projects";
const isProjectsUrl = () => /\/projects(\.html)?$/.test(window.location.pathname);

const navigationEntry = performance.getEntriesByType("navigation")[0];
const isPageReload = navigationEntry?.type === "reload";

if (isPageReload) {
  sessionStorage.removeItem(HOME_LOGO_SKIP_KEY);

  if (document.body.dataset.page === "home" && !isProjectsUrl()) {
    // 包括 index.html#work，刷新后也回到开场
    history.replaceState(null, "", window.location.pathname);
  } else {
    // 其他页面刷新后返回主页开场。/projects 是主页文档的虚拟路由，但对刷新的
    // 预期和 About/Resume 一样：回到主页开场（否则会停在 Projects 段、跳过开场，
    // URL 还停在 /projects —— 看起来像"没刷新")。直接访问/收藏 /projects 不受影响，
    // 那是 navigate 而非 reload。用干净的 "/"，不要 "index.html"，否则地址栏会
    // 停在 /index.html。
    window.location.replace("/");
  }
}

const THEME_KEY = "portfolio-theme";

const applyTheme = (theme) => {
  document.body.dataset.theme = theme;
  // keep <html> in sync with <body>: the head boot script stamps <html> before
  // first paint, and the html[data-theme="dark"] CSS keys off it — a stale
  // value there would fight the body theme after a pull-chain toggle
  document.documentElement.dataset.theme = theme;

  // Remembered for the rest of this visit, so navigating home -> about ->
  // playground keeps the choice. sessionStorage (not localStorage) on purpose:
  // it dies with the tab, and the <head> boot script also clears it on a
  // reload, so restarting the site always opens light with the intro lines.
  try {
    sessionStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    /* storage blocked (private mode) — the toggle still works for this view */
  }

  if (themeButton) {
    const isDark = theme === "dark";
    themeButton.setAttribute("aria-pressed", String(isDark));
    themeButton.setAttribute(
      "aria-label",
      isDark ? "Pull chain to switch to light mode" : "Pull chain to switch to dark mode"
    );
  }
};

// The <head> boot script already resolved the theme before first paint — the
// stored choice, or light if this load is a reload — and stamped it on <html>,
// with a script at the top of <body> mirroring it there. Adopt that decision
// instead of overriding it; forcing "light" here is what used to drop the theme
// on every navigation.
applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const SCROLLED_ENTER_Y = 48;
const SCROLLED_EXIT_Y = 12;
let scrollFrame = null;
let lockedScrollY = 0;
const caseHoverZone = document.querySelector(".case-hover-zone");
const CASE_NAV_HIDE_RATIO = 0.88;

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

if (caseHoverZone) {
  const syncCaseNav = () => {
    const isPastIntro = window.scrollY >= window.innerHeight * CASE_NAV_HIDE_RATIO;
    caseHoverZone.classList.toggle("is-past-intro", isPastIntro);
    caseHoverZone.classList.toggle("is-at-top", !isPastIntro);
  };

  syncCaseNav();
  window.addEventListener("scroll", syncCaseNav, { passive: true });
  window.addEventListener("resize", syncCaseNav);
}

const iterationsSection = document.querySelector(".iterations-section");

if (iterationsSection) {
  const iterationSteps = Array.from(iterationsSection.querySelectorAll(".iteration-step"));
  const beforeCopy = iterationsSection.querySelector(".iteration-before .iteration-copy p");
  const afterCopy = iterationsSection.querySelector(".iteration-after .iteration-copy p");
  let activeIterationIndex = -1;
  let iterationFrame = null;
  let iterationChangeTimer = null;

  const setActiveIteration = (nextIndex) => {
    const step = iterationSteps[nextIndex];
    if (!step || nextIndex === activeIterationIndex) return;

    activeIterationIndex = nextIndex;
    iterationsSection.dataset.activeIteration = String(nextIndex);
    iterationsSection.classList.add("is-iteration-changing");

    if (beforeCopy) beforeCopy.textContent = step.dataset.before || "";
    if (afterCopy) afterCopy.textContent = step.dataset.after || "";

    clearTimeout(iterationChangeTimer);
    iterationChangeTimer = window.setTimeout(() => {
      iterationsSection.classList.remove("is-iteration-changing");
    }, 180);
  };

  const syncActiveIteration = () => {
    iterationFrame = null;
    if (!iterationSteps.length) return;

    const viewportAnchor = window.innerHeight * 0.58;
    let closestIndex = 0;
    let closestDistance = Infinity;

    iterationSteps.forEach((step, index) => {
      const rect = step.getBoundingClientRect();
      const distance = Math.abs(rect.top - viewportAnchor);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIteration(closestIndex);
  };

  const requestIterationSync = () => {
    if (iterationFrame) return;
    iterationFrame = requestAnimationFrame(syncActiveIteration);
  };

  syncActiveIteration();
  window.addEventListener("scroll", requestIterationSync, { passive: true });
  window.addEventListener("resize", requestIterationSync);
}

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

  const setNavOpen = (isOpen) => {
    // Restoring the scroll position is how the phone menu's body-lock is undone,
    // so it may ONLY run when a lock was actually taken. Every .main-nav click
    // calls setNavOpen(false), including on desktop where the menu never opens —
    // there lockedScrollY is still 0, and restoring it yanked the page to the top
    // mid-click, fighting the smooth scroll to the section.
    const wasOpen = header.classList.contains("nav-open");

    header.classList.toggle("nav-open", isOpen);
    document.body.classList.toggle("nav-lock", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");

    if (isOpen) {
      lockedScrollY = window.scrollY;
      document.body.style.top = `-${lockedScrollY}px`;
      return;
    }

    if (!wasOpen) return; // nothing was locked; leave the scroll position alone

    document.body.style.top = "";
    window.scrollTo(0, lockedScrollY);
  };

  menuButton.addEventListener("click", () => {
    setNavOpen(!header.classList.contains("nav-open"));
  });

  header.querySelectorAll(".main-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      setNavOpen(false);
    });
  });
}

if (themeButton) {
  themeButton.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    // deliberately NOT persisted — the choice lasts only for this view; a refresh
    // returns to light (see applyTheme("light") on load above)
    themeButton.classList.remove("is-pulled");
    void themeButton.offsetWidth;
    themeButton.classList.add("is-pulled");
    applyTheme(nextTheme);
  });
}

if (header && !caseHoverZone) {
  let headerAutoHideTimer = null;

  const canAutoHideHeader = () =>
    !header.classList.contains("nav-open") &&
    !(document.body.dataset.page === "home" && !document.body.classList.contains("home-gallery-active") && document.body.classList.contains("home-opening-active"));

  const showHeaderFromTop = () => {
    if (!canAutoHideHeader()) return;
    header.classList.remove("is-auto-hidden");
    window.clearTimeout(headerAutoHideTimer);
    headerAutoHideTimer = window.setTimeout(() => {
      if (canAutoHideHeader()) header.classList.add("is-auto-hidden");
    }, 3400);
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.clientY <= 112) showHeaderFromTop();
    },
    { passive: true }
  );

  // touch devices have no pointermove hover — a tap near the top edge is the
  // same "reaching for the header" gesture
  window.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0];
      if (touch && touch.clientY <= 112) showHeaderFromTop();
    },
    { passive: true }
  );

  window.addEventListener("scroll", showHeaderFromTop, { passive: true });
  window.addEventListener("load", showHeaderFromTop);
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

const artYearGroups = Array.from(document.querySelectorAll(".art-year-group"));

if (artYearGroups.length) {
  artYearGroups.forEach((group) => {
    const count = group.querySelectorAll(".art-card.filled").length;
    group.classList.add(`art-count-${count}`);
  });

  if (prefersReducedMotion.matches) {
    artYearGroups.forEach((group) => group.classList.add("is-visible"));
  } else {
    let artFrame = null;

    const syncVisibleArtYear = () => {
      artFrame = null;
      const viewportCenter = window.innerHeight / 2;
      let closestGroup = artYearGroups[0];
      let closestDistance = Infinity;

      artYearGroups.forEach((group) => {
        const rect = group.getBoundingClientRect();
        const groupCenter = rect.top + rect.height / 2;
        const distance = Math.abs(groupCenter - viewportCenter);

        if (rect.bottom >= 0 && rect.top <= window.innerHeight && distance < closestDistance) {
          closestGroup = group;
          closestDistance = distance;
        }
      });

      artYearGroups.forEach((group) => {
        group.classList.toggle("is-visible", group === closestGroup);
      });
    };

    const requestArtSync = () => {
      if (artFrame) return;
      artFrame = requestAnimationFrame(syncVisibleArtYear);
    };

    syncVisibleArtYear();
    window.addEventListener("scroll", requestArtSync, { passive: true });
    window.addEventListener("resize", requestArtSync);
  }
}

if (orangeStage) {
  const leftEye = orangeStage.querySelector(".orange-eye-left");
  const rightEye = orangeStage.querySelector(".orange-eye-right");
  const eyes = [leftEye, rightEye].filter(Boolean);
  orangeStage.classList.add("has-random-blink");
  // Every px below is expressed in the coordinate system of a 360px-wide stage
  // (the desktop size). The stage shrinks with the screen — 35cqw of the collage
  // canvas on tablets, 52cqw on phones — so the whole rig is multiplied by
  // eyeScale = stage layout width / 360. Without it the pupils kept swinging the
  // full desktop 82px on a ~186px phone dome and flew off the orange.
  // The same factor is published as --eye-scale, which sizes the pupils and their
  // gap in CSS, so pupil size, spacing, resting spot and travel can never drift apart.
  const EYE_REF_STAGE_WIDTH = 360;
  const maxX = 82;
  const maxY = 62;
  const smoothness = 0.16;
  const convergence = 11;
  const leftReachBoost = 14;
  const downReachBoost = 8;
  const upBoost = 1.1;
  const downReduce = 0.85;
  const deadZone = 0.02;

  const neutralEyeX = -28;
  const neutralEyeY = 12;

  let eyeScale = 1;

  const syncEyeScale = () => {
    // offsetWidth is the LAYOUT width, unaffected by the stage's scale(0.72)
    // transform — correct, because the eye px live inside that same transform.
    // A hidden stage (display:none once the opening completes) measures 0; keep
    // the last good value rather than collapsing the rig to nothing.
    const width = orangeStage.offsetWidth;
    if (width <= 0) return;
    eyeScale = width / EYE_REF_STAGE_WIDTH;
    orangeStage.style.setProperty("--eye-scale", eyeScale.toFixed(4));
  };

  const restingEyeX = () => neutralEyeX * eyeScale;
  const restingEyeY = () => neutralEyeY * eyeScale;

  syncEyeScale();

  const eyeState = {
    currentX: restingEyeX(),
    currentY: restingEyeY(),
    currentLeftInner: 0,
    currentRightInner: 0,
    targetX: restingEyeX(),
    targetY: restingEyeY(),
    targetLeftInner: 0,
    targetRightInner: 0,
    frame: null,
    active: true
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomBlinkDelay = () => 2600 + Math.random() * 5200;

  let blinkTimer = null;

  let eyeTrackingEnabled = false;
  let eyeIdleTimer = null;

  let eyeStartTimer = null;
  
  const EYE_START_DELAY = 1000;
  const GALLERY_APPEAR_DURATION = 650;
  const EYE_IDLE_DELAY = 10000;

  const blinkOnce = () => {
    // while petted the eyes hold their happy ∩ squint — a blink animation
    // would override it with the round-eye keyframes for a frame and flash
    if (orangeStage.classList.contains("is-petted")) return;
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

  /* The gaze is a shy sideways notice, not a stare-follow: the pupils only
     engage inside a sensing bubble around the dome (~1.35× its box), and even
     then they travel at GAZE_SOFTEN of the old rig's range. Outside the
     bubble it drifts back to its resting look — "咦，它注意到我了" instead of
     cartoon eye-tracking. */
  const GAZE_SOFTEN = 0.5;
  const SENSE_RADIUS_FACTOR = 1.35;

  const updateEyeTarget = (event) => {

    if (!eyeTrackingEnabled) return;
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;

    const rect = orangeStage.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const senseRadius = Math.max(rect.width, rect.height) * SENSE_RADIUS_FACTOR;
    if (Math.hypot(event.clientX - centerX, event.clientY - centerY) > senseRadius) {
      // the hand is far away — lose interest and drift home
      window.clearTimeout(eyeIdleTimer);
      resetEyes();
      return;
    }

    let relativeX = (event.clientX - centerX) / (rect.width / 2);
    let relativeY = (event.clientY - centerY) / (rect.height / 2);

    relativeX = clamp(relativeX, -1, 1);
    relativeY = clamp(relativeY, -1, 1);

    if (Math.abs(relativeX) < deadZone) relativeX = 0;
    if (Math.abs(relativeY) < deadZone) relativeY = 0;

    const yMultiplier = relativeY < 0 ? upBoost : downReduce;
    const sideAmount = Math.abs(relativeX);
    const directionalConvergence = sideAmount * convergence * GAZE_SOFTEN;
    const leftReach = relativeX < 0 ? Math.abs(relativeX) * leftReachBoost : 0;
    const lowerLeftReach = relativeX < 0 && relativeY > 0 ? Math.min(relativeY, 1) * downReachBoost : 0;

    eyeState.targetX = (neutralEyeX + (relativeX * maxX - leftReach) * GAZE_SOFTEN) * eyeScale;
    eyeState.targetY = (neutralEyeY + (relativeY * maxY * yMultiplier + lowerLeftReach) * GAZE_SOFTEN) * eyeScale;
    eyeState.targetLeftInner =
      (relativeX < 0 ? -directionalConvergence * 0.35 : directionalConvergence) * eyeScale;
    eyeState.targetRightInner = -directionalConvergence * eyeScale;

    scheduleEyes();

    window.clearTimeout(eyeIdleTimer);
    
    eyeIdleTimer = window.setTimeout(() => {
      resetEyes();
    }, EYE_IDLE_DELAY);
    
  };

  const resetEyes = () => {
    eyeState.targetX = restingEyeX();
    eyeState.targetY = restingEyeY();
    eyeState.targetLeftInner = 0;
    eyeState.targetRightInner = 0;
    scheduleEyes();
  };

  // Watch the stage's own box rather than the window: the collage canvas is sized
  // off BOTH axes (svh feeds its width), and the first measurement above can land
  // before layout settles. A ResizeObserver catches the settle, every resize and a
  // rotation alike. Rescale whatever the pupils are currently doing, then re-aim at
  // the new resting spot — a resting orange would otherwise hold the old screen's
  // offset until the next pointer move.
  if (typeof ResizeObserver === "function") {
    let observedScale = eyeScale;

    const eyeStageObserver = new ResizeObserver(() => {
      syncEyeScale();
      if (eyeScale === observedScale) return;

      const ratio = observedScale > 0 ? eyeScale / observedScale : 1;
      observedScale = eyeScale;
      eyeState.currentX *= ratio;
      eyeState.currentY *= ratio;
      eyeState.currentLeftInner *= ratio;
      eyeState.currentRightInner *= ratio;
      resetEyes();
    });

    eyeStageObserver.observe(orangeStage);
  }

  const startEyeTrackingDelay = () => {
    eyeTrackingEnabled = false;
  
    window.clearTimeout(eyeStartTimer);
    window.clearTimeout(eyeIdleTimer);
  
    resetEyes();
  
    // 等面饼出现完成，再保持正视1秒
    eyeStartTimer = window.setTimeout(() => {
      eyeTrackingEnabled = true;
    }, GALLERY_APPEAR_DURATION + EYE_START_DELAY);
  };

  let wasGalleryActive =
  document.body.classList.contains("home-gallery-active");

const galleryClassObserver = new MutationObserver(() => {
  const isGalleryActive =
    document.body.classList.contains("home-gallery-active");

  // 面饼页面刚刚出现
  if (isGalleryActive && !wasGalleryActive) {
    startEyeTrackingDelay();
  }

  // 离开面饼页面
  if (!isGalleryActive && wasGalleryActive) {
    eyeTrackingEnabled = false;

    window.clearTimeout(eyeStartTimer);
    window.clearTimeout(eyeIdleTimer);

    resetEyes();
  }

  wasGalleryActive = isGalleryActive;
});

galleryClassObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ["class"]
});

// 确保初始正视位置生效
resetEyes();

if (wasGalleryActive) {
  startEyeTrackingDelay();
}

  window.addEventListener("pointermove", updateEyeTarget, { passive: true });
  window.addEventListener("mousemove", updateEyeTarget, { passive: true });
  window.addEventListener("pointerleave", () => {
    window.clearTimeout(eyeIdleTimer);
    resetEyes();
  });
  
  window.addEventListener("blur", () => {
    window.clearTimeout(eyeIdleTimer);
    resetEyes();
  });

  /* ---- the shy-little-creature driver ------------------------------------
     The cursor plays an invisible finger. The dome notices it from nearby
     (proximity gaze, softened travel), gives like dough when touched (hover
     press), quietly enjoys being petted (top rub → lean + slow ∩ eyes, one
     bashful heart if it goes on), and answers pokes with ONE small random
     reaction. Body deformations live on .orange-dough; eye expressions live
     on the stage. Nothing loops forever — idle life is sparse and one-shot. */
  const dough = orangeStage.querySelector(".orange-dough") || orangeStage;
  const vibeNote = document.querySelector(".home-vibe-note");

  const DOUGH_STATES = ["is-pressing", "is-petted", "is-hop", "is-twist", "is-flat", "is-pop", "is-held", "is-pounce", "is-spring", "is-breath"];
  const EYE_STATES = ["is-petted", "is-startled", "is-shy", "is-dead"];

  let reactionUntil = 0;      // while now < this, a click reaction owns the body
  let hoverCooldownUntil = 0; // re-entering the dome shouldn't machine-gun presses
  let suppressClickUntil = 0; // a long-press release must not read as a click
  let lastInteractionAt = 0;
  let photoSquished = false;  // a polaroid is parked on the dome (see listener below)

  const reactionTimers = new Set();
  const later = (fn, ms) => {
    const t = window.setTimeout(() => { reactionTimers.delete(t); fn(); }, ms);
    reactionTimers.add(t);
    return t;
  };

  const clearBody = () => {
    reactionTimers.forEach((t) => window.clearTimeout(t));
    reactionTimers.clear();
    DOUGH_STATES.forEach((c) => dough.classList.remove(c));
    EYE_STATES.forEach((c) => orangeStage.classList.remove(c));
    dough.style.removeProperty("--pet-lean");
    dough.style.removeProperty("--pet-dip");
  };

  const busy = () => performance.now() < reactionUntil;
  const petting = () => orangeStage.classList.contains("is-petted");

  /* the caption is part of the act: it can be nudged by the dome's bigger
     moves and briefly ventriloquised ("hehe :)" / "okay okay, I'm awake :)") */
  let noteTimer = null;
  const noteOriginal = vibeNote ? vibeNote.textContent : "";
  const setNote = (text, ms) => {
    if (!vibeNote || photoSquished) return; // squished: the caption is occupied
    window.clearTimeout(noteTimer);
    vibeNote.textContent = text;
    noteTimer = window.setTimeout(() => { vibeNote.textContent = noteOriginal; }, ms);
  };
  const nudgeNote = () => {
    if (!vibeNote) return;
    vibeNote.classList.remove("is-nudged");
    void vibeNote.offsetWidth;
    vibeNote.classList.add("is-nudged");
  };
  vibeNote?.addEventListener("animationend", () => vibeNote.classList.remove("is-nudged"));

  let lastHeartLeft = null;

  const spawnHeart = () => {
    if (prefersReducedMotion.matches) return;
    const heart = document.createElement("span");
    heart.className = "orange-heart";
    heart.textContent = "♥";
    // Hearts can now come in a run, so nudge one off its predecessor's column
    // rather than letting two stack in the same spot.
    let left = 18 + Math.random() * 64;
    if (lastHeartLeft !== null && Math.abs(left - lastHeartLeft) < 16) {
      left = 18 + ((left - 18 + 32) % 64);
    }
    lastHeartLeft = left;
    heart.style.left = `${left.toFixed(1)}%`;
    heart.style.rotate = `${(Math.random() * 28 - 14).toFixed(1)}deg`;
    // Overlapping hearts would drift in lockstep if they were identical, which
    // reads as cloned rather than drawn. Give each its own float length and
    // size so a cluster stays loose.
    heart.style.animationDuration = `${Math.round(880 + Math.random() * 300)}ms`;
    heart.style.fontSize = `calc(${(0.86 + Math.random() * 0.3).toFixed(2)} * 26px * var(--eye-scale, 1))`;
    orangeStage.appendChild(heart);
    heart.addEventListener("animationend", () => heart.remove());
  };

  /* ---- petting: rubbing the TOP of the dome. Strokes must change direction
     (a pass-through is not a pet); it leans a little toward the hand, eyes
     ease into the ∩, and everything springs back ~300ms after the hand stops.
     Rubs are horizontal, so on touch they stay under the opening's 60px
     vertical paging threshold. ---- */
  const PET_REVERSALS_NEEDED = 2;
  const PET_LINGER_MS = 300;
  const RUB_MIN_STEP = 3;      // px; below this is pointer jitter, not a stroke
  const HEART_AFTER_MS = 1600; // it only dares show the FIRST heart if this goes on

  /* Keeping it up earns more hearts, and rubbing briskly earns them sooner —
     but the pace is bounded at both ends and the run stops at a ceiling, so
     the stage never fills up.

     A heart's float lasts ~980ms, and BOTH gaps sit under that on purpose: the
     next heart is meant to be born while the previous one is still rising, so
     they overlap into a little drift. (An earlier pass had the slow gap at
     1300ms — longer than the float — which made gentle petting strictly one at
     a time: spawn, vanish, spawn.) Even the slow end now just overlaps; brisk
     rubbing stacks about three. Every value is per continuous pet; lifting the
     hand resets the run. */
  const HEART_GAP_SLOW = 820;   // barely moving — still a slight overlap
  const HEART_GAP_FAST = 300;   // brisk rubbing — ~3 adrift at once
  const HEART_MAX_PER_PET = 7;
  const RUB_SPEED_SLOW = 0.15;  // px/ms — below this counts as the slow end
  const RUB_SPEED_FAST = 0.9;   // px/ms — at or above this is full pace

  let petLingerTimer = null;
  let petHeartTimer = null;
  let lastRubX = null;
  let lastRubDir = 0;
  let rubReversals = 0;
  let heartsThisPet = 0;
  let rubSinceHeart = 0;  // px travelled since the last heart -> the next gap
  let lastHeartAt = 0;

  const stopPetting = () => {
    window.clearTimeout(petLingerTimer);
    window.clearTimeout(petHeartTimer);
    orangeStage.classList.remove("is-petted");
    dough.classList.remove("is-petted");
    dough.style.removeProperty("--pet-lean");
    dough.style.removeProperty("--pet-dip");
    lastRubX = null;
    lastRubDir = 0;
    rubReversals = 0;
    heartsThisPet = 0;
    rubSinceHeart = 0;
  };

  // Self-rescheduling so the run continues while the hand does; each gap is
  // measured from how briskly it was rubbed since the previous heart.
  const scheduleHeart = (delay) => {
    petHeartTimer = window.setTimeout(() => {
      if (!petting()) return;

      spawnHeart();
      heartsThisPet += 1;
      if (heartsThisPet >= HEART_MAX_PER_PET) return; // that is all it will ask for

      const now = performance.now();
      const speed = rubSinceHeart / Math.max(now - lastHeartAt, 1);
      rubSinceHeart = 0;
      lastHeartAt = now;

      const pace = clamp((speed - RUB_SPEED_SLOW) / (RUB_SPEED_FAST - RUB_SPEED_SLOW), 0, 1);
      scheduleHeart(HEART_GAP_SLOW + (HEART_GAP_FAST - HEART_GAP_SLOW) * pace);
    }, delay);
  };

  const startPetting = () => {
    if (busy() || petting() || photoSquished) return;
    clearBody();
    orangeStage.classList.add("is-petted");
    dough.classList.add("is-petted");
    heartsThisPet = 0;
    rubSinceHeart = 0;
    lastHeartAt = performance.now();
    scheduleHeart(HEART_AFTER_MS);
  };

  orangeStage.addEventListener("pointermove", (event) => {
    lastInteractionAt = performance.now();
    const rect = orangeStage.getBoundingClientRect();
    const x = event.clientX;
    const inTopZone = event.clientY < rect.top + rect.height * 0.55;

    if (inTopZone && lastRubX !== null && Math.abs(x - lastRubX) > RUB_MIN_STEP) {
      const dir = Math.sign(x - lastRubX);
      if (lastRubDir && dir !== lastRubDir) {
        rubReversals += 1;
        if (rubReversals >= PET_REVERSALS_NEEDED) startPetting();
      }
      lastRubDir = dir;
    }
    if (lastRubX === null || Math.abs(x - lastRubX) > RUB_MIN_STEP) {
      // Accumulate only on a real recorded step, so distance is counted once
      // per stroke segment rather than re-added on every jittery frame.
      if (petting() && lastRubX !== null) rubSinceHeart += Math.abs(x - lastRubX);
      lastRubX = x;
    }

    if (petting()) {
      // lean a touch toward the hand, dip under it — the dent of a soft press
      const rel = clamp((x - (rect.left + rect.width / 2)) / (rect.width / 2), -1, 1);
      dough.style.setProperty("--pet-lean", `${(rel * 2.2).toFixed(2)}deg`);
      dough.style.setProperty("--pet-dip", "0.975");
      window.clearTimeout(petLingerTimer);
      petLingerTimer = window.setTimeout(stopPetting, PET_LINGER_MS);
    }
  });

  orangeStage.addEventListener("pointerleave", stopPetting);

  /* ---- hover (mouse only): a finger pressing into soft dough — quick
     squash, two wobbles, a startled little blink, the caption sways ---- */
  orangeStage.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    const now = performance.now();
    lastInteractionAt = now;
    if (now < hoverCooldownUntil || busy() || petting() || photoSquished) return;
    hoverCooldownUntil = now + 900;
    dough.classList.remove("is-pressing");
    void dough.offsetWidth;
    dough.classList.add("is-pressing");
    blinkOnce();
    nudgeNote();
  });

  /* ---- long-press: slowly squished under the finger; release = spring back.
     (The touch mapping for hover, mostly — but a held mouse works too.) ---- */
  let holdTimer = null;
  let holdActive = false;
  let pressStart = null;

  const releaseHold = () => {
    window.clearTimeout(holdTimer);
    holdTimer = null;
    if (holdActive) {
      holdActive = false;
      dough.classList.remove("is-held");
      dough.classList.add("is-pop");
      suppressClickUntil = performance.now() + 300;
    }
  };

  orangeStage.addEventListener("pointerdown", (event) => {
    lastInteractionAt = performance.now();
    pressStart = { x: event.clientX, y: event.clientY };
    window.clearTimeout(holdTimer);
    holdTimer = window.setTimeout(() => {
      if (pressStart && !petting() && !busy() && !photoSquished) {
        holdActive = true;
        clearBody();
        dough.classList.add("is-held");
      }
    }, 380);
  });

  orangeStage.addEventListener("pointermove", (event) => {
    if (pressStart && Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > 10) {
      window.clearTimeout(holdTimer); // moving finger = a rub, not a hold
    }
  });

  orangeStage.addEventListener("pointerup", () => {
    pressStart = null;
    releaseHold();
  });

  orangeStage.addEventListener("pointercancel", () => {
    pressStart = null;
    releaseHold();
    stopPetting();
  });

  /* ---- click: ONE small random reaction — startled, shy, or playing dead.
     Rapid clicking instead packs it flatter, and the third press wakes it
     ("okay okay, I'm awake :)"). ---- */
  let lastClickAt = -1e6;
  let clickChain = 0;
  let lastReaction = -1;

  const reactStartled = () => {
    reactionUntil = performance.now() + 700;
    orangeStage.classList.add("is-startled");
    dough.classList.add("is-hop");
    later(() => orangeStage.classList.remove("is-startled"), 380);
  };

  const reactShy = () => {
    reactionUntil = performance.now() + 1000;
    orangeStage.classList.add("is-shy");
    dough.classList.add("is-twist");
    setNote("hehe :)", 1200);
    later(() => orangeStage.classList.remove("is-shy"), 1000);
  };

  const reactPlayDead = () => {
    reactionUntil = performance.now() + 1100;
    orangeStage.classList.add("is-dead");
    dough.classList.add("is-flat");
    later(() => {
      orangeStage.classList.remove("is-dead");
      dough.classList.remove("is-flat");
      dough.classList.add("is-pop"); // ...and suddenly it's fine again
    }, 700);
  };

  const reactions = [reactStartled, reactShy, reactPlayDead];

  orangeStage.addEventListener("click", (event) => {
    const now = performance.now();
    if (now < suppressClickUntil) return;
    if (photoSquished) { nudgeNote(); return; } // pinned — only the caption sways
    lastInteractionAt = now;
    clickChain = now - lastClickAt < 650 ? clickChain + 1 : 1;
    lastClickAt = now;

    // every poke: the eyes dart to the poking finger (soft range, quick lerp)
    if (Number.isFinite(event.clientX)) {
      const rect = orangeStage.getBoundingClientRect();
      const relX = clamp((event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2), -1, 1);
      const relY = clamp((event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2), -1, 1);
      eyeState.targetX = (neutralEyeX + relX * maxX * 0.5) * eyeScale;
      eyeState.targetY = (neutralEyeY + relY * maxY * 0.5) * eyeScale;
      scheduleEyes();
    }

    /* second quick poke — "被戳到后突然弹起": squash 100ms, pop up 16px with a
       mid-air tilt, land, two soft jiggles; both eyes blink on landing and the
       caption blurts "hey! :)" for a moment. Interrupting whatever reaction
       click 1 started is the point — this IS the follow-up. */
    if (clickChain === 2) {
      clearBody();
      stopPetting();
      dough.classList.add("is-pounce");
      setNote("hey! :)", 900);
      later(blinkOnce, 500); // lands at ~500ms into the 800ms arc
      reactionUntil = now + 850;
      return;
    }
    if (clickChain >= 3) {
      clearBody();
      dough.classList.add("is-spring");
      setNote("okay okay, I'm awake :)", 2000);
      blinkOnce();
      clickChain = 0;
      reactionUntil = now + 800;
      return;
    }

    if (busy() || petting()) return;
    clearBody();
    let pick = Math.floor(Math.random() * reactions.length);
    if (pick === lastReaction) pick = (pick + 1) % reactions.length; // don't repeat
    lastReaction = pick;
    reactions[pick]();
  });

  /* finished one-shots drop their class */
  dough.addEventListener("animationend", (event) => {
    if (event.target !== dough) return;
    if (["dough-press", "dough-hop", "dough-twist", "dough-pop", "dough-pounce", "dough-spring", "dough-breath"].includes(event.animationName)) {
      dough.classList.remove("is-pressing", "is-hop", "is-twist", "is-pop", "is-pounce", "is-spring", "is-breath");
    }
  });

  /* A finished blink must drop its class: orange-blink-once fills `both`,
     and a filled animation outranks normal rules in the cascade — leaving
     .is-blinking on would pin the eyes round forever and silently veto every
     squint/expression. Its last keyframe equals the resting look, so removing
     the class here changes nothing visually. */
  orangeStage.addEventListener("animationend", (event) => {
    if (event.animationName === "orange-blink-once") {
      event.target.classList.remove("is-blinking");
    }
  });

  /* ---- idle life: every 3–6s, IF nobody has touched it lately — one soft
     breath, or a glance toward the photos at its sides. One-shots only;
     constant floating would read as page decoration, not a creature. ---- */
  const IDLE_QUIET_MS = 4000;
  let idleTimer = null;

  const idleTick = () => {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      const quiet = performance.now() - lastInteractionAt > IDLE_QUIET_MS;
      const onStage = document.body.classList.contains("home-gallery-active");
      if (
        quiet && onStage && !busy() && !petting() && !holdActive && !photoSquished &&
        document.visibilityState === "visible" && !prefersReducedMotion.matches
      ) {
        if (Math.random() < 0.55) {
          dough.classList.add("is-breath");
        } else {
          const side = Math.random() < 0.5 ? -1 : 1;
          eyeState.targetX = (neutralEyeX + side * maxX * 0.35) * eyeScale;
          eyeState.targetY = (neutralEyeY - 6) * eyeScale;
          scheduleEyes();
          later(resetEyes, 900);
        }
      }
      idleTick();
    }, 3200 + Math.random() * 3000);
  };
  idleTick();

  /* ---- photo squish: a dragged polaroid covering the dome. The polaroid
     drag module (bottom of this file) measures coverage and dispatches
     "orange-photo-squish" when it crosses the enter/exit thresholds. This is
     STATE, not a timed reaction: a photo parked on the dome keeps the
     creature pressed flat and quietly protesting until it is moved away —
     then it pops straight back and gets its caption back. ---- */
  const SQUISH_NOTE = "Hey! You're squishing me!";
  window.addEventListener("orange-photo-squish", (event) => {
    const on = !!(event.detail && event.detail.squished);
    if (on === photoSquished) return;

    if (on) {
      stopPetting();
      clearBody();
      reactionUntil = 0;
      photoSquished = true; // after clearBody/setNote paths, before the swap
      dough.classList.add("is-photo-squish");
      orangeStage.classList.add("is-photo-squish");
      window.clearTimeout(noteTimer);
      if (vibeNote) vibeNote.textContent = SQUISH_NOTE;
      nudgeNote(); // the caption sways as the weight lands
    } else {
      photoSquished = false;
      dough.classList.remove("is-photo-squish");
      orangeStage.classList.remove("is-photo-squish");
      dough.classList.add("is-pop"); // freed — pops back like after play-dead
      window.clearTimeout(noteTimer);
      if (vibeNote) vibeNote.textContent = noteOriginal;
    }
  });

  scheduleBlink(900 + Math.random() * 1800);
}

const revealSections = document.querySelectorAll(".reveal-section");
const workRevealSection = document.querySelector(".work-section.reveal-section");
const workScene = document.querySelector(".work-section .pc-scene");
const workCards = Array.from(document.querySelectorAll('body[data-page="home"] .work-card'));
const aboutPhotoWalls = Array.from(document.querySelectorAll('body[data-page="about"] .photo-wall.reveal-section'));
const homeIntroScreens = Array.from(document.querySelectorAll('body[data-page="home"] .home-intro-screen'));
const homeGalleryScreen = document.querySelector('body[data-page="home"] .home-gallery-screen');

const isHomePage = document.body.dataset.page === "home";

// The opening choreography's Work-arrival fn is defined deep inside the opening
// block (which only runs when there ARE intro/gallery screens and motion is
// allowed). Expose it here so the Work-nav interceptor below can reach it in
// every state — the interceptor must NOT live inside that block, or it silently
// stops working whenever the block is skipped (reduced motion, etc.).
let goToWorkSectionRef = null;

const shouldStartAtHomeGallery =
  isHomePage && window.location.hash === "#home";

// 必须先判断 Work
// /projects is served from this very document by a server rewrite (see
// vite.config.js / netlify.toml), so arriving there is just "the home page
// loaded at the Projects url" — jump straight to the section. #work is still
// honoured so older links and the case-study back-link keep working.
const shouldStartAtWork =
  isHomePage && (isProjectsUrl() || window.location.hash === "#work");

// 进入 Work 时，清除可能残留的 Logo 状态
if (shouldStartAtWork) {
  sessionStorage.removeItem(HOME_LOGO_SKIP_KEY);
}

const shouldSkipIntroFromLogo =
  isHomePage &&
  !shouldStartAtWork &&
  sessionStorage.getItem(HOME_LOGO_SKIP_KEY) === "1";

if (shouldSkipIntroFromLogo) {
  sessionStorage.removeItem(HOME_LOGO_SKIP_KEY);
  history.replaceState(null, "", window.location.pathname);
}

const shouldResetHomeScroll =
  document.body.dataset.page === "home" &&
  !window.location.hash &&
  // "no hash" used to be enough to mean "opened at the top". Now the home
  // document is also served at /projects, which carries no hash either — and
  // there the visitor asked for the section, not the opening. Without this the
  // reset branch below wins the if/else chain and shouldStartAtWork never runs.
  !shouldStartAtWork &&
  !shouldSkipIntroFromLogo;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

const syncVisibleWorkCards = () => {
  if (!workCards.length) return;

  if (prefersReducedMotion.matches) {
    workCards.forEach((card) => card.classList.add("is-visible"));
    return;
  }

  // Scroll-SCRUBBED reveal: a card's opacity/lift is a pure function of where it
  // sits in the viewport, so a card never moves on its own — no triggered pop,
  // no bounce while scrolling. Scroll down and it eases in exactly in step with
  // the wheel; stop and it freezes; scroll back and it scrubs back out. Once a
  // card is fully in, it is handed back to the stock .is-visible styles (hover
  // lift etc.) and stays revealed while scrolling on up and out.
  const vh = window.innerHeight;
  const enterLine = vh * 0.92;  // reveal starts here
  const settleLine = vh * 0.66; // fully revealed by here

  // While the opening-completion landing is being scrubbed, the whole section
  // carries a temporary translateY. Measure cards as if the section were already
  // at rest, otherwise below-fold cards read ~a screen lower and flash after landing.
  let glideY = 0;
  if (workRevealSection) {
    const t = getComputedStyle(workRevealSection).transform;
    if (t && t !== "none") {
      const m = t.match(/matrix\(([^)]+)\)/);
      if (m) glideY = parseFloat(m[1].split(",")[5]) || 0;
    }
  }

  workCards.forEach((card) => {
    const top = card.getBoundingClientRect().top - glideY;
    const progress = Math.max(0, Math.min(1, (enterLine - top) / (enterLine - settleLine)));

    if (progress >= 1) {
      card.classList.add("is-visible");
      card.style.removeProperty("opacity");
      card.style.removeProperty("transform");
      card.style.removeProperty("transition");
    } else {
      card.classList.remove("is-visible");
      card.style.transition = "none"; // scrubbed by scroll, never animated
      card.style.opacity = progress.toFixed(3);
      card.style.transform = `translateY(${((1 - progress) * 20).toFixed(1)}px)`;
    }
  });
};

// The clothesline scene used to fade out as it rose off the top of the screen —
// a leftover of the era when the work section PINNED and the studio panel slid
// up over it: pinned content sits still, so it needed a fade to leave. The page
// is now one continuous canvas that simply scrolls, and a camera pan does not
// dissolve its scenery: the scene stays fully solid and just travels out of
// frame, so the clothesline is still crisp at the seam where the horizon line
// and the peeking orange appear. (An earlier fade-IN branch was removed for the
// same reason — it re-dimmed the scene right after the opening delivered it.)
// Kept as a function so every call site stays valid and any stale inline
// opacity from an interrupted state gets cleared.
const syncWorkSceneFade = () => {
  if (!workScene) return;
  if (workScene.style.opacity) workScene.style.removeProperty("opacity");
};

const syncVisibleAboutPhotoWall = () => {
  if (!aboutPhotoWalls.length) return;
  const viewportCenter = window.innerHeight / 2;
  let closestWall = null;
  let closestDistance = Infinity;

  aboutPhotoWalls.forEach((wall) => {
    const rect = wall.getBoundingClientRect();
    const wallCenter = rect.top + rect.height / 2;
    const distance = Math.abs(wallCenter - viewportCenter);

    if (rect.bottom >= 0 && rect.top <= window.innerHeight && distance < closestDistance) {
      closestWall = wall;
      closestDistance = distance;
    }
  });

  aboutPhotoWalls.forEach((wall) => {
    wall.classList.toggle("is-visible", wall === closestWall);
  });
};

if (homeIntroScreens.length && homeGalleryScreen && !prefersReducedMotion.matches) {
  const introLines = Array.from(document.querySelectorAll('body[data-page="home"] .intro-line'));
  let activeIntroIndex = 0;
  let isIntroPaging = false;
  // True once the opening has scheduled its first intro-line write. The late
  // `load`/`pageshow` re-reset (below) keys off this so it can never wipe a
  // first line that is mid-lead-in: writeIntroLine blanks the line for its
  // ~300ms+font-wait run-up BEFORE any hw-* class exists, and a reset landing
  // in that window (heavy hero video delays `load` to ~2.4s, right into it)
  // restarts the line and can lose the animation to the plain-text fail-safe.
  let openingArmed = false;
  let introTypingTimer = null;
  let introDoneTimer = null;
  let introRaf = null;
  let hwGeneration = 0; // invalidates in-flight stroke builds when paging away
  let hwIdCounter = 0;  // unique <mask> ids across rebuilds
  let galleryProgress = 0;
  let homeRevealProgress = 0;
  let galleryArmed = false;
  let galleryReadyAt = 0;
  let headerHideTimer = null;
  const GALLERY_PROGRESS_MAX = 1.9;
  const GALLERY_RELEASE_PROGRESS = 1.86;
  // Progress below which the page paints nothing. The handoff maths below is
  // `(progress - 1 - 0.12) / 0.74`, so the transition only starts at 1.12 —
  // everything under it belonged to the deleted collage reveal. Derived from
  // those same numbers so the two can never drift apart.
  const HANDOFF_START = 0.12;
  const HANDOFF_SPAN = 0.74;
  const HANDOFF_FLOOR = 1 + HANDOFF_START;

  const clearHomeHandoffVars = () => {
    document.documentElement.style.removeProperty("--home-work-section-opacity");
    document.documentElement.style.removeProperty("--home-work-section-y");
    document.documentElement.style.removeProperty("--home-work-fixed-top");
    document.documentElement.style.removeProperty("--home-hero-exit-y");
    document.documentElement.style.removeProperty("--home-hero-exit-o");
  };

  // Lightweight flight recorder for the opening choreography. If an arrival
  // artifact shows up on a real device, run  copy(__openingTrace)  in DevTools
  // and share the paste — every state change that can move the section is here.
  const openingTrace = [];
  window.__openingTrace = openingTrace;
  const traceOpening = (tag, data) => {
    if (openingTrace.length > 300) openingTrace.splice(0, 150);
    openingTrace.push(Object.assign({ t: Math.round(performance.now()), tag }, data));
  };

  // Where the work section will sit (viewport top, scroll 0) once the opening
  // completes. Measured via a synchronous hidden probe — the class flip, read
  // and restore all happen inside one JS turn, so nothing is ever painted.
  // The handoff drives the fixed preview DOWN TO this exact position, so the
  // fixed→in-flow switch at completion is pixel-identical (no FLIP glide,
  // no bounce, no "second" projects section).
  let workLandedTop = null;
  const measureWorkLandedTop = () => {
    if (!workRevealSection) return 0;
    const b = document.body;
    const had = ["home-opening-active", "home-gallery-active", "home-gallery-revealing", "home-work-handoff"]
      .filter((cls) => b.classList.contains(cls));
    const hadComplete = b.classList.contains("home-opening-complete");
    const hadVisible = workRevealSection.classList.contains("is-visible");
    // Suppress every transition/animation for the round trip: the class flip
    // changes computed values across the page, and without this the restore
    // recalc would START real 300-500ms transitions from the probed values —
    // a visible one-frame "other version" flash right as the handoff begins.
    b.classList.add("home-probe");
    b.classList.remove(...had);
    b.classList.add("home-opening-complete");
    workRevealSection.classList.add("is-visible");
    const top = workRevealSection.getBoundingClientRect().top + window.scrollY;
    if (!hadVisible) workRevealSection.classList.remove("is-visible");
    if (!hadComplete) b.classList.remove("home-opening-complete");
    if (had.length) b.classList.add(...had);
    void b.offsetHeight; // commit the restore while transitions are still off
    b.classList.remove("home-probe");
    return top;
  };


  const getWorkHandoffViewportY = () => {
    const styles = getComputedStyle(document.documentElement);
    const y = Number.parseFloat(styles.getPropertyValue("--home-work-section-y"));
    const handoffTop = Math.min(window.innerHeight * 0.64, 700);
    return handoffTop + (Number.isFinite(y) ? y : 0);
  };

  const stopIntroWriting = () => {
    window.clearTimeout(introTypingTimer);
    window.clearTimeout(introDoneTimer);
    if (introRaf) window.cancelAnimationFrame(introRaf);
    introRaf = null;
    hwGeneration += 1; // orphan any pending stroke build / completion
  };

  /* Handwriting reveal (replaces the old per-character typewriter).
     Each glyph sits in its own inline-block and is wiped in left-to-right
     inside its own box; because a glyph's wipe (INK_GLYPH_MS) lasts far longer
     than the gap between two glyph starts, three-ish letters are always mid-
     stroke at once, so the ink reads as one continuous line rather than
     characters popping in. Words keep their own wrapper so a wrap can still
     only happen at a space.

     Splitting the sentence this way was measured against the plain text node
     first: it moves the line width by 0.12px on the longest sentence (Gaegu
     carries essentially no kerning pairs), so size, centring and the
     responsive layout are unchanged. */
  const INK_GLYPH_MS = 160;   // how long one glyph takes to be wiped in
  const INK_PER_CHAR = 46;    // nominal pen speed
  const INK_MIN_SPAN = 900;
  const INK_MAX_SPAN = 1700;
  // Pen speed is defined directly and then integrated into per-glyph start
  // times, rather than easing the times themselves — easing time with a
  // smoothstep does the opposite of what it reads like (its derivative is zero
  // at the ends, which makes the pen fastest exactly where it should be
  // slowest). Speed is 1 at both ends and 1 + INK_SWELL across the middle.
  const INK_SWELL = 0.85;

  // Dwell AFTER a character, in ms — the small hesitations a hand makes at a
  // turn. Punctuation rests longest, a word gap barely at all.
  const inkPauseAfter = (ch) => {
    if (ch === ",") return 90;
    if (ch === "." || ch === "!" || ch === "?") return 130;
    if (ch === "@") return 60;
    if (ch === " ") return 30;
    return 0;
  };

  const writeIntroLineGlyphs = (line) => {
    if (!line) return;
    const text = line.dataset.text || "";
    stopIntroWriting();

    line.classList.remove("is-writing", "is-done");
    line.innerHTML = "";

    // Build word wrappers -> glyph spans, and collect the glyphs in reading
    // order so the timing below follows the eye across a wrapped line too.
    const glyphs = [];
    let word = null;
    for (const ch of text) {
      if (!word) {
        word = document.createElement("span");
        word.className = "ink-w";
        line.appendChild(word);
      }
      const span = document.createElement("span");
      span.className = "ink-c";
      span.textContent = ch;
      word.appendChild(span);
      glyphs.push({ span, ch });
      if (ch === " ") word = null; // next word starts its own wrapper
    }
    if (!glyphs.length) return;

    const n = glyphs.length;
    const span = Math.max(INK_MIN_SPAN, Math.min(INK_MAX_SPAN, n * INK_PER_CHAR));

    // Integrate 1/speed across the sentence to get each glyph's start offset:
    // wide gaps where the pen is slow, tight gaps where it runs.
    const offsets = [];
    let acc = 0;
    for (let i = 0; i < n; i += 1) {
      offsets.push(acc);
      acc += 1 / (1 + INK_SWELL * Math.sin((Math.PI * (i + 0.5)) / n));
    }
    const norm = acc || 1;

    let pause = 0;
    glyphs.forEach((g, i) => {
      const at = (span * offsets[i]) / norm + pause;
      g.span.style.transitionDelay = `${Math.round(at)}ms`;
      pause += inkPauseAfter(g.ch);
    });
    const total = span + pause + INK_GLYPH_MS;

    // Commit the hidden start state, then let the transitions run next frame.
    void line.offsetWidth;

    introTypingTimer = window.setTimeout(() => {
      line.classList.add("is-writing");
      introDoneTimer = window.setTimeout(() => {
        // Drop the per-glyph delays once the sentence is written, so the line
        // can never re-stagger if it is repainted while resting.
        glyphs.forEach((g) => g.span.style.removeProperty("transition-delay"));
        line.classList.add("is-done");
      }, total + 40);
    }, 300);
  };

  /* Sentence-level ink reveal — no per-glyph boxes at all.
     The line is split ONLY at the browser's own wrap points, and each visual
     line gets one mask (see .ink-line in styles.css) whose soft elliptical
     head is walked across it by rAF. Nothing per-letter is scheduled, so
     there are no vertical seams to line up.
     Duration comes from the line's real rendered width, so a short line is
     not dragged out to the same length as a long one. */
  const INK_HEAD_PX = 26;        // soft leading edge, matches --ink-head
  const INK_SPEED_PX_MS = 0.24;  // nominal pen speed across the text, px/ms
  const INK_LINE_MIN_MS = 620;
  const INK_LINE_MAX_MS = 2100;
  const INK_LINE_GAP_MS = 110;   // pen travelling back for the next visual line
  const INK_EASE_W = 0.72;       // 0 = constant speed, 1 = full smoothstep
  // Handwriting cadence. A featureless constant sweep reads as a gradient
  // wipe; what the eye recognises as writing is the RHYTHM of the pen —
  // surging through a word, easing off as it finishes, hopping the space.
  const INK_SURGE_AMP = 0.35;    // stroke-scale speed swell inside words
  const INK_SURGE_LEN = 1.7;     // ...with a wavelength of ~1.7 glyph widths
  const INK_WORD_DWELL = 0.45;   // finishing a word: the pen slows to 45%...
  const INK_DWELL_PX = 6;        // ...over its last few px
  const INK_GAP_HOP = 1.9;       // then hops the space at 190%
  const INK_SETTLE_MS = 240;     // line end: last stroke + drying glide out
  const INK_DRY_PX = 96;         // matches --ink-dry in styles.css

  const writeIntroLineInk = (line) => {
    if (!line) return;
    const text = line.dataset.text || "";
    stopIntroWriting();

    line.classList.remove("is-writing", "is-done");
    line.innerHTML = "";

    // 1. Lay the words out inline and let the browser choose the wrap points.
    const words = text.split(" ").filter(Boolean);
    const probes = words.map((w, i) => {
      const s = document.createElement("span");
      s.textContent = w;
      line.appendChild(s);
      if (i < words.length - 1) line.appendChild(document.createTextNode(" "));
      return s;
    });

    // 2. Group the words by the visual line they landed on.
    const groups = [];
    probes.forEach((s, i) => {
      const top = Math.round(s.getBoundingClientRect().top);
      const last = groups[groups.length - 1];
      if (last && last.top === top) last.words.push(words[i]);
      else groups.push({ top, words: [words[i]] });
    });

    // 3. Rebuild as one block per visual line. Words are never split, and each
    //    block re-centres exactly where the wrapped line already sat.
    line.innerHTML = "";
    const plan = groups.map((g) => {
      const el = document.createElement("span");
      el.className = "ink-line";
      el.textContent = g.words.join(" ");
      line.appendChild(el);
      return el;
    }).map((el) => {
      // Sweep between the TEXT edges, not the block edges: the block is full
      // width because the line is centred.
      const box = el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      const t = range.getBoundingClientRect();
      const from = t.left - box.left - INK_HEAD_PX * 1.6;
      const to = t.right - box.left + INK_HEAD_PX * 0.6;
      const dur = Math.max(
        INK_LINE_MIN_MS,
        Math.min(INK_LINE_MAX_MS, (t.width || 1) / INK_SPEED_PX_MS)
      );

      // Where each word sits, in px — the cadence table is built from these.
      const node = el.firstChild;
      const words = [];
      const re = /\S+/g;
      let m;
      while ((m = re.exec(el.textContent))) {
        const wr = document.createRange();
        wr.setStart(node, m.index);
        wr.setEnd(node, m.index + m[0].length);
        const b = wr.getBoundingClientRect();
        words.push({ l: b.left - box.left, r: b.right - box.left });
      }

      // Precompute time-per-pixel: dwell at word endings, hop across spaces,
      // and a stroke-scale surge inside words. Integrating 1/speed gives a
      // cumulative table the rAF loop can walk — the overall duration stays
      // exactly `dur` because the table is normalised against its own total.
      const glyphW = Math.max(7, t.width / Math.max(el.textContent.length, 1));
      const phase = Math.random() * Math.PI * 2;
      const cols = Math.max(2, Math.ceil(to - from));
      const cum = new Float32Array(cols);
      let acc = 0;
      for (let i = 0; i < cols; i += 1) {
        const x = from + i;
        let zone = INK_GAP_HOP; // outside every word: the pen hops
        for (const w of words) {
          if (x < w.l) break;
          if (x <= w.r) {
            zone = w.r - x <= INK_DWELL_PX ? INK_WORD_DWELL : 1;
            break;
          }
        }
        const surge = 1 + INK_SURGE_AMP * Math.sin(((Math.PI * 2) * i) / (glyphW * INK_SURGE_LEN) + phase);
        acc += 1 / (zone * surge);
        cum[i] = acc;
      }

      el.style.setProperty("--ink-x", `${from}px`);
      return { el, from, to, dur, cum, total: acc, ptr: 0 };
    });
    if (!plan.length) return;

    // Position over time: eased so the pen starts gently, runs through the
    // middle and settles at the end. (Easing POSITION is the right way round —
    // easing the per-glyph TIMES inverted it.)
    const ease = (x) => {
      const s = x * x * (3 - 2 * x);
      return x + (s - x) * INK_EASE_W;
    };

    let li = 0;
    let startedAt = 0;
    let settleStart = 0;
    const step = (now) => {
      const cur = plan[li];

      if (settleStart) {
        // Line finished: glide the head off past the drying run so the last
        // glyph and the wet trail reach full ink smoothly — never a pop when
        // the mask is finally dropped.
        const s = Math.min(1, (now - settleStart) / INK_SETTLE_MS);
        const out = 1 - (1 - s) * (1 - s);
        cur.el.style.setProperty("--ink-x", `${(cur.to + (INK_DRY_PX + 20) * out).toFixed(1)}px`);
        if (s < 1) {
          introRaf = window.requestAnimationFrame(step);
          return;
        }
        settleStart = 0;
        li += 1;
        if (li >= plan.length) {
          introRaf = null;
          line.classList.add("is-done"); // drops the masks entirely
          return;
        }
        startedAt = 0;
        introDoneTimer = window.setTimeout(() => {
          introRaf = window.requestAnimationFrame(step);
        }, INK_LINE_GAP_MS);
        return;
      }

      if (!startedAt) startedAt = now;
      const t = Math.min(1, (now - startedAt) / cur.dur);
      // Macro pacing (slow start / quicker middle / soft finish) picks the
      // point in the cadence table; the table supplies the local rhythm.
      const target = ease(t) * cur.total;
      while (cur.ptr < cur.cum.length - 1 && cur.cum[cur.ptr] < target) cur.ptr += 1;
      const x = cur.from + cur.ptr;
      cur.el.style.setProperty("--ink-x", `${x.toFixed(1)}px`);
      // barely-there drift so the head is not mechanically level
      cur.el.style.setProperty("--ink-y", `calc(50% + ${(Math.sin((x - cur.from) / 34) * 2).toFixed(2)}px)`);

      if (t < 1) {
        introRaf = window.requestAnimationFrame(step);
        return;
      }
      settleStart = now;
      introRaf = window.requestAnimationFrame(step);
    };

    void line.offsetWidth;
    introTypingTimer = window.setTimeout(() => {
      line.classList.add("is-writing");
      introRaf = window.requestAnimationFrame(step);
    }, 300);
  };

  /* ---- Sentence 1 proof of concept: stroke-order handwriting -------------
     Not a travelling mask. Each glyph carries hand-authored CENTERLINE
     writing strokes — the path a pen takes through the middle of the letter,
     NOT the font outline — stored in a normalized per-character cell and
     mapped onto that character's measured box at runtime. The strokes sit in
     a per-character SVG <mask> over an SVG copy of the same Gaegu text and
     grow via stroke-dashoffset in real writing order (left stem, right stem,
     crossbar; stem then dot). The Gaegu glyph appears only where its pen
     stroke has passed. One mask per character, so a wide pen pass can never
     leak onto a neighbouring letter. When the last stroke lands the overlay
     is removed and the plain HTML text remains. ---- */
  const HW_SPEED_PX_MS = 0.34;  // pen speed along a stroke
  const HW_STROKE_GAP_MS = 29;  // pen-lift between strokes of one letter
  const HW_LETTER_GAP_MS = 36;  // travel to the next letter
  // Sentence-level pacing: the hand eases in, runs through the middle and
  // settles at the end. 0 = constant pace, 1 = full smoothstep. Warping is a
  // pure time remap, so the total duration is unchanged by it.
  const HW_MACRO_EASE = 0.55;
  // Bounded font wait before writing with the currently-rendered face instead
  // (hard refresh: Gaegu re-downloads and may be slow or blocked entirely).
  const HW_FONT_WAIT_MS = 1800;
  const HW_BASE = 0.78;         // baseline depth the recipes are drawn against

  /* Coordinates: x is 0..1 across the character's advance box; y is 0..1 down
     its inline box, with 0.24 ≈ cap height, 0.40 ≈ x-height and HW_BASE the
     baseline (rescaled to the font's real baseline at build time). Strokes
     are dense polylines — the glyph itself supplies the true curves, the
     stroke only has to pass over them in writing order. */
  const HW_RECIPES = {
    /* H is written 竖-横-竖 (left stem, crossbar, right stem — per Xin).
       The crossbar path stops SHORT of the right stem: the pen is a few px
       wide, so a bar swept all the way across would reveal a chunk of the
       not-yet-written right stem at mid-height. The bar's last bit of ink at
       the right junction is laid by the right stem's own pass instead, which
       reads as the strokes joining rather than as residue. */
    H: [
      [[0.20, 0.24], [0.17, 0.78]],
      [[0.15, 0.52], [0.58, 0.505]],
      [[0.80, 0.24], [0.83, 0.78]],
    ],
    i: [
      [[0.50, 0.40], [0.50, 0.78]],
      [[0.50, 0.24], [0.53, 0.27]],
    ],
    ",": [[[0.56, 0.72], [0.52, 0.82], [0.42, 0.90]]],
    I: [[[0.50, 0.215], [0.50, 0.795]]],
    "'": [[[0.51, 0.155], [0.45, 0.315]]],
    m: [
      [[0.13, 0.40], [0.13, 0.78]],
      [[0.13, 0.52], [0.18, 0.41], [0.28, 0.37], [0.38, 0.42], [0.44, 0.53], [0.45, 0.78]],
      [[0.45, 0.52], [0.52, 0.41], [0.62, 0.37], [0.74, 0.42], [0.81, 0.53], [0.83, 0.78]],
    ],
    /* X: two plain crossing strokes, ON PURPOSE. A zoned version that held
       the crossing back for the second pass left a visible bite in the first
       diagonal (user 2026-07-23: 不要特意让出来给第二笔). The crossing ink
       belongs to the first stroke anyway; the sliver of the second diagonal
       the pen brushes at the joint reads as a natural crossing. */
    X: [
      [[0.16, 0.24], [0.84, 0.78]],
      [[0.84, 0.24], [0.16, 0.78]],
    ],
    n: [
      [[0.17, 0.40], [0.17, 0.78]],
      [[0.17, 0.52], [0.25, 0.40], [0.42, 0.36], [0.60, 0.42], [0.70, 0.54], [0.72, 0.78]],
    ],
    ".": [[[0.50, 0.72], [0.53, 0.76]]],
    L: [[[0.30, 0.24], [0.28, 0.76], [0.84, 0.77]]],

    /* ---- sentences 2 & 3 (authored 2026-07-23). Same conventions: cap 0.24,
       x-height 0.40, baseline 0.78, descender ~0.95. Bleed rules learned on
       the H: a stroke may touch ALREADY-written ink freely (reads as a
       joint), but must not sweep over ink whose stroke is still to come — so
       'd' writes its tall stem BEFORE the bowl, and 't'/'f' write stem before
       crossbar. */
    a: [
      [[0.70, 0.46], [0.54, 0.38], [0.34, 0.43], [0.27, 0.57], [0.33, 0.71], [0.52, 0.77], [0.70, 0.68]],
      [[0.72, 0.42], [0.74, 0.78]],
    ],
    b: [
      [[0.20, 0.22], [0.20, 0.78]],
      [[0.21, 0.48], [0.42, 0.40], [0.62, 0.46], [0.68, 0.59], [0.60, 0.72], [0.40, 0.77], [0.22, 0.70]],
    ],
    c: [[[0.72, 0.44], [0.52, 0.37], [0.32, 0.43], [0.25, 0.57], [0.32, 0.71], [0.52, 0.78], [0.72, 0.70]]],
    d: [
      [[0.74, 0.22], [0.74, 0.78]],
      [[0.72, 0.46], [0.52, 0.38], [0.32, 0.44], [0.25, 0.58], [0.32, 0.72], [0.55, 0.77], [0.72, 0.70]],
    ],
    e: [
      [[0.27, 0.58], [0.70, 0.55], [0.66, 0.42], [0.48, 0.37], [0.30, 0.44], [0.26, 0.58], [0.33, 0.72], [0.55, 0.78], [0.73, 0.71]],
    ],
    f: [
      [[0.66, 0.245], [0.48, 0.22], [0.38, 0.32], [0.37, 0.78]],
      [[0.20, 0.46], [0.62, 0.44]],
    ],
    g: [
      [[0.70, 0.43], [0.50, 0.37], [0.30, 0.44], [0.24, 0.57], [0.32, 0.70], [0.53, 0.75], [0.70, 0.67]],
      [[0.72, 0.40], [0.73, 0.82], [0.64, 0.955], [0.42, 0.97], [0.22, 0.925], [0.04, 0.90]],
    ],
    h: [
      [[0.20, 0.22], [0.20, 0.78]],
      [[0.20, 0.52], [0.30, 0.41], [0.48, 0.375], [0.64, 0.44], [0.70, 0.55], [0.71, 0.78]],
    ],
    l: [[[0.50, 0.22], [0.52, 0.78]]],
    o: [
      [[0.50, 0.375], [0.32, 0.42], [0.25, 0.57], [0.32, 0.71], [0.50, 0.78], [0.68, 0.71], [0.75, 0.57], [0.68, 0.42], [0.52, 0.375]],
    ],
    r: [
      [[0.28, 0.40], [0.28, 0.78]],
      [[0.28, 0.52], [0.38, 0.42], [0.54, 0.375], [0.68, 0.42]],
    ],
    s: [
      [[0.72, 0.46], [0.66, 0.39], [0.50, 0.365], [0.33, 0.42], [0.33, 0.52], [0.50, 0.565], [0.66, 0.62], [0.66, 0.72], [0.48, 0.785], [0.26, 0.77], [0.04, 0.745]],
    ],
    t: [
      [[0.46, 0.26], [0.46, 0.68], [0.52, 0.775], [0.68, 0.755]],
      [[0.24, 0.42], [0.70, 0.40]],
    ],
    u: [
      [[0.26, 0.40], [0.26, 0.60], [0.32, 0.73], [0.50, 0.775], [0.66, 0.70], [0.70, 0.55], [0.70, 0.40], [0.73, 0.78]],
    ],
    v: [[[0.26, 0.40], [0.48, 0.775], [0.72, 0.40]]],
    y: [
      [[0.24, 0.40], [0.49, 0.73]],
      [[0.75, 0.38], [0.55, 0.68], [0.42, 0.88], [0.27, 0.96]],
    ],
    C: [
      [[0.76, 0.32], [0.55, 0.235], [0.32, 0.32], [0.23, 0.50], [0.32, 0.68], [0.55, 0.775], [0.76, 0.68]],
    ],
    U: [
      [[0.22, 0.24], [0.22, 0.58], [0.32, 0.73], [0.50, 0.78], [0.68, 0.73], [0.78, 0.58], [0.78, 0.24]],
    ],
    V: [[[0.20, 0.24], [0.50, 0.78], [0.80, 0.24]]],
    "@": [
      [[0.62, 0.42], [0.48, 0.37], [0.36, 0.44], [0.34, 0.56], [0.43, 0.64], [0.57, 0.61], [0.62, 0.47], [0.65, 0.64]],
      [[0.86, 0.38], [0.70, 0.30], [0.50, 0.26], [0.28, 0.34], [0.18, 0.53], [0.27, 0.72], [0.50, 0.80], [0.70, 0.73], [0.80, 0.55]],
    ],
  };

  // Unknown glyph: three covering passes, so nothing can stay hidden forever.
  const HW_FALLBACK = [
    [[0.10, 0.30], [0.90, 0.34]],
    [[0.90, 0.52], [0.10, 0.56]],
    [[0.10, 0.72], [0.90, 0.76]],
  ];

  /* Per-sentence pace. Stroke-writing time scales with STROKE COUNT, not
     pixel width: sentence 1 is 19 strokes, sentences 2/3 are ~60/~48 — at
     sentence 1's pace they would take 4s+. The faster hand keeps them near
     the old travelling-ink durations (user-chosen compromise 2026-07-23:
     s2 ≈2.6s / s3 ≈2.1s) while every stroke still gets 2-3 frames. Smaller
     letters written faster also matches how hands actually write. */
  const HW_FAST_PACE = { speed: 0.88, strokeGap: 11, letterGap: 13, minMs: 27 };

  const writeIntroLineStrokes = (line, pace) => {
    if (!line) return;
    const paceSpeed = pace?.speed ?? HW_SPEED_PX_MS;
    const paceStrokeGap = pace?.strokeGap ?? HW_STROKE_GAP_MS;
    const paceLetterGap = pace?.letterGap ?? HW_LETTER_GAP_MS;
    const paceMinMs = pace?.minMs ?? 45;
    const text = line.dataset.text || "";
    stopIntroWriting();
    const gen = hwGeneration;

    if (prefersReducedMotion.matches) {
      line.textContent = text;
      line.classList.add("is-done");
      return;
    }

    line.classList.remove("is-writing", "is-done", "hw-fallback");
    // Empty through the lead-in. Showing the real text here and hiding it in
    // build() flashed the finished sentence for 300ms before writing began.
    line.textContent = "";

    const build = () => {
      if (gen !== hwGeneration || !line.isConnected) return;
      window.clearTimeout(introDoneTimer); // drop the show-plain-text fallback
      line.textContent = text;             // lay the real text out to measure
      const node = line.firstChild;
      if (!node) return;
      // Read the ink BEFORE hw-writing makes the HTML text transparent.
      const inkColor = getComputedStyle(line).color;

      const lineBox = line.getBoundingClientRect();
      const cs = getComputedStyle(line);

      // Baseline from the same metrics the HTML renderer uses, so the SVG
      // copy sits pixel-on-pixel and the final swap back is invisible.
      let ascent = null;
      try {
        const ctx = document.createElement("canvas").getContext("2d");
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const met = ctx.measureText("Hg");
        if (met.fontBoundingBoxAscent) ascent = met.fontBoundingBoxAscent;
      } catch (e) {
        /* canvas blocked — the HW_BASE fallback below still lands */
      }

      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("class", "hw-svg");
      svg.setAttribute("viewBox", `0 0 ${lineBox.width.toFixed(2)} ${lineBox.height.toFixed(2)}`);
      svg.setAttribute("aria-hidden", "true");
      const defs = document.createElementNS(svgNS, "defs");
      svg.appendChild(defs);

      const range = document.createRange();
      const strokes = [];
      for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (ch === " ") continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        const cell = { x: r.left - lineBox.left, y: r.top - lineBox.top, w: r.width, h: r.height };
        const baseline = cell.y + (ascent !== null ? ascent : cell.h * HW_BASE);

        /* Clip, not mask. The pen strokes are drawn as REAL ink and clipped to
           this glyph's shape, instead of being hidden inside a <mask> that
           reveals a filled glyph. Both produce the same picture, but only this
           one animates: paths inside <mask>/<defs> are non-rendered, and Chrome
           does not reliably repaint a mask when its contents mutate — the first
           version updated sporadically, so later letters showed as specks and
           the finished sentence only appeared when the overlay was swapped for
           the HTML text. Here the animated element is ordinary rendered
           content, and the clip is static. */
        const clip = document.createElementNS(svgNS, "clipPath");
        clip.setAttribute("id", `hw-c-${(hwIdCounter += 1)}`);
        clip.setAttribute("clipPathUnits", "userSpaceOnUse");
        const shape = document.createElementNS(svgNS, "text");
        shape.setAttribute("x", cell.x.toFixed(2));
        shape.setAttribute("y", baseline.toFixed(2));
        shape.style.fontFamily = cs.fontFamily;
        shape.style.fontSize = cs.fontSize;
        shape.style.fontWeight = cs.fontWeight;
        shape.textContent = ch;
        clip.appendChild(shape);
        defs.appendChild(clip);

        const g = document.createElementNS(svgNS, "g");
        g.setAttribute("clip-path", `url(#${clip.id})`);

        /* Pen width is a trade-off measured, not guessed: Gaegu's own ink
           stroke is ~2.5-3px at this size, and the pen must cover it plus
           recipe slop — but every extra px of pen bleeds further into
           NEIGHBOURING strokes at junctions (the too-wide 0.24 pen is what
           hung crossbar stubs off the H stems before the bar was written). */
        const penW = Math.max(4, cell.h * 0.17);
        const mapX = (nx) => (cell.x + nx * cell.w).toFixed(2);
        const mapY = (ny) => (cell.y + (ny / HW_BASE) * (baseline - cell.y)).toFixed(2);
        const recipe = HW_RECIPES[ch] || HW_FALLBACK;
        recipe.forEach((strokeDef, sIdx) => {
          // A stroke is a point list, or {pts, zones} where zones are polygons
          // the stroke's REVEAL is restricted to. Needed for mid-path crossings
          // (the X): the first diagonal's pen sweeps the crossing and would
          // otherwise expose a piece of the unwritten second diagonal. The
          // zones exclude the second stroke's corridor; the crossing ink is
          // laid when the second stroke itself passes. Zones are static clip
          // content — only the dashoffset animates, so the defs rule holds.
          const pts = Array.isArray(strokeDef) ? strokeDef : strokeDef.pts;
          const zones = Array.isArray(strokeDef) ? null : strokeDef.zones;
          const d = pts
            .map(([nx, ny], j) => `${j === 0 ? "M" : "L"}${mapX(nx)} ${mapY(ny)}`)
            .join(" ");
          const p = document.createElementNS(svgNS, "path");
          p.setAttribute("d", d);
          p.setAttribute("stroke", inkColor);
          p.setAttribute("stroke-width", penW.toFixed(1));
          p.setAttribute("stroke-linecap", "round");
          p.setAttribute("stroke-linejoin", "round");
          p.setAttribute("fill", "none");
          let holder = g;
          if (zones) {
            const zc = document.createElementNS(svgNS, "clipPath");
            zc.setAttribute("id", `hw-z-${(hwIdCounter += 1)}`);
            zc.setAttribute("clipPathUnits", "userSpaceOnUse");
            zones.forEach((poly) => {
              const el = document.createElementNS(svgNS, "polygon");
              el.setAttribute("points", poly.map(([nx, ny]) => `${mapX(nx)},${mapY(ny)}`).join(" "));
              zc.appendChild(el);
            });
            defs.appendChild(zc);
            holder = document.createElementNS(svgNS, "g");
            holder.setAttribute("clip-path", `url(#${zc.id})`);
            g.appendChild(holder);
          }
          holder.appendChild(p);
          strokes.push({ p, newLetter: sIdx === 0 });
        });
        svg.appendChild(g);
      }
      line.appendChild(svg);
      if (!strokes.length) return; // nothing to write — leave the plain text up
      // ONLY now hide the HTML text: the overlay that replaces it exists in
      // this same frame, so there is never a moment where the line is blank
      // with nothing drawing over it.
      line.classList.add("hw-writing");

      // Schedule: strictly sequential, one pen. Lengths need the SVG live.
      // Driven by rAF, NOT CSS transitions: the paths sit inside <mask> in
      // <defs>, which is non-rendered content — transitions never run there
      // (first attempt snapped every stroke straight to its end state).
      let at = 0;
      strokes.forEach((s, idx) => {
        s.len = s.p.getTotalLength();
        s.dur = Math.max(paceMinMs, s.len / paceSpeed);
        if (idx > 0) at += s.newLetter ? paceLetterGap : paceStrokeGap;
        s.start = at;
        at += s.dur;
        // The dash is PADDED past the true length. With dasharray equal to a
        // ROUNDED length, any stroke whose length rounded down left a sliver
        // of its tail outside the gap — and a sub-pixel sliver under a 6px
        // round cap renders as a dot. Stems end on the baseline, so every
        // undrawn letter showed a row of baseline dots from the first frame.
        s.dash = s.len + 4;
        s.p.setAttribute("stroke-dasharray", `${s.dash.toFixed(2)}`);
        s.p.setAttribute("stroke-dashoffset", `${s.dash.toFixed(2)}`);
      });
      const total = at;
      // pen decelerates into the end of each stroke
      const strokeEase = (u) => 1 - (1 - u) * (1 - u) * (1 - u * 0.4);

      line.classList.add("is-writing");
      let penT0 = 0;
      const macroWarp = (x) => {
        const sm = x * x * (3 - 2 * x);
        return x + (sm - x) * HW_MACRO_EASE;
      };
      const penStep = (now) => {
        introRaf = null;
        if (gen !== hwGeneration) return;
        if (!penT0) penT0 = now;
        const real = now - penT0;
        // warped clock: slow at both ends of the SENTENCE, quicker mid-way
        const t = macroWarp(clamp(real / total, 0, 1)) * total;
        strokes.forEach((s) => {
          const u = clamp((t - s.start) / s.dur, 0, 1);
          // offset runs dash -> 0 (not len -> 0): while hidden the whole path
          // must sit inside the gap, or the round cap paints an endpoint dot.
          s.p.setAttribute("stroke-dashoffset", `${(s.dash * (1 - strokeEase(u))).toFixed(2)}`);
        });
        if (t < total) {
          introRaf = window.requestAnimationFrame(penStep);
          return;
        }
        // last stroke landed: swap the overlay away, plain Gaegu HTML remains
        svg.remove();
        line.classList.remove("hw-writing", "is-writing");
        line.classList.add("is-done");
      };
      introRaf = window.requestAnimationFrame(penStep);

      // backstop only (e.g. rAF starved in a hidden tab): force-finish
      introDoneTimer = window.setTimeout(() => {
        if (gen !== hwGeneration || line.classList.contains("is-done")) return;
        if (introRaf) window.cancelAnimationFrame(introRaf);
        introRaf = null;
        svg.remove();
        line.classList.remove("hw-writing", "is-writing");
        line.classList.add("is-done");
      }, total + 2400);
    };

    /* Font gate, third iteration. Strokes are mapped onto MEASURED glyph
       boxes, so ideally Gaegu is real before building — but the wait is
       BOUNDED and never cancels the animation. On a HARD refresh the font
       bypasses cache and comes from Google Fonts, which can be slow or fail
       outright (e.g. blocked networks); the previous gate answered that by
       showing the finished sentence statically — the exact "no animation on
       force-refresh" bug. Now: wait up to HW_FONT_WAIT_MS, then WRITE ANYWAY
       with whatever face is currently rendered. The clip glyphs and the final
       HTML text share that same face, so the result is self-consistent; if
       Gaegu lands later it reflows once, like any late webfont. The static
       fade-in remains only for build() itself throwing. */
    const showPlainSentence = () => {
      if (gen !== hwGeneration || line.querySelector(".hw-svg")) return;
      line.textContent = text;
      line.classList.remove("hw-writing", "is-writing");
      line.classList.add("is-done", "hw-fallback");
    };

    // Absolute fail-safe: the line must never sit empty. Cleared by build().
    introDoneTimer = window.setTimeout(showPlainSentence, 3000);

    introTypingTimer = window.setTimeout(() => {
      if (gen !== hwGeneration) return;
      const cs0 = getComputedStyle(line);
      const spec = `${cs0.fontWeight} ${cs0.fontSize} ${cs0.fontFamily}`;
      const fontsReady =
        document.fonts && !document.fonts.check(spec)
          ? Promise.race([
              // reject = face unavailable; resolve the race and write anyway
              document.fonts.load(spec).catch(() => {}),
              // slow network: stop waiting before the fail-safe can win
              new Promise((resolve) => window.setTimeout(resolve, HW_FONT_WAIT_MS)),
            ])
          : Promise.resolve();
      fontsReady.then(() => {
        if (gen !== hwGeneration) return; // a newer run owns the line
        try {
          build();
        } catch (e) {
          line.querySelector(".hw-svg")?.remove();
          showPlainSentence();
        }
      });
    }, 300);
  };

  // ALL THREE sentences now write stroke-by-stroke (2026-07-23). Sentence 1
  // keeps its tuned 1.65s pace; the longer sentences 2/3 use HW_FAST_PACE.
  // (writeIntroLineGlyphs and writeIntroLineInk above are unreferenced — kept
  // so the earlier reveal styles can be swapped back in one line.)
  const writeIntroLine = (line, screenIndex) =>
    writeIntroLineStrokes(line, screenIndex === 0 ? null : HW_FAST_PACE);

  const showHeaderTemporarily = () => {
    if (!header || !document.body.classList.contains("home-gallery-active")) return;
    header.classList.remove("is-auto-hidden");
    window.clearTimeout(headerHideTimer);
    headerHideTimer = window.setTimeout(() => {
      if (document.body.classList.contains("home-gallery-active") && !header.classList.contains("nav-open")) {
        header.classList.add("is-auto-hidden");
      }
    }, 3200);
  };

  const activateIntroScreen = (nextIndex) => {
    // The opening has begun the moment a screen is activated — mark it so the
    // load/pageshow re-reset treats even the pre-draw lead-in as "started".
    openingArmed = true;
    activeIntroIndex = clamp(nextIndex, 0, homeIntroScreens.length);
    const isGallery = activeIntroIndex >= homeIntroScreens.length;
    document.body.classList.toggle("home-gallery-active", isGallery);

    homeIntroScreens.forEach((screen, index) => {
      screen.classList.toggle("is-active", index === activeIntroIndex);
    });

    if (isGallery) {
      stopIntroWriting();
      galleryProgress = 0;
      galleryTargetProgress = 0;
      gallerydriftStop();
      galleryArmed = false;
      galleryReadyAt = Date.now() + 950;
      setHomeGalleryProgress(0);
      showHeaderTemporarily();
      return;
    }

    const incomingLine = homeIntroScreens[activeIntroIndex]?.querySelector(".intro-line");

    if (incomingLine) {
      incomingLine.innerHTML = "";
      incomingLine.classList.remove("is-writing", "is-done");
    }

    // capture the index now: activeIntroIndex may move again before this fires
    const incomingIndex = activeIntroIndex;
    window.setTimeout(() => writeIntroLine(incomingLine, incomingIndex), 620);
  };


  function setHomeGalleryProgress(nextProgress) {
    // State-machine lock: once the opening is complete (and we're not back in an
    // explicit re-entry, which removes the complete class first), the opening
    // choreography may never write classes, vars or probes again.
    if (
      document.body.classList.contains("home-opening-complete") &&
      !document.body.classList.contains("home-opening-active")
    ) {
      return;
    }
    const progress = clamp(nextProgress, 0, GALLERY_PROGRESS_MAX);
    const exitProgress = clamp(progress - 1, 0, 1);
    const workHandoffProgress = clamp((exitProgress - HANDOFF_START) / HANDOFF_SPAN, 0, 1);

    galleryProgress = progress;
    homeRevealProgress = progress;
    document.body.classList.toggle("home-gallery-revealing", progress > 0.01 && progress < GALLERY_PROGRESS_MAX);
    document.body.classList.toggle(
      "home-work-handoff",
      workHandoffProgress > 0.001 && progress < GALLERY_PROGRESS_MAX - 0.001
    );
    // The section is solid almost immediately — the transition must read as one
    // surface sliding in, never a translucent curtain over the hero.
    document.documentElement.style.setProperty("--home-work-section-opacity", String(Math.min(1, workHandoffProgress * 3)));

    // One continuous bridge, styled as a natural scroll: the hero glides UP and
    // away while Projects rides in from below, both on the same ease-out curve —
    // fast off the mark, decelerating into place (先快后慢). f'(1)≈0 means the
    // section is essentially parked at release, so the FLIP glide short-circuits
    // (≤2px) and native scrolling simply continues from the settled position.
    if (workHandoffProgress > 0) {
      if (workLandedTop === null) {
        workLandedTop = measureWorkLandedTop();
        traceOpening("probe", { landed: +workLandedTop.toFixed(1) });
      }
      const startTop = Math.min(window.innerHeight * 0.64, 700);
      const u = workHandoffProgress;
      const ride = easeOutCubic(u);
      const fixedTop = startTop + (workLandedTop - startTop) * ride;
      traceOpening("ride", { u: +u.toFixed(3), top: +fixedTop.toFixed(1) });
      document.documentElement.style.setProperty("--home-work-fixed-top", `${fixedTop.toFixed(1)}px`);
      document.documentElement.style.setProperty("--home-work-section-y", `${(260 * (1 - ride)).toFixed(1)}px`);
      // the hero leaves like scrolled content: up, and gone well before landing
      document.documentElement.style.setProperty("--home-hero-exit-y", `${(-ride * window.innerHeight * 0.42).toFixed(1)}px`);
      document.documentElement.style.setProperty("--home-hero-exit-o", (1 - Math.min(1, u * 1.5)).toFixed(3));

      // Bring the header home early in the ride — if it only reappears at the
      // completion swap, its slide-in reads as a top-of-screen mode switch right
      // where the section heading is landing.
      if (u > 0.1 && header?.classList.contains("is-auto-hidden")) {
        window.clearTimeout(headerHideTimer);
        header.classList.remove("is-auto-hidden");
      }
    }

    // Returning to rest (reverse handoff finished): drop every var the ride
    // wrote, so the hero is styled purely by the stylesheet again. This used to
    // sit below a dead early return (the old collage hooks) and never ran.
    if (progress <= 0.001) {
      clearHomeHandoffVars();
      document.body.classList.remove("home-work-handoff");
    }
  }

  // The collage videos keep decoding even at display:none — pause them whenever
  // the opening is behind us, resume when the visitor re-enters the gallery.
  const homeGalleryVideos = Array.from(document.querySelectorAll(".home-gallery-screen video"));
  const setGalleryVideosPlaying = (playing) => {
    homeGalleryVideos.forEach((video) => {
      if (playing) video.play().catch(() => {});
      else video.pause();
    });
  };

  // Scroll-scrubbed landing: after the completion layout-swap the work section
  // still sits a few hundred px below its resting spot. Instead of playing that
  // gap back as a timed glide (which ignores the finger for 340ms and then lets
  // leftover trackpad momentum kick the page — the old "stall then bounce"),
  // the remaining gap is consumed 1:1 by the visitor's continued wheel/touch
  // input: the page moves exactly with the finger, freezes the moment it stops,
  // and hands over to native scrolling seamlessly once the gap reaches zero.
  let workLandingRemaining = 0;
  let workLandingTotal = 0;
  let workArrivedAt = 0;
  const isWorkLanding = () => workLandingRemaining > 0;

  const cancelWorkLanding = () => {
    const wasLanding = Math.abs(workLandingRemaining) > 0.5;
    workLandingRemaining = 0;
    workLandingTotal = 0;
    if (workRevealSection && wasLanding) {
      // Zero the offset while `transition: none` is still in force and commit it
      // with a reflow BEFORE handing the properties back to the stylesheet —
      // otherwise .reveal-section's stock 520ms transform transition replays the
      // removal as a self-moving slip right at the native-scroll handover.
      workRevealSection.style.setProperty("transition", "none", "important");
      workRevealSection.style.setProperty("transform", "translateY(0)", "important");
      void workRevealSection.offsetHeight;
    }
    workRevealSection?.style.removeProperty("transition");
    workRevealSection?.style.removeProperty("transform");
    document.documentElement.style.removeProperty("scroll-snap-type");
  };

  const scrubWorkLanding = (deltaY) => {
    if (!workRevealSection || !isWorkLanding()) return;
    const next = clamp(workLandingRemaining - deltaY, 0, workLandingTotal);
    const leftover = Math.max(deltaY - (workLandingRemaining - next), 0);

    if (next <= 0.5) {
      // Cancel while the landing still counts as active, so the transition-safe
      // zero-and-reflow teardown inside cancelWorkLanding actually runs.
      cancelWorkLanding();
      syncVisibleWorkCards();
      // Pass the unconsumed part of this event on to the page, so the handover
      // to native scrolling keeps the finger's velocity — no dead frame.
      if (leftover > 0.5) window.scrollTo({ top: leftover, behavior: "instant" });
      return;
    }

    workLandingRemaining = next;
    workRevealSection.style.setProperty("transform", `translateY(${next.toFixed(1)}px)`, "important");
    syncVisibleWorkCards();
  };

  const finishHomeOpening = (carryDelta = 0) => {
    if (isWorkLanding()) return;

    // Finalize the opening's own state so no later event (resize etc.) can see
    // a lingering mid-choreography progress value and wake the ride back up.
    galleryProgress = 0;
    galleryTargetProgress = 0;
    gallerydriftStop();
    homeRevealProgress = 0;
    rideReverseAccum = 0;

    // No work section to bridge to — just complete instantly.
    if (!workRevealSection) {
      document.body.classList.remove("home-opening-active", "home-gallery-active", "home-gallery-revealing", "home-work-handoff");
      document.body.classList.add("home-opening-complete");
      header?.classList.remove("is-auto-hidden");
      clearHomeHandoffVars();
      setGalleryVideosPlaying(false);
      return;
    }

    // Turn off scroll-snap while we drive the landing ourselves, or the snap container
    // fights our scrollTo and yanks the position around. Restored once the landing settles.
    document.documentElement.style.setProperty("scroll-snap-type", "none", "important");

    // Where the work section sits on screen right now, pinned (fixed) during the reveal.
    const fromTop = workRevealSection.getBoundingClientRect().top;

    // Swap to the final layout immediately: intro + gallery collapse out of flow and the
    // work section becomes a normal in-flow block near the top of the page.
    document.body.classList.remove("home-opening-active", "home-gallery-active", "home-gallery-revealing", "home-work-handoff");
    document.body.classList.add("home-opening-complete");
    header?.classList.remove("is-auto-hidden");
    clearHomeHandoffVars();
    setGalleryVideosPlaying(false);
    workArrivedAt = Date.now();
    workRevealSection.classList.add("is-visible");
    // "auto" resolves to the html's scroll-behavior (smooth!) — that would be an
    // ASYNC animated scroll racing the landing. Must be a真正的 instant jump.
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      syncVisibleWorkCards();
      syncWorkSceneFade();
    }));

    // The collapse would snap the section upward. Measure that gap and neutralise it with a
    // transform that holds the section at its old on-screen spot (FLIP). From here the
    // visitor's own scrolling scrubs the offset down to zero — never a timed animation.
    const landedTop = workRevealSection.getBoundingClientRect().top;
    const glide = Math.round(fromTop - landedTop);
    traceOpening("release", { fromTop: +fromTop.toFixed(1), landedTop: +landedTop.toFixed(1), glide, carry: Math.round(carryDelta), scrollY: Math.round(window.scrollY) });

    if (Math.abs(glide) <= 2) {
      document.documentElement.style.removeProperty("scroll-snap-type");
      return;
    }

    if (glide < 0) {
      // The section landed slightly LOWER than the ride's endpoint. Snapping down
      // is exactly the "reached the height, then dropped back" artifact — instead
      // hold it at the old spot and let the scroll listener release the hold at
      // half speed: the section keeps moving up-screen, never backwards.
      workLandingTotal = glide;
      workLandingRemaining = glide;
      workRevealSection.style.setProperty("transition", "none", "important");
      workRevealSection.style.setProperty("transform", `translateY(${glide}px)`, "important");
      return;
    }

    // The completed-state CSS pins the work section with `transform: none !important`, so the
    // landing offset must be written with `important` priority to win the cascade.
    workLandingTotal = glide;
    workLandingRemaining = glide;
    workRevealSection.style.setProperty("transition", "none", "important");
    workRevealSection.style.setProperty("transform", `translateY(${glide}px)`, "important");

    // The wheel event that crossed the release threshold usually has distance left
    // over — feed it straight into the landing so the motion never skips a beat.
    if (carryDelta > 0) scrubWorkLanding(carryDelta);
  };

  // Ratchet for the handoff ride: macOS trackpads emit small REVERSE deltas as
  // fingers lift off, and with the section riding at ~1.3x gain those wobbles
  // read as the arriving content visibly retreating ("reached the height, then
  // shrank back"). Swallow reverse motion during the ride until it accumulates
  // into a deliberate gesture; any forward motion re-arms the ratchet.
  let rideReverseAccum = 0;
  const RIDE_REVERSE_THRESHOLD = 90;

  // Forward deltas must add up to a real push before the handoff launches.
  let launchAccum = 0;
  const LAUNCH_THRESHOLD = 55;

  /* One deliberate gesture launches a TIME-BASED glide between the two scenes.
     This used to lerp progress toward a target each frame, which sounds smooth
     but stacked TWO ease-outs: the lerp is itself an ease-out, and the ride
     then applies easeOutCubic on top. Measured result — 45% of the travel
     landed in the FIRST frame and 95% inside 84ms, so the transition read as
     an instant snap with a long invisible tail ("一瞬间"). Now progress is
     tweened LINEARLY over an explicit duration and the ride's easeOutCubic is
     the single ease: calm start, most of the motion in the first half, a long
     gentle settle (先快后慢). GLIDE_MS is the one dial for the whole feel. */
  const HANDOFF_GLIDE_MS = 900;
  const HANDOFF_TRAVEL = GALLERY_RELEASE_PROGRESS - HANDOFF_FLOOR;
  let galleryTargetProgress = 0;
  let galleryPendingRelease = false;
  let galleryPendingHome = false;
  let gallerySmoothFrame = null;
  let gallerySmoothTimer = null;
  let glideFrom = 0;
  let glideStartedAt = 0;
  let glideDuration = HANDOFF_GLIDE_MS;
  let glideActive = false;

  const gallerydriftStop = () => {
    if (gallerySmoothFrame) cancelAnimationFrame(gallerySmoothFrame);
    gallerySmoothFrame = null;
    window.clearTimeout(gallerySmoothTimer);
    gallerySmoothTimer = null;
    glideActive = false;
    galleryPendingRelease = false;
    galleryPendingHome = false;
    launchAccum = 0;
  };

  // Glide from wherever we are to `to`, scaling the duration by how far we
  // actually travel so an interrupted/partial move isn't slowed to a crawl.
  const startGalleryGlide = (to) => {
    glideFrom = galleryProgress;
    galleryTargetProgress = to;
    glideStartedAt = performance.now();
    glideDuration = HANDOFF_GLIDE_MS *
      clamp(Math.abs(to - glideFrom) / HANDOFF_TRAVEL, 0.3, 1);
    glideActive = true;
    scheduleGallerySmooth();
  };

  // rAF while visible; timeout heartbeat while hidden (rAF pauses there) —
  // same convention as the clothesline and buddy renderers
  const scheduleGallerySmooth = () => {
    if (gallerySmoothFrame || gallerySmoothTimer !== null) return;
    if (document.visibilityState === "hidden") {
      gallerySmoothTimer = window.setTimeout(() => {
        gallerySmoothTimer = null;
        gallerySmoothStep(performance.now());
      }, 50);
    } else {
      gallerySmoothFrame = requestAnimationFrame(gallerySmoothStep);
    }
  };

  const gallerySmoothStep = (t) => {
    gallerySmoothFrame = null;
    if (!glideActive) return;

    // Linear in time — the ride's easeOutCubic supplies the ONE ease. Being
    // time-based (not a per-frame lerp) also means a throttled or dropped frame
    // resumes at the right place instead of stretching the whole transition.
    const u = clamp((t - glideStartedAt) / glideDuration, 0, 1);
    setHomeGalleryProgress(glideFrom + (galleryTargetProgress - glideFrom) * u);

    if (u < 1) {
      scheduleGallerySmooth();
      return;
    }

    glideActive = false;
    if (galleryPendingRelease) {
      galleryPendingRelease = false;
      finishHomeOpening(0);
    } else if (galleryPendingHome) {
      // Arrived at the bottom of the visible range — drop the rest in one step
      // (nothing paints below the floor) so the hero is fully at rest.
      galleryPendingHome = false;
      setHomeGalleryProgress(0);
      galleryTargetProgress = 0;
    }
  };

  const applyHomeGalleryDelta = (delta) => {

    if (!galleryArmed || Date.now() < galleryReadyAt) return;

    // ONE deliberate gesture plays the whole transition. The old behaviour
    // scrubbed progress with the wheel (each event capped at 90px against a
    // 760px unit), so reaching Projects took ~7 hard notches — the reported
    // "have to keep flicking, feels stuck".
    if (delta > 0) {
      rideReverseAccum = 0;
      if (glideActive || galleryPendingRelease) return; // already on its way

      // A gesture, not a graze. One stray wheel tick (or trackpad momentum
      // dribbling out of the intro paging) must not fire the whole transition —
      // that read as "微微一碰就迅速滑走". Accumulate until the push is clearly
      // intentional; a real swipe crosses this within its first 2-3 events, so
      // it still feels like a single gesture.
      launchAccum += delta;
      if (launchAccum < LAUNCH_THRESHOLD) return;
      launchAccum = 0;

      // Start AT the floor: progress 0→FLOOR is a leftover of the old collage's
      // reveal scrub and now paints nothing at all, so easing across it just
      // spent the first ~80ms of the glide on a still frame (read as lag on the
      // first flick). Jumping it is invisible by construction, and the whole
      // ease is then real motion.
      if (galleryProgress < HANDOFF_FLOOR) setHomeGalleryProgress(HANDOFF_FLOOR);
      galleryPendingRelease = true;
      galleryPendingHome = false;
      startGalleryGlide(GALLERY_RELEASE_PROGRESS);
      return;
    }

    launchAccum = 0; // any upward motion cancels a part-built forward gesture

    // Reverse: swallow trackpad lift-off wobble during the ride, then glide
    // all the way home — same single-gesture rule in the other direction.
    if (galleryProgress > HANDOFF_FLOOR) {
      rideReverseAccum += -delta;
      if (rideReverseAccum < RIDE_REVERSE_THRESHOLD) {
        traceOpening("wobble-swallowed", { delta: Math.round(delta), accum: Math.round(rideReverseAccum) });
        return;
      }
    }
    if (glideActive && galleryPendingHome) return; // already gliding home

    // Aim at the floor, not 0, for the same reason: below it nothing paints, so
    // targeting 0 would spend the ease's visible portion in its first ~40ms and
    // the rest settling invisibly — the reverse would read as a snap. The
    // glide drops to 0 once it arrives (see gallerySmoothStep).
    galleryPendingRelease = false;
    galleryPendingHome = true;
    startGalleryGlide(HANDOFF_FLOOR);
  };

  const reenterHomeGalleryFromProjects = () => {
    if (!workRevealSection) return false;

    const handoffViewportY = getWorkHandoffViewportY();
    const reentryTop = Math.max(workRevealSection.offsetTop - handoffViewportY, 0);
    if (window.scrollY > reentryTop + 80) return false;

    // Cancel any pending landing so its !important inline transform can't get stuck.
    traceOpening("reenter", { scrollY: Math.round(window.scrollY) });
    cancelWorkLanding();

    document.body.classList.add("home-opening-active", "home-gallery-active", "home-gallery-revealing");
    document.body.classList.remove("home-opening-complete", "home-work-handoff");
    setGalleryVideosPlaying(true);

    homeIntroScreens.forEach((screen) => screen.classList.remove("is-active"));
    activeIntroIndex = homeIntroScreens.length;

    galleryArmed = true;
    galleryReadyAt = 0;

    window.scrollTo({ top: 0, behavior: "auto" });

    if (homeGalleryScreen) {
      homeGalleryScreen.style.removeProperty("display");
      homeGalleryScreen.style.removeProperty("opacity");
      homeGalleryScreen.style.removeProperty("pointer-events");
      homeGalleryScreen.style.removeProperty("visibility");
    }

    clearHomeHandoffVars();
    homeGalleryScreen?.getBoundingClientRect();
    gallerydriftStop();
    // Re-enter INSIDE the handoff, parked at its release point: the ride puts
    // the work section exactly where it just sat (fixedTop(u=1) = landed top)
    // and the hero exactly off-screen above — so this swap changes NOTHING
    // visually, and the continued upward scroll simply plays the same ride
    // backwards through the smoother. Entering at progress 1 instead (the old
    // collage behaviour) hard-cut straight to the hero in one frame.
    galleryTargetProgress = GALLERY_RELEASE_PROGRESS;
    setHomeGalleryProgress(GALLERY_RELEASE_PROGRESS);
    showHeaderTemporarily();

    return true;
  };

  const pageHomeOpening = (direction, delta = 0) => {
    if (isIntroPaging) return;

    if (activeIntroIndex < homeIntroScreens.length) {
      if (direction < 0) return;
      isIntroPaging = true;
      activateIntroScreen(activeIntroIndex + 1);
      window.setTimeout(() => {
        isIntroPaging = false;
      }, 1120);
      return;
    }

    if (Date.now() < galleryReadyAt) return;
    if (!galleryArmed) {
      if (direction < 0) return;
      galleryArmed = true;
      showHeaderTemporarily();
      return;
    }

    applyHomeGalleryDelta(delta || direction * 180);
  };

  const resetHomeOpening = () => {
    if (!shouldResetHomeScroll) return;
    traceOpening("reset", { readyState: document.readyState, scrollY: Math.round(window.scrollY) });
    window.scrollTo({ top: 0, behavior: "instant" });
    setGalleryVideosPlaying(true);
    document.body.classList.add("home-opening-active");
    document.body.classList.remove("home-opening-complete", "home-gallery-active", "home-gallery-revealing", "home-work-handoff");
    clearHomeHandoffVars();
    header?.classList.remove("is-auto-hidden");
    cancelWorkLanding();
    workRevealSection?.classList.remove("is-visible");
    workCards.forEach((card) => {
      card.classList.remove("is-visible");
      // drop any mid-scrub inline styles so the handoff opacity var wins again
      card.style.removeProperty("opacity");
      card.style.removeProperty("transform");
      card.style.removeProperty("transition");
    });
    activateIntroScreen(0);
    syncHeaderScroll();
  };

  const skipHomeOpening = () => {
    cancelWorkLanding();
    document.body.classList.remove("home-opening-active", "home-gallery-active", "home-gallery-revealing", "home-work-handoff");
    document.body.classList.add("home-opening-complete");
    homeIntroScreens.forEach((screen) => screen.classList.remove("is-active"));
    setGalleryVideosPlaying(false);
    workRevealSection?.classList.add("is-visible");
    workCards.forEach((card) => card.classList.add("is-visible"));
    syncWorkSceneFade();
  };

  let workSceneFadeTimer = null;
  const goToWorkSection = () => {
    skipHomeOpening();

    // Soft arrival WITHOUT a smooth scroll. A smooth scrollTo here is async and
    // interruptible, and it reintroduced the alternating blank-band bug: the
    // page must be RE-ASSERTED at the section top to defeat the layout drop that
    // skipHomeOpening()/cancelWorkLanding() causes, and a one-shot glide cannot
    // do that (its rAF/load re-runs would each snap-interrupt the glide). So the
    // scroll is an INSTANT, re-asserted jump — deterministic and self-correcting
    // (verified: repeated clicks stay locked at the section top). The gentleness
    // instead comes from easing the scene's OPACITY to its resting value: it
    // fades in when arriving from a scrolled-away / faded state, and is an
    // invisible no-op when already at Work. The transition is cleared after ~½s
    // so ordinary scroll-scrubbing stays instant.
    if (workScene && !prefersReducedMotion.matches) {
      workScene.style.transition = "opacity 480ms ease";
      clearTimeout(workSceneFadeTimer);
      workSceneFadeTimer = window.setTimeout(() => {
        workScene.style.transition = "";
      }, 560);
    }

    const moveToWork = () => {
      workRevealSection?.classList.add("is-visible");
      workCards.forEach((card) => card.classList.add("is-visible"));

      if (workRevealSection) {
        // instant (re-asserted below) so the section is pinned deterministically
        // at the top; target is read live from the settled layout.
        const top = Math.round(workRevealSection.getBoundingClientRect().top + window.scrollY);
        window.scrollTo({ top, behavior: "instant" });
      }

      // Clean address bar: the section is reachable at its own /projects url.
      // REPLACE, never push — moveToWork re-runs (immediately, across two rAFs
      // and again on load), so pushing here would stack duplicate entries. The
      // single history entry for a click is pushed at the click site instead.
      history.replaceState(null, "", PROJECTS_PATH);
      syncVisibleWorkCards();
      // sets the scene's resting opacity; with the transition above active, that
      // change eases in gently when arriving from a faded state.
      syncWorkSceneFade();
    };

    moveToWork(); // immediately, so there is no blank frame after the layout finalizes
    requestAnimationFrame(() => requestAnimationFrame(moveToWork)); // re-assert after layout settles

    // 等图片等内容加载完成后，再校准一次位置
    if (document.readyState !== "complete") {
      window.addEventListener("load", moveToWork, { once: true });
    }
  };

  const showHomeGalleryFromLogo = () => {
    window.scrollTo(0, 0);
    setGalleryVideosPlaying(true);

    document.body.classList.add(
      "home-opening-active",
      "home-gallery-active",
      "home-gallery-revealing"
    );
  
    document.body.classList.remove(
      "home-opening-complete",
      "home-work-handoff"
    );
  
    clearHomeHandoffVars();
    workRevealSection?.classList.remove("is-visible");
    workCards.forEach((card) => card.classList.remove("is-visible"));
    homeIntroScreens.forEach((screen) => screen.classList.remove("is-active"));
  
    activeIntroIndex = homeIntroScreens.length;
    galleryArmed = false;
  
    // The logo return used to reverse-play the collage's disperse animation.
    // With the hero design there is nothing in the 0→1 progress range to play
    // back (the old photo hooks are gone), so the 650ms rAF sweep it ran was a
    // pure no-op that only delayed re-arming the scroll. Land on the hero
    // directly — visually identical, minus the dead choreography.
    setHomeGalleryProgress(0);
    document.body.classList.remove("home-gallery-revealing");

    galleryProgress = 0;
    galleryTargetProgress = 0;
    gallerydriftStop();
    galleryArmed = false;
    galleryReadyAt = Date.now() + 500;

    showHeaderTemporarily();
  };

  window.addEventListener(
    "wheel",
    (event) => {
      // Mid-landing: the visitor's scroll drives the section the rest of the
      // way to its resting spot, 1:1 — no timed animation to fight the finger.
      if (isWorkLanding()) {
        event.preventDefault();
        if (event.deltaY < -28 && workLandingRemaining >= workLandingTotal - 0.5) {
          // Scrubbed all the way back up — hand back to the gallery.
          cancelWorkLanding();
          if (reenterHomeGalleryFromProjects()) showHeaderTemporarily();
          return;
        }
        scrubWorkLanding(event.deltaY);
        return;
      }

      if (document.body.classList.contains("home-opening-active")) {
        event.preventDefault();

        if (Math.abs(event.deltaY) < 1) return;

        const smoothDelta =
          Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), 90);

        pageHomeOpening(smoothDelta > 0 ? 1 : -1, smoothDelta);

        if (galleryProgress <= 0.001) showHeaderTemporarily();
        return;
      }

      if (
        document.body.dataset.page === "home" &&
        document.body.classList.contains("home-opening-complete") &&
        // Deliberate gestures only: a firmer threshold plus a short cooldown
        // after arrival, so trackpad lift-off wobble right after landing can't
        // yank the whole collage back ("two versions switching").
        event.deltaY < -48 &&
        Date.now() - workArrivedAt > 600 &&
        reenterHomeGalleryFromProjects()
      ) {
        event.preventDefault();
        showHeaderTemporarily();
        return;
      }
    },
    { passive: false }
  );

  // Click/tap advances the opening as well as scrolling. Routed through the
  // same pageHomeOpening() the wheel and swipe use, so the paging lock, the
  // 620ms hand-off and the gallery arming behave identically either way.
  // Intro screens only: once the gallery is up, a click belongs to the
  // draggable polaroids and the orange, not to paging.
  homeIntroScreens.forEach((screen) => {
    screen.addEventListener("click", (event) => {
      if (!document.body.classList.contains("home-opening-active")) return;
      if (activeIntroIndex >= homeIntroScreens.length) return;
      if (event.target.closest("a, button")) return;
      // don't page away mid text-selection
      if (String(window.getSelection?.() ?? "").length) return;
      pageHomeOpening(1);
    });
  });

  let homeTouchStartY = null;
  window.addEventListener(
    "touchstart",
    (event) => {
      homeTouchStartY = event.touches[0]?.clientY ?? null;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      // a finger dragging a hero polaroid is repositioning it, not scrolling —
      // it must never page the opening no matter how far it travels
      if (event.target instanceof Element && event.target.closest(".hh-photo")) return;
      if (isWorkLanding()) {
        event.preventDefault();
        if (homeTouchStartY === null) return;
        const currentY = event.touches[0]?.clientY ?? homeTouchStartY;
        scrubWorkLanding(homeTouchStartY - currentY);
        homeTouchStartY = currentY;
        return;
      }
      if (!document.body.classList.contains("home-opening-active") || homeTouchStartY === null) return;
      const currentY = event.touches[0]?.clientY ?? homeTouchStartY;
      const delta = homeTouchStartY - currentY;
      if (Math.abs(delta) < 60) return;
      event.preventDefault();
      pageHomeOpening(delta > 0 ? 1 : -1, delta);
      homeTouchStartY = currentY;
    },
    { passive: false }
  );

  window.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "PageDown", " ", "ArrowUp", "PageUp"].includes(event.key)) return;
    const direction = event.key === "ArrowUp" || event.key === "PageUp" ? -1 : 1;
    if (isWorkLanding()) {
      event.preventDefault();
      scrubWorkLanding(direction * 240);
      return;
    }
    if (!document.body.classList.contains("home-opening-active")) return;
    event.preventDefault();
    pageHomeOpening(direction, direction * 240);
  });

  // Scroll listener does double duty:
  // 1. A negative landing hold (section landed lower than the ride's endpoint)
  //    releases as a pure function of scrollY at half speed — the section's
  //    absolute motion stays upward, never a visible backward snap.
  // 2. Scrollbar drags / programmatic scrolls bypass the wheel handler — if the
  //    page really scrolls while a POSITIVE landing is pending, settle it on the
  //    spot so the two offsets can't stack.
  window.addEventListener(
    "scroll",
    () => {
      if (workLandingTotal < 0 && workRevealSection) {
        const eased = clamp(workLandingTotal + window.scrollY * 0.5, workLandingTotal, 0);
        if (eased >= -0.5) {
          cancelWorkLanding();
        } else {
          workLandingRemaining = eased;
          workRevealSection.style.setProperty("transform", `translateY(${eased.toFixed(1)}px)`, "important");
        }
        syncVisibleWorkCards();
        return;
      }
      if (isWorkLanding() && window.scrollY > 2) {
        cancelWorkLanding();
        syncVisibleWorkCards();
      }
    },
    { passive: true }
  );

  window.addEventListener("pointermove", (event) => {
    if (event.clientY <= 112) showHeaderTemporarily();
  }, { passive: true });

  window.addEventListener("resize", () => {
    workLandedTop = null; // landed position depends on viewport size
    // Once the opening has completed, it is FINALIZED — a resize (window drag,
    // DevTools opening, ...) must only invalidate caches, never re-run the
    // choreography. Re-running it re-probed and re-applied ride vars on the
    // settled page: the exact "landed, then shifted again" artifact.
    if (document.body.classList.contains("home-opening-complete")) return;
    setHomeGalleryProgress(galleryProgress);
  });

  if (shouldResetHomeScroll) {
    resetHomeOpening();
    // The late `load` event (heavy videos) and the initial `pageshow` must not
    // yank a visitor who already started scrolling back to the first intro
    // screen. Only a bfcache return (persisted) still resets unconditionally.
    const hasStartedOpening = () =>
      openingArmed ||
      activeIntroIndex > 0 ||
      galleryProgress > 0.001 ||
      document.body.classList.contains("home-opening-complete") ||
      // Sentence 1 mid-write (or written) counts as started: on a HARD
      // refresh the heavy video delays `load` by seconds, and the re-reset
      // used to wipe the half-written line to blank and start it over. The
      // `openingArmed` guard above extends this to the blank lead-in too —
      // the class check alone missed the run-up before the first stroke.
      !!homeIntroScreens[0]?.querySelector(".hw-writing, .is-writing, .is-done");
    window.addEventListener("pageshow", (event) => {
      if (event.persisted || !hasStartedOpening()) resetHomeOpening();
    });
    window.addEventListener("load", () => {
      if (hasStartedOpening()) return;
      resetHomeOpening();
      requestAnimationFrame(resetHomeOpening);
    });
  } else if (shouldSkipIntroFromLogo) {
    showHomeGalleryFromLogo();
  } else if (shouldStartAtWork) {
    goToWorkSection();
  } else {
    skipHomeOpening();
  }

  // publish the opening's Work-arrival fn so the global interceptor (below,
  // outside this block) can use it while the opening is still in progress
  goToWorkSectionRef = goToWorkSection;

} else if (document.body.dataset.page === "home") {
  document.body.classList.add("home-opening-complete");
  clearHomeHandoffVars();
  revealSections.forEach((section) => section.classList.add("is-visible"));
  workCards.forEach((card) => card.classList.add("is-visible"));
}

// Work nav — registered GLOBALLY (not inside the opening block, which is skipped
// under reduced motion etc.). On the home page, "Work" must feel like scrolling
// to a section, never like switching to a separate `#work` link:
//   • opening already finished → a plain smooth scroll to the section, and NO
//     `#work` stamped into the URL (that hash is what read as a link switch).
//   • opening still running    → hand off to the choreography's Work arrival.
// On other pages there is no Work section to scroll to, so the link keeps its
// default navigation to index.html#work.
if (isHomePage) {
  document.querySelectorAll('a[href="#work"], a[href="index.html#work"], a[href="/projects"], a[href="projects.html"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      sessionStorage.removeItem(HOME_LOGO_SKIP_KEY);
      // One history entry per click, so Back returns to where they were. Guarded:
      // clicking Projects while already at /projects must not stack duplicates.
      if (!isProjectsUrl()) history.pushState(null, "", PROJECTS_PATH);
      const workSection = document.querySelector(".work-section");
      if (document.body.classList.contains("home-opening-complete")) {
        workSection?.scrollIntoView({
          behavior: prefersReducedMotion.matches ? "auto" : "smooth",
          block: "start"
        });
      } else if (goToWorkSectionRef) {
        goToWorkSectionRef();
      } else {
        // no opening choreography on this load — reveal + jump to the section
        document.body.classList.add("home-opening-complete");
        revealSections.forEach((section) => section.classList.add("is-visible"));
        workCards.forEach((card) => card.classList.add("is-visible"));
        workSection?.scrollIntoView({ block: "start" });
      }
    });
  });

  // pushState above means Back is now a real affordance: going back off
  // /projects must actually leave the section, or the url would change while
  // the page sat still. Only once the opening has finished — mid-choreography
  // the scroll position belongs to the handoff, not to us.
  window.addEventListener("popstate", () => {
    if (!document.body.classList.contains("home-opening-complete")) return;
    const behavior = prefersReducedMotion.matches ? "auto" : "smooth";
    if (isProjectsUrl()) {
      document.querySelector(".work-section")?.scrollIntoView({ behavior, block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior });
    }
  });
}

document.querySelectorAll(".brand-mark").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    sessionStorage.setItem(HOME_LOGO_SKIP_KEY, "1");
    // Clean "/" so the home url never becomes /index.html.
    window.location.href = "/";
  });
});

if (revealSections.length && !prefersReducedMotion.matches) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target === workRevealSection) {
          if (document.body.classList.contains("home-opening-active")) return;
          if (entry.isIntersecting) {
            workRevealSection.classList.add("is-visible");
            syncVisibleWorkCards();
          }
          return;
        }

        if (aboutPhotoWalls.includes(entry.target)) {
          syncVisibleAboutPhotoWall();
          return;
        }

        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealSections.forEach((section) => observer.observe(section));

  if (workRevealSection) {
    let workFrame = null;
    const requestWorkSync = () => {
      if (workFrame) return;
      workFrame = requestAnimationFrame(() => {
        workFrame = null;
        if (!document.body.classList.contains("home-opening-active")) {
          syncVisibleWorkCards();
          syncWorkSceneFade();
        }
      });
    };
    window.addEventListener("scroll", requestWorkSync, { passive: true });
    window.addEventListener("resize", requestWorkSync);
  }

  if (aboutPhotoWalls.length) {
    let aboutPhotoFrame = null;

    const requestAboutPhotoSync = () => {
      if (aboutPhotoFrame) return;
      aboutPhotoFrame = requestAnimationFrame(() => {
        aboutPhotoFrame = null;
        syncVisibleAboutPhotoWall();
      });
    };

    syncVisibleAboutPhotoWall();
    window.addEventListener("scroll", requestAboutPhotoSync, { passive: true });
    window.addEventListener("resize", requestAboutPhotoSync);
  }
} else {
  revealSections.forEach((section) => section.classList.add("is-visible"));
  workCards.forEach((card) => card.classList.add("is-visible"));
}

/* ============================================================
   Studio "What we do" — directional vertical masked roll on hover.
   The center menu stays fixed; hovering a row rolls the left aside
   (thumb + caption) and the right big label content in/out inside
   overflow-hidden masks, with direction following the menu movement.
   Self-contained and guarded — touches nothing else.
   ============================================================ */
(() => {
  const list = document.querySelector(".studio-service-list");
  if (!list) return;

  const rows = Array.from(list.querySelectorAll(".studio-service"));
  if (!rows.length) return;

  // Wrap each dynamic block's content in a .studio-roll-inner so the mask can clip the roll.
  rows.forEach((row) => {
    row.querySelectorAll(".studio-service-media, .studio-service-caption, .studio-service-big").forEach((mask) => {
      const inner = document.createElement("span");
      inner.className = "studio-roll-inner";
      while (mask.firstChild) inner.appendChild(mask.firstChild);
      mask.appendChild(inner);
    });
  });

  // Wrap each menu label in its own mask so it can roll up on first reveal (bullet stays outside).
  rows.forEach((row) => {
    const name = row.querySelector(".studio-service-name");
    if (!name) return;
    const roll = document.createElement("span");
    roll.className = "studio-name-roll";
    const inner = document.createElement("span");
    inner.className = "studio-name-inner";
    while (name.firstChild) inner.appendChild(name.firstChild);
    roll.appendChild(inner);
    name.appendChild(roll);
  });

  const innersOf = (row) => row.querySelectorAll(".studio-roll-inner");
  const IN = "translateY(0)";
  const BELOW = "translateY(110%)";
  const ABOVE = "translateY(-110%)";

  let activeIndex = 0;

  // Initial state: first row active (shown), the rest parked below the mask — no animation.
  rows.forEach((row, i) => {
    const active = i === 0;
    row.classList.toggle("is-active", active);
    innersOf(row).forEach((el) => {
      el.style.transition = "none";
      el.style.transform = active ? IN : BELOW;
    });
  });
  void list.offsetHeight; // commit the parked positions
  rows.forEach((row) => innersOf(row).forEach((el) => { el.style.removeProperty("transition"); }));

  const setActive = (nextIndex) => {
    if (nextIndex === activeIndex || nextIndex < 0 || nextIndex >= rows.length) return;
    const goingDown = nextIndex > activeIndex;
    const oldRow = rows[activeIndex];
    const newRow = rows[nextIndex];

    // Outgoing content leaves in the direction of travel.
    innersOf(oldRow).forEach((el) => {
      el.style.removeProperty("transition");
      el.style.transform = goingDown ? ABOVE : BELOW;
    });

    // Incoming content is parked on the opposite side, then rolled into place.
    innersOf(newRow).forEach((el) => {
      el.style.transition = "none";
      el.style.transform = goingDown ? BELOW : ABOVE;
    });
    void newRow.offsetHeight; // commit the start position before animating
    innersOf(newRow).forEach((el) => {
      el.style.removeProperty("transition");
      el.style.transform = IN;
    });

    oldRow.classList.remove("is-active");
    newRow.classList.add("is-active");
    activeIndex = nextIndex;
  };

  // Touch tiers (iPad / iPhone) switch by TAP; desktop keeps hover. Same media
  // terms as the CSS so the two drivers never both fire on one viewport.
  const stackedServicesMq = window.matchMedia(
    "(max-width: 1080px), (max-width: 1180px) and (orientation: portrait)"
  );

  rows.forEach((row, i) => {
    // desktop: hover previews the row
    row.addEventListener("mouseenter", () => {
      if (!stackedServicesMq.matches) setActive(i);
    });
    // tablet / phone: a tap selects it (no hover, no scroll hijack)
    row.addEventListener("click", () => {
      if (stackedServicesMq.matches) setActive(i);
    });
  });

  // Roll the menu labels up the first time the section scrolls into view.
  const services = document.querySelector(".studio-services");
  if (services) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadyInView = services.getBoundingClientRect().top < window.innerHeight * 0.85;
    if (reduce || alreadyInView) {
      // Section is already on screen (or reduced motion) — show labels without arming the roll.
    } else {
      services.classList.add("studio-roll-armed");
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            services.classList.add("is-revealed");
            obs.disconnect();
          }
        });
      }, { threshold: 0.2 });
      io.observe(services);
    }
  }
})();

/* ============================================================
   Work-section cover pin (home only). The sticky pin offset is
   viewportHeight - workHeight (a negative number) so the work section
   scrolls normally until its bottom reaches the viewport bottom, then pins
   and HOLDS while the studio screens rise over it. What rises is no longer a
   panel — the studio block is page-white — so the visitor sees only the
   hand-drawn horizon line sweeping up over the held scene.
   ============================================================ */
(() => {
  if (document.body.dataset.page !== "home") return;
  const work = document.querySelector(".work-section");
  if (!work) return;

  const lastGray = document.querySelector(".studio-services");
  const updatePin = () => {
    const pin = Math.min(0, window.innerHeight - work.offsetHeight);
    document.documentElement.style.setProperty("--work-sticky-top", `${pin}px`);
    // Pull the mascot screen up by exactly the last gray screen's height so it starts
    // fully covered, then gets uncovered as that gray screen slides up (see .home-end).
    if (lastGray) {
      document.documentElement.style.setProperty("--home-end-pull", `-${lastGray.offsetHeight}px`);
    }
  };

  updatePin();
  window.addEventListener("load", updatePin);
  window.addEventListener("resize", updatePin, { passive: true });
})();

/* ============================================================
   Studio fade (home only). The intro paragraph and the "What I like"
   content fade in as their section nears the viewport center and fade
   back out as it leaves — a gentle in/out as each panel arrives.
   ============================================================ */
(() => {
  if (document.body.dataset.page !== "home") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const pairs = [
    [document.querySelector(".studio-intro"), document.querySelector(".studio-intro-inner")],
    [document.querySelector(".studio-services"), document.querySelector(".studio-services-inner")]
  ].filter((pair) => pair[0] && pair[1]);

  // The gray studio panel stays SOLID; the mascot content (marquee + footer) is what
  // fades in as that solid panel slides up and off it.
  const lastGray = document.querySelector(".studio-services");
  const mascotBits = [
    document.querySelector(".marquee-viewport"),
    document.querySelector(".reach-note"),
    document.querySelector(".home-end .site-footer")
  ].filter(Boolean);
  if (!pairs.length && !mascotBits.length) return;

  let frame = null;
  const apply = () => {
    frame = null;
    const vh = window.innerHeight;
    pairs.forEach(([section, inner]) => {
      const rect = section.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(center - vh / 2);
      // full opacity while the section center is within ~0.22vh of the viewport
      // center, fading to 0 by ~0.62vh away.
      const opacity = Math.max(0, Math.min(1, 1 - (dist - vh * 0.22) / (vh * 0.4)));
      inner.style.opacity = opacity.toFixed(3);
    });

    // Reveal handoff: the gray studio panel stays fully solid and slides up (CSS sticky)
    // to uncover the pinned mascot screen. Dissolve the mascot content in with the reveal
    // progress (0 = still covered, 1 = fully uncovered), and back out on the way up.
    if (lastGray && mascotBits.length) {
      if (document.body.classList.contains("home-opening-complete")) {
        const svH = lastGray.offsetHeight || vh;
        const p = Math.max(0, Math.min(1, -lastGray.getBoundingClientRect().top / svH));
        mascotBits.forEach((el) => { el.style.opacity = p.toFixed(3); });
      } else {
        mascotBits.forEach((el) => { el.style.opacity = ""; });
      }
    }
  };
  const request = () => { if (!frame) frame = requestAnimationFrame(apply); };

  apply();
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
})();

/* ============================================================
   Marquee mascots — curious-eye autonomy + off-screen pausing.
   One shared timer cycles every curious mascot's eyes toward the
   corners (in px, scaled to the body, so the up/down reach matches the
   home mascot; CSS transition smooths each move). CSS handles the other
   seven variants. An IntersectionObserver pauses all mascot motion while
   the carousel is off-screen. (The carousel scroll itself is pure CSS and
   always running, so it's already in motion when reached.)
   ============================================================ */
(() => {
  const section = document.querySelector(".marquee-section");
  if (!section) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const curiousEyeGroups = Array.from(document.querySelectorAll(".mascot--curious .mascot-eyes"));
  const curiousEyeDots = Array.from(document.querySelectorAll(".mascot--curious .mascot-eye"));
  const curiousBody = document.querySelector(".mascot--curious .mascot-body");

  // fractional corner targets; scaled to px against the body so the reach is large
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]];
  let cornerIdx = 0;
  let lookTimer = null;
  let blinkTimer = null;

  const look = () => {
    const [fx, fy] = corners[cornerIdx % corners.length];
    const w = curiousBody ? curiousBody.getBoundingClientRect().width : 180;
    const maxX = w * 0.2;
    const maxY = w * 0.14;
    curiousEyeGroups.forEach((group) => {
      group.style.setProperty("--lx", `${(fx * maxX).toFixed(1)}px`);
      group.style.setProperty("--ly", `${(fy * maxY).toFixed(1)}px`);
    });
    cornerIdx += 1;
  };

  const blink = () => {
    curiousEyeDots.forEach((dot) => {
      dot.style.transform = "scaleY(0.1)";
      window.setTimeout(() => { dot.style.transform = ""; }, 130);
    });
  };

  const startCurious = () => {
    if (reduce.matches || lookTimer || !curiousEyeGroups.length) return;
    look();
    lookTimer = window.setInterval(look, 1600);
    blinkTimer = window.setInterval(() => { if (Math.random() < 0.7) blink(); }, 3400);
  };

  const stopCurious = () => {
    window.clearInterval(lookTimer);
    window.clearInterval(blinkTimer);
    lookTimer = null;
    blinkTimer = null;
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const visible = entry.isIntersecting;
      section.classList.toggle("is-mascot-paused", !visible);
      if (visible) startCurious();
      else stopCurious();
    });
  }, { threshold: 0 });

  io.observe(section);
})();

/* ============================================================
   Hero polaroids (home): free drag / reposition, with a fridge-magnet feel.
   Dragging writes the independent `translate` property, so the frames'
   resting rotate (in `transform`) is never touched. The frame is clamped so
   at least half of it always stays inside the stage — a photo can be tossed
   around but never lost. Nothing persists: a reload deals the desk afresh.

   The magnet feel is one spring, retuned per phase:
     hold    — pressed but still "on the fridge": the frame gives only a
               fraction of the finger's motion (magnetic resistance)
     peel    — past the give threshold it pops free: the spring catches the
               frame up to the finger, reading as the detach
     carry   — the spring follows the finger with a slight lag + a touch of
               velocity tilt: weight, not float
     attach  — on release the spring stiffens and re-grips at the CURRENT
               spot (no grid, no return home) with a small overshoot and a
               brief press past scale 1 — the magnet clicking back on
   ============================================================ */
(() => {
  if (document.body.dataset.page !== "home") return;
  const stage = document.querySelector(".home-gallery-stage");
  const photos = Array.from(document.querySelectorAll(".hh-photo"));
  if (!stage || !photos.length) return;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  let zTop = 10; // the last-touched photo rises above its siblings

  /* ---- the feel, in four dials ---- */
  const HOLD_GIVE = 0.32;   // how much the frame budges while still attached
  const PEEL_PX = 11;       // finger travel that peels it off the fridge
  const CARRY = { k: 360, c: 27 };  // follow spring: ~24px lag at a normal drag speed
  const ATTACH = { k: 420, c: 26 }; // settle spring: ζ≈0.63 → ~7% overshoot, done in ~300ms
  const LAND_KICK = 90;     // px/s downward impulse on release ≈ a 3px sit-down dip
  const TILT_GAIN = 0.010;  // deg per px/s of horizontal velocity while carried
  const TILT_MAX = 3.5;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- squishing the resident: how much of the dome a photo covers.
     coverage = intersection(photo frame, dome box) / dome area, taken as the
     MAX across all three photos (two half-covers don't add up to a squish).
     Hysteresis so the caption can't flicker at the boundary: enters at 30%,
     recovers below 15%. Evaluated per animation frame while any photo is in
     flight and at every release — so a photo PARKED on the dome keeps the
     state, and it lifts the moment the photo is carried away. The creature's
     own module listens for the event and does the acting. ---- */
  const orangeBody = document.querySelector(".home-orange-wrap .orange-body");
  const SQUISH_ENTER = 0.30;
  const SQUISH_EXIT = 0.15;
  let orangeSquished = false;

  const syncOrangeSquish = () => {
    if (!orangeBody) return;
    const ob = orangeBody.getBoundingClientRect();
    const area = ob.width * ob.height;
    if (!area) return; // dome not on stage right now — keep the last state
    let cover = 0;
    for (const p of photos) {
      const r = p.getBoundingClientRect();
      const w = Math.min(r.right, ob.right) - Math.max(r.left, ob.left);
      const h = Math.min(r.bottom, ob.bottom) - Math.max(r.top, ob.top);
      if (w > 0 && h > 0) cover = Math.max(cover, (w * h) / area);
    }
    const next = orangeSquished ? cover >= SQUISH_EXIT : cover >= SQUISH_ENTER;
    if (next === orangeSquished) return;
    orangeSquished = next;
    window.dispatchEvent(new CustomEvent("orange-photo-squish", { detail: { squished: next } }));
  };

  photos.forEach((photo) => {
    // rendered state (what's on screen) vs target (where the finger says to be)
    let x = parseFloat(photo.dataset.dx || "0");
    let y = parseFloat(photo.dataset.dy || "0");
    let vx = 0, vy = 0;
    let tx = x, ty = y;
    let scale = 1, scaleV = 0, scaleT = 1;

    let phase = "rest"; // rest | hold | carry | attach
    let startX = 0, startY = 0;
    let baseX = 0, baseY = 0;
    let originLeft = 0, originTop = 0; // untranslated screen spot at grab time
    let w = 0, h = 0;
    let frame = null;
    let lastT = 0;

    const clampToStage = (nx, ny) => {
      const sr = stage.getBoundingClientRect();
      return [
        clamp(nx, sr.left - originLeft - w * 0.5, sr.right - originLeft - w * 0.5),
        clamp(ny, sr.top - originTop - h * 0.5, sr.bottom - originTop - h * 0.5)
      ];
    };

    const paint = () => {
      photo.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      photo.style.setProperty("--mag-scale", scale.toFixed(4));
      const tilt = phase === "carry" ? clamp(vx * TILT_GAIN, -TILT_MAX, TILT_MAX) : 0;
      photo.style.setProperty("--mag-tilt", `${tilt.toFixed(2)}deg`);
    };

    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastT = 0;
    };

    const settled = () =>
      phase === "attach" &&
      Math.abs(tx - x) < 0.3 && Math.abs(ty - y) < 0.3 &&
      Math.abs(vx) + Math.abs(vy) < 6 &&
      Math.abs(scaleT - scale) < 0.002 && Math.abs(scaleV) < 0.02;

    const tick = (t) => {
      frame = null;
      const dt = Math.min(32, lastT ? t - lastT : 16.7) / 1000;
      lastT = t;
      const s = phase === "carry" ? CARRY : ATTACH;

      // semi-implicit Euler on both springs — stable at these stiffnesses
      vx += (s.k * (tx - x) - s.c * vx) * dt;
      vy += (s.k * (ty - y) - s.c * vy) * dt;
      x += vx * dt;
      y += vy * dt;
      scaleV += (ATTACH.k * (scaleT - scale) - ATTACH.c * scaleV) * dt;
      scale += scaleV * dt;

      if (settled()) {
        x = tx; y = ty; vx = vy = 0;
        scale = scaleT; scaleV = 0;
        phase = "rest";
        paint();
        photo.style.removeProperty("--mag-tilt");
        syncOrangeSquish();
        stop();
        return;
      }
      paint();
      syncOrangeSquish();
      frame = requestAnimationFrame(tick);
    };

    const run = () => {
      if (frame === null) frame = requestAnimationFrame(tick);
    };

    photo.addEventListener("pointerdown", (event) => {
      if (event.button) return;
      startX = event.clientX;
      startY = event.clientY;
      baseX = parseFloat(photo.dataset.dx || "0");
      baseY = parseFloat(photo.dataset.dy || "0");
      const rect = photo.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      originLeft = rect.left - rect.width * (scale - 1) / 2 - x; // undo scale's rect inflation
      originTop = rect.top - rect.height * (scale - 1) / 2 - y;
      phase = "hold";
      scaleT = 0.985; // pressed against the fridge
      photo.style.zIndex = String(++zTop);
      try { photo.setPointerCapture(event.pointerId); } catch (e) { /* older browsers */ }
      event.preventDefault(); // no text selection / native image drag
      if (!reduceMotion) run();
    });

    photo.addEventListener("pointermove", (event) => {
      if (phase !== "hold" && phase !== "carry") return;
      const fdx = event.clientX - startX;
      const fdy = event.clientY - startY;

      if (reduceMotion) { // plain 1:1 drag, no physics
        [tx, ty] = clampToStage(baseX + fdx, baseY + fdy);
        x = tx; y = ty;
        photo.dataset.dx = String(tx);
        photo.dataset.dy = String(ty);
        photo.style.translate = `${tx}px ${ty}px`;
        phase = "carry";
        syncOrangeSquish();
        return;
      }

      if (phase === "hold") {
        if (Math.hypot(fdx, fdy) < PEEL_PX) {
          // still gripped: the frame strains toward the finger but holds on
          [tx, ty] = clampToStage(baseX + fdx * HOLD_GIVE, baseY + fdy * HOLD_GIVE);
          return;
        }
        // pop! free of the fridge — lift, shadow, and let the spring catch up
        phase = "carry";
        photo.classList.add("is-dragging");
        scaleT = 1.03;
      }

      [tx, ty] = clampToStage(baseX + fdx, baseY + fdy);
    });

    const release = () => {
      if (phase === "rest") return;
      photo.classList.remove("is-dragging");

      if (reduceMotion) {
        phase = "rest";
        return;
      }

      if (phase === "hold") {
        // never peeled off — it stays put and relaxes back onto the fridge
        tx = baseX;
        ty = baseY;
      } else {
        vy += LAND_KICK;   // the little downward "sit" as the magnet re-grips
        scaleV -= 1.1;     // and a brief press past 1 (dips to ~0.994) — the click
      }
      // re-attach AT the release spot: free placement, no grid, no homing
      photo.dataset.dx = String(tx);
      photo.dataset.dy = String(ty);
      scaleT = 1;
      phase = "attach";
      run();
      syncOrangeSquish();
    };
    photo.addEventListener("pointerup", release);
    photo.addEventListener("pointercancel", release);
  });
})();
