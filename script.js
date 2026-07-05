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
    localStorage.setItem("portfolio-theme", nextTheme);
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

  const eyeState = {
    currentX: neutralEyeX,
    currentY: neutralEyeY,
    currentLeftInner: 0,
    currentRightInner: 0,
    targetX: 0,
    targetY: neutralEyeY,
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

    if (!eyeTrackingEnabled) return;
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

    eyeState.targetX = neutralEyeX + relativeX * maxX - leftReach;
    eyeState.targetY = neutralEyeY + relativeY * maxY * yMultiplier + lowerLeftReach;
    eyeState.targetLeftInner = relativeX < 0 ? -directionalConvergence * 0.35 : directionalConvergence;
    eyeState.targetRightInner = -directionalConvergence;

    scheduleEyes();

    window.clearTimeout(eyeIdleTimer);
    
    eyeIdleTimer = window.setTimeout(() => {
      resetEyes();
    }, EYE_IDLE_DELAY);
    
  };

  const resetEyes = () => {
    eyeState.targetX = neutralEyeX;
    eyeState.targetY = neutralEyeY;
    eyeState.targetLeftInner = 0;
    eyeState.targetRightInner = 0;
    scheduleEyes();
  };

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
  
  scheduleBlink(900 + Math.random() * 1800);
}

const revealSections = document.querySelectorAll(".reveal-section");
const workRevealSection = document.querySelector(".work-section.reveal-section");
const workCards = Array.from(document.querySelectorAll('body[data-page="home"] .work-card'));
const aboutPhotoWalls = Array.from(document.querySelectorAll('body[data-page="about"] .photo-wall.reveal-section'));
const homeIntroScreens = Array.from(document.querySelectorAll('body[data-page="home"] .home-intro-screen'));
const homeGalleryScreen = document.querySelector('body[data-page="home"] .home-gallery-screen');
const homeGalleryStage = document.querySelector('body[data-page="home"] .home-gallery-stage');
const homeGalleryPhotos = Array.from(document.querySelectorAll('body[data-page="home"] [data-home-photo]'));
const homeMainPhoto = document.querySelector('body[data-page="home"] [data-home-photo="main"]');
const homeOrangeWrap = document.querySelector('body[data-page="home"] .home-orange-wrap');

const isHomePage = document.body.dataset.page === "home";

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
    b.classList.remove(...had);
    b.classList.add("home-opening-complete");
    workRevealSection.classList.add("is-visible");
    const top = workRevealSection.getBoundingClientRect().top + window.scrollY;
    if (!hadVisible) workRevealSection.classList.remove("is-visible");
    if (!hadComplete) b.classList.remove("home-opening-complete");
    if (had.length) b.classList.add(...had);
    return top;
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
    document.documentElement.style.setProperty("--home-work-section-opacity", String(workHandoffProgress));
    document.documentElement.style.setProperty("--home-work-section-y", `${260 * (1 - workHandoffEase)}px`);

    // One continuous bridge: ease the fixed preview's top from its 64vh start
    // down to the section's real landed position, so at release the class swap
    // changes nothing visually (the FLIP glide then short-circuits at ≤2px).
    if (workHandoffProgress > 0) {
      if (workLandedTop === null) workLandedTop = measureWorkLandedTop();
      const startTop = Math.min(window.innerHeight * 0.64, 700);
      const fixedTop = startTop + (workLandedTop - startTop) * workHandoffEase;
      document.documentElement.style.setProperty("--home-work-fixed-top", `${fixedTop.toFixed(1)}px`);
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
  const isWorkLanding = () => workLandingRemaining > 0;

  const cancelWorkLanding = () => {
    const wasLanding = isWorkLanding();
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
    workRevealSection.classList.add("is-visible");
    window.scrollTo({ top: 0, behavior: "auto" });
    requestAnimationFrame(() => requestAnimationFrame(syncVisibleWorkCards));

    // The collapse would snap the section upward. Measure that gap and neutralise it with a
    // transform that holds the section at its old on-screen spot (FLIP). From here the
    // visitor's own scrolling scrubs the offset down to zero — never a timed animation.
    const landedTop = workRevealSection.getBoundingClientRect().top;
    const glide = Math.round(fromTop - landedTop);

    if (glide <= 2) {
      document.documentElement.style.removeProperty("scroll-snap-type");
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

  const applyHomeGalleryDelta = (delta, unit = GALLERY_WHEEL_UNIT) => {

    if (!galleryArmed || Date.now() < galleryReadyAt) return;

    const nextProgress = galleryProgress + delta / unit;

    if (nextProgress >= GALLERY_RELEASE_PROGRESS) {
      const carryDelta = Math.max(nextProgress - GALLERY_RELEASE_PROGRESS, 0) * unit;

      setHomeGalleryProgress(GALLERY_RELEASE_PROGRESS);
      finishHomeOpening(carryDelta);
      return;
    }

    setHomeGalleryProgress(nextProgress);

    if (galleryProgress >= GALLERY_PROGRESS_MAX - 0.002) {
      finishHomeOpening(Math.abs(delta));
    }
  };

  const reenterHomeGalleryFromProjects = () => {
    if (!workRevealSection) return false;

    const handoffViewportY = getWorkHandoffViewportY();
    const reentryTop = Math.max(workRevealSection.offsetTop - handoffViewportY, 0);
    if (window.scrollY > reentryTop + 80) return false;

    // Cancel any pending landing so its !important inline transform can't get stuck.
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
    window.scrollTo(0, 0);
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
  };

  const goToWorkSection = () => {
    skipHomeOpening();
  
    const moveToWork = () => {
      workRevealSection?.classList.add("is-visible");
      workCards.forEach((card) => card.classList.add("is-visible"));
  
      if (workRevealSection) {
        workRevealSection.scrollIntoView({
          behavior: "auto",
          block: "start"
        });
      }
  
      history.replaceState(null, "", "index.html#work");
      syncVisibleWorkCards();
    };
  
    requestAnimationFrame(() => {
      requestAnimationFrame(moveToWork);
    });
  
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
        event.deltaY < -28 &&
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

  // Scrollbar drags and programmatic scrolls bypass the wheel handler — if the
  // page really scrolls while a landing is still pending, settle the landing on
  // the spot so the two offsets can't stack.
  window.addEventListener(
    "scroll",
    () => {
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
    if (galleryProgress > 0.001) resetHomeGalleryStyles();
    galleryBaseRects = null;
    workLandedTop = null; // landed position depends on viewport size
    setHomeGalleryProgress(galleryProgress);
  });

  if (shouldResetHomeScroll) {
    resetHomeOpening();
    window.addEventListener("pageshow", resetHomeOpening);
    window.addEventListener("load", () => {
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

  document.querySelectorAll('a[href="#work"], a[href="index.html#work"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      sessionStorage.removeItem(HOME_LOGO_SKIP_KEY);
  
      // 其他页面正常前往 index.html#work
      if (document.body.dataset.page !== "home") return;
  
      // 已经在主页时，直接滚动到 Work
      event.preventDefault();
      goToWorkSection();
    });
  });
  
} else if (document.body.dataset.page === "home") {
  document.body.classList.add("home-opening-complete");
  clearHomeHandoffVars();
  revealSections.forEach((section) => section.classList.add("is-visible"));
  workCards.forEach((card) => card.classList.add("is-visible"));
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

  // Hover drives the active row; leaving the menu keeps the last active row.
  rows.forEach((row, i) => {
    row.addEventListener("mouseenter", () => setActive(i));
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
