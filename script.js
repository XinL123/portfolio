const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-toggle");
const themeButton = document.querySelector(".pull-chain");
const orangeStage = document.querySelector(".orange-stage");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const HOME_LOGO_SKIP_KEY = "portfolio-logo-skip-intro";

const navigationEntry = performance.getEntriesByType("navigation")[0];
const isPageReload = navigationEntry?.type === "reload";

if (isPageReload) {
  sessionStorage.removeItem(HOME_LOGO_SKIP_KEY);

  if (document.body.dataset.page === "home") {
    // 包括 index.html#work，刷新后也回到开场
    history.replaceState(null, "", window.location.pathname);
  } else {
    // 其他页面刷新后返回主页
    window.location.replace("index.html");
  }
}

const applyTheme = (theme) => {
  document.body.dataset.theme = theme;
  // keep <html> in sync with <body>: the head boot script stamps <html> before
  // first paint, and the html[data-theme="dark"] CSS keys off it — a stale
  // value there would fight the body theme after a pull-chain toggle
  document.documentElement.dataset.theme = theme;

  if (themeButton) {
    const isDark = theme === "dark";
    themeButton.setAttribute("aria-pressed", String(isDark));
    themeButton.setAttribute(
      "aria-label",
      isDark ? "Pull chain to switch to light mode" : "Pull chain to switch to dark mode"
    );
  }
};

// Theme is NOT persisted across page loads: every refresh / navigation starts
// in light mode. The pull-chain still toggles dark live (see themeButton), but
// the choice is deliberately not remembered — a refresh always returns to light,
// which also sidesteps the dark-mode flash during the opening scroll.
applyTheme("light");

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
    header.classList.toggle("nav-open", isOpen);
    document.body.classList.toggle("nav-lock", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");

    if (isOpen) {
      lockedScrollY = window.scrollY;
      document.body.style.top = `-${lockedScrollY}px`;
      return;
    }

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
    if (!vibeNote) return;
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

  const spawnHeart = () => {
    if (prefersReducedMotion.matches) return;
    const heart = document.createElement("span");
    heart.className = "orange-heart";
    heart.textContent = "♥";
    heart.style.left = `${18 + Math.random() * 64}%`;
    heart.style.rotate = `${(Math.random() * 28 - 14).toFixed(1)}deg`;
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
  const HEART_AFTER_MS = 1600; // it only dares show the heart if this goes on

  let petLingerTimer = null;
  let petHeartTimer = null;
  let lastRubX = null;
  let lastRubDir = 0;
  let rubReversals = 0;

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
  };

  const startPetting = () => {
    if (busy() || petting()) return;
    clearBody();
    orangeStage.classList.add("is-petted");
    dough.classList.add("is-petted");
    petHeartTimer = window.setTimeout(spawnHeart, HEART_AFTER_MS);
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
    if (lastRubX === null || Math.abs(x - lastRubX) > RUB_MIN_STEP) lastRubX = x;

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
    if (now < hoverCooldownUntil || busy() || petting()) return;
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
      if (pressStart && !petting() && !busy()) {
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
        quiet && onStage && !busy() && !petting() && !holdActive &&
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

  scheduleBlink(900 + Math.random() * 1800);
}

const revealSections = document.querySelectorAll(".reveal-section");
const workRevealSection = document.querySelector(".work-section.reveal-section");
const workScene = document.querySelector(".work-section .pc-scene");
const workCards = Array.from(document.querySelectorAll('body[data-page="home"] .work-card'));
const aboutPhotoWalls = Array.from(document.querySelectorAll('body[data-page="about"] .photo-wall.reveal-section'));
const homeIntroScreens = Array.from(document.querySelectorAll('body[data-page="home"] .home-intro-screen'));
const homeGalleryScreen = document.querySelector('body[data-page="home"] .home-gallery-screen');
const homeGalleryStage = document.querySelector('body[data-page="home"] .home-gallery-stage');
const homeGalleryPhotos = Array.from(document.querySelectorAll('body[data-page="home"] [data-home-photo]'));
const homeMainPhoto = document.querySelector('body[data-page="home"] [data-home-photo="main"]');
const homeOrangeWrap = document.querySelector('body[data-page="home"] .home-orange-wrap');

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
const shouldStartAtWork =
  isHomePage && window.location.hash === "#work";

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

// Scroll-linked fade for the Selected-projects (clothesline) scene: it eases in
// as you slide toward it and eases out as it leaves — a gentle 渐隐渐入. Opacity is
// a pure function of the SCENE's own viewport position (the section itself pins
// via position:sticky, so its rect.top is not a reliable travel signal; the scene
// still scrolls up and off before the pin). Scrubs with the wheel, never plays on
// its own; the opening choreography owns opacity while it runs.
const syncWorkSceneFade = () => {
  if (!workScene || !workRevealSection) return;
  if (document.body.classList.contains("home-opening-active")) return;
  if (prefersReducedMotion.matches) {
    workScene.style.removeProperty("opacity");
    return;
  }
  const vh = window.innerHeight || 1;
  // During the completion landing the section carries a temporary translateY
  // (finishHomeOpening's FLIP glide). Measure the scene AS IF settled — otherwise
  // its rect.top reads a screenful too low, this fade computes op<1, and the
  // scene dips then restores as the glide lands: a second flicker on top of the
  // handoff's fade-in. Same compensation syncVisibleWorkCards already applies.
  let glideY = 0;
  if (workRevealSection) {
    const t = getComputedStyle(workRevealSection).transform;
    if (t && t !== "none") {
      const m = t.match(/matrix\(([^)]+)\)/);
      if (m) glideY = parseFloat(m[1].split(",")[5]) || 0;
    }
  }
  const top = workScene.getBoundingClientRect().top - glideY;
  // Full while the scene rests in the upper viewport (its landed top ≈ 90px);
  // fade out as it rises off the top, fade in as it drops in from below.
  const op = top <= 0
    ? Math.max(0, Math.min(1, 1 + top / (vh * 0.5)))
    : Math.max(0, Math.min(1, 1 - (top - vh * 0.15) / (vh * 0.6)));
  workScene.style.opacity = op.toFixed(3);
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
  let introTypingTimer = null;
  let galleryProgress = 0;
  let homeRevealProgress = 0;
  let galleryBaseRects = null;
  let galleryArmed = false;
  let galleryReadyAt = 0;
  let headerHideTimer = null;
  let isLogoReturnAnimation = false;
  const GALLERY_PROGRESS_MAX = 1.9;
  const GALLERY_RELEASE_PROGRESS = 1.86;
  const GALLERY_WHEEL_UNIT = 760;
  const GALLERY_TOUCH_UNIT = 620;

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

  // During the handoff ride, drive each card's opacity with the SAME
  // as-if-settled scrub formula syncVisibleWorkCards uses after completion
  // (measured against where the section will land, not where it currently
  // rides). Without this, cards below the settle line sat at full handoff
  // opacity during the ride and then SNAPPED dimmer at the release swap — the
  // "one version of the projects appears, then another replaces it" artifact.
  // The section-level handoff fade still multiplies on top via the parent.
  const syncRideCardOpacities = (cardLag = 0) => {
    if (!workCards.length || !workRevealSection || workLandedTop === null) return;
    const vh = window.innerHeight;
    const enterLine = vh * 0.92;
    const settleLine = vh * 0.66;
    const rideOffset = workRevealSection.getBoundingClientRect().top - workLandedTop;
    workCards.forEach((card) => {
      // cardLag = the card's own handoff translateY (y * 0.55) — it is part of
      // the measured rect but must not count against the settled position.
      const top = card.getBoundingClientRect().top - rideOffset - cardLag;
      const progress = clamp((enterLine - top) / (enterLine - settleLine), 0, 1);
      card.style.transition = "none";
      card.style.opacity = progress.toFixed(3);
    });
  };

  const getWorkHandoffViewportY = () => {
    const styles = getComputedStyle(document.documentElement);
    const y = Number.parseFloat(styles.getPropertyValue("--home-work-section-y"));
    const handoffTop = Math.min(window.innerHeight * 0.64, 700);
    return handoffTop + (Number.isFinite(y) ? y : 0);
  };

  const getTypingDelay = (text) => {
    const targetDuration = 1450;
    const delay = targetDuration / Math.max(text.length, 1);
    return Math.max(32, Math.min(130, delay));
  };

  const typeIntroLine = (line) => {
    if (!line) return;
    const text = line.dataset.text || "";
    window.clearTimeout(introTypingTimer);
    line.textContent = "";
    line.classList.remove("is-done");
    line.classList.add("is-typing");

    const delay = getTypingDelay(text);
    let index = 0;

    const tick = () => {
      line.textContent = text.slice(0, index);
      index += 1;

      if (index <= text.length) {
        introTypingTimer = window.setTimeout(tick, delay + Math.random() * 18);
      } else {
        line.classList.remove("is-typing");
        line.classList.add("is-done");
      }
    };

    introTypingTimer = window.setTimeout(tick, 300);
  };

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
    activeIntroIndex = clamp(nextIndex, 0, homeIntroScreens.length);
    const isGallery = activeIntroIndex >= homeIntroScreens.length;
    document.body.classList.toggle("home-gallery-active", isGallery);

    homeIntroScreens.forEach((screen, index) => {
      screen.classList.toggle("is-active", index === activeIntroIndex);
    });

    if (isGallery) {
      window.clearTimeout(introTypingTimer);
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
      incomingLine.textContent = "";
      incomingLine.classList.remove("is-typing", "is-done");
    }

    window.setTimeout(() => typeIntroLine(incomingLine), 620);
  };

  const captureGalleryRects = () => {
    if (!homeGalleryStage) return null;
    const stageRect = homeGalleryStage.getBoundingClientRect();
    const rects = {};

    homeGalleryPhotos.forEach((photo) => {
      const rect = photo.getBoundingClientRect();
      rects[photo.dataset.homePhoto] = {
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2
      };
    });

    const orangeRect = homeOrangeWrap?.getBoundingClientRect() || orangeStage?.getBoundingClientRect();
    if (orangeRect) {
      rects.orange = {
        width: orangeRect.width,
        height: orangeRect.height,
        centerX: orangeRect.left + orangeRect.width / 2,
        centerY: orangeRect.top + orangeRect.height / 2
      };
    }

    return { stageRect, rects };
  };

  const resetHomeGalleryStyles = () => {
    homeGalleryPhotos.forEach((photo) => {
      photo.style.transform = "";
      photo.style.filter = "";
      photo.style.opacity = "";
      photo.style.zIndex = "";
    });

    if (homeOrangeWrap) {
      homeOrangeWrap.style.opacity = "";
      homeOrangeWrap.style.transform = "";
      homeOrangeWrap.style.filter = "";
    } else if (orangeStage?.closest(".home-gallery-screen")) {
      orangeStage.style.opacity = "";
      orangeStage.style.transform = "";
      orangeStage.style.filter = "";
    }
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
    const revealProgress = clamp(progress, 0, 1);
    const exitProgress = clamp(progress - 1, 0, 1);
    const eased = easeOutCubic(revealProgress);
    const exitEase = easeOutCubic(exitProgress);
    const workHandoffProgress = clamp((exitProgress - 0.12) / 0.74, 0, 1);
    const workHandoffEase = easeOutCubic(workHandoffProgress);

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
    document.documentElement.style.setProperty("--home-work-section-y", `${260 * (1 - workHandoffEase)}px`);

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
      syncRideCardOpacities(260 * (1 - ride) * 0.55);

      // Bring the header home early in the ride — if it only reappears at the
      // completion swap, its slide-in reads as a top-of-screen mode switch right
      // where the section heading is landing.
      if (u > 0.1 && header?.classList.contains("is-auto-hidden")) {
        window.clearTimeout(headerHideTimer);
        header.classList.remove("is-auto-hidden");
      }
    }

    if (!homeGalleryStage || !homeMainPhoto) return;

    if (progress > 0.001 && !galleryBaseRects) {
      galleryBaseRects = captureGalleryRects();
    }

    if (progress <= 0.001) {
      galleryBaseRects = null;
      resetHomeGalleryStyles();
      clearHomeHandoffVars();
      document.body.classList.remove("home-work-handoff");
      return;
    }

    const base = galleryBaseRects || captureGalleryRects();
    if (!base) return;

    const { stageRect, rects } = base;
    const stageCenterX = stageRect.left + stageRect.width / 2;
    const viewportWidth = window.innerWidth || stageRect.width;
    const targetMainWidth = Math.min(viewportWidth * 0.84, stageRect.width * 0.9, 1320);
    const targetCenterX = stageCenterX;
    const targetCenterY = stageRect.top + stageRect.height * 0.44;

    homeGalleryPhotos.forEach((photo) => {
      const key = photo.dataset.homePhoto;
      const rect = rects[key];
      if (!rect) return;

      if (key === "main") {
        const scale = 1 + ((targetMainWidth / rect.width) - 1) * eased;
        const dx = (targetCenterX - rect.centerX) * eased;
        const revealDy = (targetCenterY - rect.centerY) * eased;
        const exitDy = -stageRect.height * 1.14 * exitEase;
        photo.style.transform = `translate(${dx}px, ${revealDy + exitDy}px) scale(${scale})`;
        photo.style.filter = "blur(0px)";
        photo.style.opacity = String(clamp(1 - exitProgress * 1.2, 0, 1));
        photo.style.zIndex = "9";
        return;
      }

      const directionX = rect.centerX < stageCenterX ? -1 : 1;
      const directionY = rect.centerY < stageRect.top + stageRect.height / 2 ? -1 : 1;
      const distanceX = stageRect.width * (0.12 + Math.abs(rect.centerX - stageCenterX) / stageRect.width * 0.26);
      const distanceY = stageRect.height * (0.12 + Math.abs(rect.centerY - (stageRect.top + stageRect.height / 2)) / stageRect.height * 0.24);
      photo.style.transform = `translate(${directionX * distanceX * eased}px, ${directionY * distanceY * eased}px) scale(${1 - 0.14 * eased})`;
      photo.style.filter = isLogoReturnAnimation
         ? "blur(0px)"
         : `blur(${18 * revealProgress}px)`;
      photo.style.opacity = isLogoReturnAnimation
         ? "1"
         : String(clamp(1 - revealProgress, 0, 1));
      photo.style.zIndex = "2";
    });

    if (homeOrangeWrap) {
      homeOrangeWrap.style.opacity = String(clamp(1 - revealProgress * 1.15, 0, 1));
      homeOrangeWrap.style.transform = `translateY(${-42 * eased}px) scale(${1 - 0.08 * eased})`;
      homeOrangeWrap.style.filter = `blur(${8 * revealProgress}px)`;
    } else if (orangeStage?.closest(".home-gallery-screen")) {
      orangeStage.style.opacity = String(clamp(1 - revealProgress * 1.15, 0, 1));
      orangeStage.style.transform = `translateY(${-42 * eased}px) scale(${0.72 - 0.08 * eased})`;
      orangeStage.style.filter = `blur(${8 * revealProgress}px)`;
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

  /* Input smoothing: wheel/touch deltas only move a TARGET; a rAF loop eases
     the displayed progress toward it (frame-rate-independent lerp). This is
     what makes the transition feel like real page scrolling instead of
     teleporting — a notched mouse wheel jumps the target by ~0.16 progress
     per click, and without this layer every click was a visible lurch. It
     also collapses the per-event style writes (which used to run several
     times per frame, each forcing layout through syncRideCardOpacities'
     rect reads) into exactly one write per animation frame. */
  let galleryTargetProgress = 0;
  let galleryPendingRelease = false;
  let gallerySmoothFrame = null;
  let gallerySmoothTimer = null;
  let gallerySmoothLastT = 0;

  const gallerydriftStop = () => {
    if (gallerySmoothFrame) cancelAnimationFrame(gallerySmoothFrame);
    gallerySmoothFrame = null;
    window.clearTimeout(gallerySmoothTimer);
    gallerySmoothTimer = null;
    gallerySmoothLastT = 0;
    galleryPendingRelease = false;
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
    const dt = Math.min(48, gallerySmoothLastT ? t - gallerySmoothLastT : 16.7);
    gallerySmoothLastT = t;
    const diff = galleryTargetProgress - galleryProgress;

    if (Math.abs(diff) < 0.0008) {
      if (diff !== 0) setHomeGalleryProgress(galleryTargetProgress);
      gallerySmoothLastT = 0;
      if (galleryPendingRelease && galleryProgress >= GALLERY_RELEASE_PROGRESS - 0.001) {
        galleryPendingRelease = false;
        finishHomeOpening(0);
      }
      return;
    }

    // ~0.18 per 60fps frame ≈ a 150-200ms glide — the feel of native smooth scroll
    const ease = 1 - Math.pow(1 - 0.18, dt / 16.7);
    setHomeGalleryProgress(galleryProgress + diff * ease);
    scheduleGallerySmooth();
  };

  const applyHomeGalleryDelta = (delta, unit = GALLERY_WHEEL_UNIT) => {

    if (!galleryArmed || Date.now() < galleryReadyAt) return;

    if (delta > 0) {
      rideReverseAccum = 0;
    } else if (delta < 0 && galleryProgress > 1.12) {
      rideReverseAccum += -delta;
      if (rideReverseAccum < RIDE_REVERSE_THRESHOLD) {
        traceOpening("wobble-swallowed", { delta: Math.round(delta), accum: Math.round(rideReverseAccum) });
        return;
      }
    }

    const nextTarget = clamp(galleryTargetProgress + delta / unit, 0, GALLERY_PROGRESS_MAX);

    if (nextTarget >= GALLERY_RELEASE_PROGRESS) {
      // park the target at the release point; the smoother glides there and
      // completes on arrival — the ease-out ride is already ~stationary then,
      // so the settle-then-native-scroll baton pass has no visible seam
      galleryTargetProgress = GALLERY_RELEASE_PROGRESS;
      galleryPendingRelease = true;
    } else {
      galleryTargetProgress = nextTarget;
      galleryPendingRelease = false;
    }

    scheduleGallerySmooth();
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
    resetHomeGalleryStyles();
    homeGalleryScreen?.getBoundingClientRect();
    galleryBaseRects = captureGalleryRects();
    gallerydriftStop();
    galleryTargetProgress = 1;
    setHomeGalleryProgress(1);
    showHeaderTemporarily();

    return true;
  };

  const pageHomeOpening = (direction, delta = 0, unit = GALLERY_WHEEL_UNIT) => {
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

    applyHomeGalleryDelta(delta || direction * 180, unit);
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

      history.replaceState(null, "", "index.html#work");
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
  
    // 先获得照片原始位置
    resetHomeGalleryStyles();
    galleryBaseRects = null;
  
    requestAnimationFrame(() => {
      galleryBaseRects = captureGalleryRects();

      isLogoReturnAnimation = true;
  
      // 先直接呈现滚动扩散后的状态
      setHomeGalleryProgress(1);
  
      requestAnimationFrame(() => {
        const duration = 650;
        const startTime = performance.now();
  
        const reverseGalleryAnimation = (currentTime) => {
          const elapsed = currentTime - startTime;
          const rawProgress = clamp(elapsed / duration, 0, 1);
  
          // 先快后慢
          const easedProgress = 1 - Math.pow(1 - rawProgress, 4);
  
          // 从 progress 1 倒放至 progress 0
          setHomeGalleryProgress(1 - easedProgress);
  
          if (rawProgress < 1) {
            requestAnimationFrame(reverseGalleryAnimation);
            return;
          }
  
          setHomeGalleryProgress(0);
          isLogoReturnAnimation = false;

          document.body.classList.remove("home-gallery-revealing");

          // 归位后恢复主页原有滚动操作
          galleryProgress = 0;
          galleryTargetProgress = 0;
          gallerydriftStop();
          galleryArmed = false;
          galleryReadyAt = Date.now() + 500;
  
          showHeaderTemporarily();
        };
  
        requestAnimationFrame(reverseGalleryAnimation);
      });
    });
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

        pageHomeOpening(
          smoothDelta > 0 ? 1 : -1,
          smoothDelta,
          GALLERY_WHEEL_UNIT
        );

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
      pageHomeOpening(delta > 0 ? 1 : -1, delta, GALLERY_TOUCH_UNIT);
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
    pageHomeOpening(direction, direction * 240, GALLERY_WHEEL_UNIT);
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
    if (galleryProgress > 0.001) resetHomeGalleryStyles();
    galleryBaseRects = null;
    setHomeGalleryProgress(galleryProgress);
  });

  if (shouldResetHomeScroll) {
    resetHomeOpening();
    // The late `load` event (heavy videos) and the initial `pageshow` must not
    // yank a visitor who already started scrolling back to the first intro
    // screen. Only a bfcache return (persisted) still resets unconditionally.
    const hasStartedOpening = () =>
      activeIntroIndex > 0 ||
      galleryProgress > 0.001 ||
      document.body.classList.contains("home-opening-complete");
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
  document.querySelectorAll('a[href="#work"], a[href="index.html#work"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      sessionStorage.removeItem(HOME_LOGO_SKIP_KEY);
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
}

document.querySelectorAll(".brand-mark").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    sessionStorage.setItem(HOME_LOGO_SKIP_KEY, "1");
    window.location.href = "index.html";
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
   scrolls normally until its bottom reaches the viewport bottom, then
   pins — letting the gray studio panel slide up over it from below.
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
   Hero polaroids (home): free drag / reposition.
   Dragging writes the independent `translate` property, so the frames'
   resting rotate (in `transform`) is never touched. The frame is clamped so
   at least half of it always stays inside the stage — a photo can be tossed
   around but never lost. Nothing persists: a reload deals the desk afresh.
   ============================================================ */
(() => {
  if (document.body.dataset.page !== "home") return;
  const stage = document.querySelector(".home-gallery-stage");
  const photos = Array.from(document.querySelectorAll(".hh-photo"));
  if (!stage || !photos.length) return;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  let zTop = 10; // the last-touched photo rises above its siblings

  photos.forEach((photo) => {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;
    let originLeft = 0; // the frame's untranslated screen spot at grab time
    let originTop = 0;
    let w = 0;
    let h = 0;

    photo.addEventListener("pointerdown", (event) => {
      if (event.button) return;
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      baseX = parseFloat(photo.dataset.dx || "0");
      baseY = parseFloat(photo.dataset.dy || "0");
      const rect = photo.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      originLeft = rect.left - baseX;
      originTop = rect.top - baseY;
      photo.classList.add("is-dragging");
      photo.style.zIndex = String(++zTop);
      try { photo.setPointerCapture(event.pointerId); } catch (e) { /* older browsers */ }
      event.preventDefault(); // no text selection / native image drag
    });

    photo.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const sr = stage.getBoundingClientRect();
      const dx = clamp(
        baseX + (event.clientX - startX),
        sr.left - originLeft - w * 0.5,
        sr.right - originLeft - w * 0.5
      );
      const dy = clamp(
        baseY + (event.clientY - startY),
        sr.top - originTop - h * 0.5,
        sr.bottom - originTop - h * 0.5
      );
      photo.dataset.dx = String(dx);
      photo.dataset.dy = String(dy);
      photo.style.translate = `${dx}px ${dy}px`;
    });

    const release = () => {
      dragging = false;
      photo.classList.remove("is-dragging");
    };
    photo.addEventListener("pointerup", release);
    photo.addEventListener("pointercancel", release);
  });
})();
