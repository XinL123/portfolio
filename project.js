/* Project detail — paged deck. Scroll / click / swipe / arrows advance ONE
   screen at a time; the progress capsule hops to the new slot. The document
   itself never scrolls (body is overflow:hidden), so this is a deliberate
   slideshow, not native scrolling. On the last screen the "Scroll or click"
   cue swaps for "Return to beginning", which jumps back to screen 1. */
(() => {
  // Remember WHICH project this is, so the home clothesline can rest on this
  // card when the visitor goes back (the back chevron, the Projects link, or
  // the browser's Back without bfcache). clothesline.js reads and clears the
  // key on its first placement; a later cold visit to /projects starts at the
  // first card as before. Slug = body[data-project] = the /projects/<slug> url.
  try {
    const slug = document.body.dataset.project;
    if (slug) sessionStorage.setItem("pc-return-project", slug);
  } catch (e) { /* storage blocked — the line simply starts at card 0 */ }

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

  // things that want to know when the active screen changes (the photo pile's
  // "click to flip" note times itself from the moment its screen opens)
  const screenWatchers = [];

  const render = () => {
    screens.forEach((s, i) => {
      s.classList.toggle("is-active", i === index);
      s.classList.toggle("is-past", i < index);
    });
    screenWatchers.forEach((fn) => fn(index));
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

  /* ---- photo pile (.pj-pile) : click / Enter / Space tucks the top photo
     under the stack. Two phases so it reads as a hand moving a print: the top
     card first slides OUT sideways while still on top (.is-tucking, ~260ms),
     then every card is handed the next slot down (top → bottom, others rise
     one) and eases into its new resting pose — now beneath the rest, because
     the slot change also swapped its z-index. A tiny random jitter is added
     per card on each move so the heap never lines up identically twice.
     Keyboard handling stops propagation: the deck pages on Space/arrows at
     window level and must not fire from a pile activation. ---- */
  document.querySelectorAll(".pj-pile").forEach((pile) => {
    const cards = [...pile.querySelectorAll(".pj-pile-card")];
    const n = cards.length;
    if (n < 2) return;
    let busy = false;
    const slotOf = (card) => Number(card.dataset.slot) || 0;

    // Guide cursor: HINT_DELAY after this screen opens, the hand-drawn pointer
    // plays a 2.6s run (CSS keyframes) — glide in, press, lift, fade. At the
    // press beat the top sheet dips under it (.is-pressed) so the click
    // visibly lands on the pile. If the reader still hasn't clicked, the run
    // repeats REPEAT_GAP after it ends, and keeps doing so; withdrawn while
    // they are on another screen; retired for good by their first click.
    const hint = pile.querySelector(".pj-pile-hint");
    const screen = pile.closest(".pj-screen");
    const HINT_DELAY = 1500;
    const REPEAT_GAP = 3000;
    const PRESS_AT = 2600 * 0.37;   // matches the keyframes' press beat
    const PRESS_FOR = 300;
    const RUN_MS = 2600;
    let hintTimers = [];
    let hintDone = false;
    const topCard = () => cards.find((c) => slotOf(c) === 0) || cards[0];
    const later = (fn, ms) => hintTimers.push(window.setTimeout(fn, ms));
    const hideHint = () => {
      hintTimers.forEach(window.clearTimeout);
      hintTimers = [];
      hint && hint.classList.remove("is-shown");
      cards.forEach((c) => c.classList.remove("is-pressed"));
    };
    const retireHint = () => {
      if (hintDone) return;
      hintDone = true;
      hint && hint.classList.add("is-done");
      hideHint();
    };
    const runHint = () => {
      if (hintDone) return;
      hint.classList.remove("is-shown");
      void hint.offsetWidth; // restart the keyframes from the top
      hint.classList.add("is-shown");
      later(() => topCard().classList.add("is-pressed"), PRESS_AT);
      later(() => cards.forEach((c) => c.classList.remove("is-pressed")), PRESS_AT + PRESS_FOR);
      later(() => {
        hint.classList.remove("is-shown");
        later(runHint, REPEAT_GAP);
      }, RUN_MS + 50);
    };
    screenWatchers.push((i) => {
      if (!hint || hintDone || reduce) return;
      hideHint();
      if (screens[i] === screen) later(runHint, HINT_DELAY);
    });
    const jitter = (card) => {
      const r = (Math.random() * 3 - 1.5).toFixed(2);   // ±1.5deg
      const x = (Math.random() * 3 - 1.5).toFixed(2);   // ±1.5%
      const y = (Math.random() * 2.4 - 1.2).toFixed(2); // ±1.2%
      card.style.setProperty("--jr", r + "deg");
      card.style.setProperty("--jx", x + "%");
      card.style.setProperty("--jy", y + "%");
    };
    const cycle = () => {
      retireHint();
      if (busy) return;
      busy = true;
      const top = cards.find((c) => slotOf(c) === 0) || cards[0];
      const settle = () => {
        cards.forEach((c) => {
          c.dataset.slot = String((slotOf(c) + n - 1) % n);
          jitter(c);
        });
        top.classList.remove("is-tucking");
        window.setTimeout(() => { busy = false; }, reduce ? 0 : 320);
      };
      if (reduce) { settle(); return; }
      top.classList.add("is-tucking");
      window.setTimeout(settle, 240);
    };
    pile.addEventListener("click", cycle);
    pile.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        cycle();
      }
    });
    // a tap on the pile is a photo flip, never a deck swipe
    pile.addEventListener("touchmove", (event) => event.stopPropagation(), { passive: true });
  });

  /* ---- design morph (.pj-morph) : DOM order is play order — three pages ×
     four stages. Each step turns the next frame on ABOVE the current one (it
     fades in, z-index 2); once the fade has finished the old frame is snapped
     off underneath, unseen, and the new one drops to z-index 1. So every
     switch is a clean two-image dissolve, whatever the frame count. Holds are
     even except the FINAL stage of each page, which lingers a little.
     START RULE (user): the loop does not run from page load — it waits, parked
     on frame 1, until the reader first reaches its screen, so entering the
     project always meets the wireframe first. Once running it keeps running
     across screen changes (paging away and back just resumes). Leaving the
     project and coming back is a fresh load (frame 1 again); a back/forward-
     cache restore is the one way the old state could survive, so `pageshow`
     with `persisted` parks it on frame 1 too. Under reduced motion: one
     final, still. ---- */
  document.querySelectorAll(".pj-morph").forEach((morph) => {
    const frames = [...morph.querySelectorAll(".pj-morph-frame")];
    if (frames.length < 2) return;
    const HOLD = 800;        // ms a stage rests before it starts dissolving
    const FINAL_HOLD = 1500; // ms the final design of each page rests
    const FADE = 900;        // ms of dissolve (the blend is the point: keep it long)
    const STAGES = 4;        // frames per page; every STAGES-th frame is a final
    const screen = morph.closest(".pj-screen");
    morph.style.setProperty("--pj-morph-fade", FADE + "ms");
    const isFinal = (i) => i % STAGES === STAGES - 1;
    let cur = 0;
    let timer = null;
    let started = false;
    const park = () => {
      window.clearTimeout(timer);
      started = false;
      cur = 0;
      frames.forEach((f, i) => {
        f.classList.remove("is-on");
        f.classList.toggle("is-off", i !== 0);
        f.style.zIndex = i === 0 ? 1 : 0;
      });
      // frame 1 appears instantly, not as a fade from nothing
      frames[0].style.transition = "none";
      frames[0].classList.add("is-on");
      void frames[0].offsetWidth;
      frames[0].style.transition = "";
    };
    if (reduce) {
      frames.forEach((f, i) => { f.classList.toggle("is-on", i === STAGES - 1); f.style.zIndex = i === STAGES - 1 ? 1 : 0; });
      return;
    }
    const step = () => {
      const prev = cur;
      cur = (cur + 1) % frames.length;
      const next = frames[cur];
      next.classList.remove("is-off");
      next.style.zIndex = 2;
      void next.offsetWidth;       // commit z/opacity before the class flips
      next.classList.add("is-on"); // fades in over prev
      timer = window.setTimeout(() => {
        frames[prev].classList.remove("is-on");
        frames[prev].classList.add("is-off");
        frames[prev].style.zIndex = 0;
        next.style.zIndex = 1;
        timer = window.setTimeout(step, isFinal(cur) ? FINAL_HOLD : HOLD);
      }, FADE);
    };
    const start = () => {
      if (started) return;
      started = true;
      timer = window.setTimeout(step, HOLD);
    };
    park();
    screenWatchers.push((i) => { if (screens[i] === screen) start(); });
    window.addEventListener("pageshow", (event) => {
      if (!event.persisted) return;
      park();
      if (screens[index] === screen) start();
    });
  });

  render();
  wakeChrome(); // visible on arrival, then it quietly steps aside

  /* Entrance: clear the html.pj-enter armed state (added by the inline <head>
     script) one painted frame after arrival, so the deck fades in without a
     position shift. Under reduced motion this is immediate; the inline script's
     own 1600ms timeout stays as the safety net. */
  const liftEnter = () => document.documentElement.classList.remove("pj-enter");
  if (reduce) liftEnter();
  else requestAnimationFrame(() => requestAnimationFrame(liftEnter));
})();
