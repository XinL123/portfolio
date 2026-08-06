/* Project detail — paged deck. Scroll / click / swipe / arrows advance ONE
   screen at a time; the progress capsule hops to the new slot. The document
   itself never scrolls (body is overflow:hidden), so this is a deliberate
   slideshow, not native scrolling. On the last screen the "Scroll or click"
   cue swaps for "Return to beginning", which jumps back to screen 1. */
(() => {
  const deck = document.querySelector(".pj-deck");
  if (!deck) return;

  const screens = [...document.querySelectorAll(".pj-screen")];
  const progCap = document.querySelector(".pj-cap"); // sliding capsule svg
  const SLOT = 34; // svg units between dot centres (matches the progress markup)
  const scrollCue = document.querySelector(".pj-scrollcue");
  const returnCue = document.querySelector(".pj-returncue");
  const nextBtn = document.querySelector(".pj-next");
  const returnBtn = document.querySelector(".pj-return");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const last = screens.length - 1;

  let index = 0;
  let locked = false;
  let lockTimer = null;

  /* ---- idle auto-hide for the chrome (top bar + bottom cue) ----
     Same rhythm as the home header: everything retires after a few seconds of
     stillness so the screen is just the work, and comes back the instant you
     reach for it — pointer into the top or bottom band, any paging input, or a
     touch near either edge. `.is-idle` is kept separate from `.is-hidden` (the
     end screen's retire-the-scroll-cue flag) so the two never fight. */
  const topbar = document.querySelector(".pj-topbar");
  const chrome = [topbar, scrollCue, returnCue].filter(Boolean);
  const IDLE_MS = 3400;
  const EDGE_TOP = 120;
  const EDGE_BOTTOM = 150;
  let idleTimer = null;
  let chromePinned = false; // pointer resting inside a control — never hide

  const setIdle = (idle) => chrome.forEach((el) => el.classList.toggle("is-idle", idle));

  const wakeChrome = () => {
    setIdle(false);
    window.clearTimeout(idleTimer);
    if (chromePinned) return;
    idleTimer = window.setTimeout(() => setIdle(true), IDLE_MS);
  };

  chrome.forEach((el) => {
    el.addEventListener("pointerenter", () => { chromePinned = true; wakeChrome(); });
    el.addEventListener("pointerleave", () => { chromePinned = false; wakeChrome(); });
  });

  window.addEventListener("pointermove", (event) => {
    const nearEdge = event.clientY <= EDGE_TOP || event.clientY >= window.innerHeight - EDGE_BOTTOM;
    if (nearEdge || !chrome[0].classList.contains("is-idle")) wakeChrome();
  }, { passive: true });

  // touch has no hover: a tap near either edge is the same "reaching for it"
  window.addEventListener("touchstart", (event) => {
    const t = event.touches[0];
    if (!t) return;
    if (t.clientY <= EDGE_TOP || t.clientY >= window.innerHeight - EDGE_BOTTOM) wakeChrome();
  }, { passive: true });

  let capX = 0; // current capsule offset in svg units

  // Rigid-body slide: the pill moves to the next slot as ONE solid object —
  // the transform is translateX ONLY (no scaleX stretch, no squash, no path
  // change). The easing overshoots the target by a few percent of the hop
  // (~1.4px) and settles back; that small positional bounce is the entire
  // "QQ" feel. The dot this slide uncovers needs no animation of its own:
  // the pill physically covers it, so it is revealed progressively as the
  // pill moves off it.
  const moveCapsule = (fromX, toX) => {
    if (!progCap) return;
    progCap.style.transform = "translateX(" + toX + "px)"; // resting/end state
    if (reduce || !progCap.animate) return;
    progCap.getAnimations().forEach((a) => a.cancel());
    progCap.animate(
      [
        { transform: `translateX(${fromX}px)` },
        { transform: `translateX(${toX}px)` },
      ],
      { duration: 440, easing: "cubic-bezier(0.3, 1.28, 0.44, 1)" }
    );
  };

  const render = () => {
    screens.forEach((s, i) => {
      s.classList.toggle("is-active", i === index);
      s.classList.toggle("is-past", i < index);
    });
    const target = index * SLOT;
    if (target !== capX) { moveCapsule(capX, target); capX = target; }
    const atEnd = index >= last;
    scrollCue && scrollCue.classList.toggle("is-hidden", atEnd);
    returnCue && returnCue.classList.toggle("is-hidden", !atEnd);
  };

  // One gesture = one page: after a move, ignore further input until the
  // transition has settled (covers trackpad momentum dribbling out).
  const lock = () => {
    locked = true;
    window.clearTimeout(lockTimer);
    lockTimer = window.setTimeout(() => { locked = false; }, reduce ? 260 : 700);
  };

  const goTo = (target) => {
    wakeChrome(); // paging counts as activity — the cue shows you where you are
    if (locked) return;
    const next = Math.min(Math.max(target, 0), last);
    if (next === index) return;
    index = next;
    render();
    lock();
  };
  const go = (dir) => goTo(index + dir);

  window.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) < 6) return;
    event.preventDefault();
    go(event.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  nextBtn && nextBtn.addEventListener("click", () => go(1));
  returnBtn && returnBtn.addEventListener("click", () => goTo(0));

  window.addEventListener("keydown", (event) => {
    if (["ArrowDown", "PageDown", " "].includes(event.key)) { event.preventDefault(); go(1); }
    else if (["ArrowUp", "PageUp"].includes(event.key)) { event.preventDefault(); go(-1); }
    else if (event.key === "Home") { event.preventDefault(); goTo(0); }
  });

  let touchY = null;
  window.addEventListener("touchstart", (event) => {
    touchY = event.touches[0] ? event.touches[0].clientY : null;
  }, { passive: true });
  window.addEventListener("touchmove", (event) => {
    if (touchY === null || locked) return;
    const dy = touchY - (event.touches[0] ? event.touches[0].clientY : touchY);
    if (Math.abs(dy) < 46) return;
    event.preventDefault();
    go(dy > 0 ? 1 : -1);
    touchY = null;
  }, { passive: false });

  render();
  wakeChrome(); // visible on arrival, then it quietly steps aside
})();
