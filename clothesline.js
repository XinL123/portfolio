/* ============================================================
   Selected projects · flat clothesline carousel (home)

   FRONT-FACING composition traced from the user's line3 reference
   + rope sketch: the lower PROJECT rope is a long scene-spanning
   curve, static in viewport space — it enters HIGH at the far left
   (in the top-line's zone), dives across the open left ~44% of the
   frame, bottoms out under the front card slot and lifts gently to
   the right. Two small hanging cards (19.8% of the frame each) ride
   it on the right side, tilting with the rope's local slope so their
   clips always grip the line. Every card is the SAME size (no
   perspective, no scaling): one full card + one preview card whose
   whole slot fades/blurs, melting under the track mask.
   Dragging slides the row 1:1 with a soft snap; each card hangs at
   the rope's own height with a whisper of sway. The bun on the top
   rope never moves; it blinks both eyes every 4–6s (sometimes twice).
   ============================================================ */

(() => {
  if (document.body.dataset.page !== "home") return;

  const viewport = document.querySelector(".pc-viewport");
  const track = document.querySelector(".pc-track");
  if (!viewport || !track) return;

  const cards = [...track.querySelectorAll(".pc-card")];
  const bun = document.querySelector(".pc-bun");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  viewport.classList.add("pc-enhanced");
  viewport.scrollLeft = 0;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const scene = document.querySelector(".pc-scene");
  const rope = scene ? scene.querySelector(".pc-rope") : null;
  const ropePath = rope ? rope.querySelector("path") : null;
  const svs = cards.map((c) => parseFloat(c.style.getPropertyValue("--sv")) || 1);

  /* How much further RIGHT the LAST card comes to rest, compared with every other
     card's stop (which is set by --pc-inset). 0 = the last card stops in the same
     spot as all the others; a bigger number pulls the final resting position
     rightward so the end of the row doesn't leave a wide empty gap on the right.
     In vw (1 = 1% of the viewport width). Keep it small enough that the last
     card's right edge stays left of the --pc-fade-r melt zone (~82vw). */
  const LAST_STOP_SHIFT_VW = 6;

  /* ---- geometry: a row of equal cards riding one long sagging rope ---- */
  let snaps = [0];
  let maxX = 0;
  let W = 1;       // viewport width
  let cardW = 1;
  let inset = 0;
  let S = 1;       // stride = card + gap
  let vpTop = 0;   // .pc-viewport's offset inside .pc-scene (rope is scene-level)
  let tb = 0.56;   // rope's lowest point = the front card slot's centre (measured)

  /* the project rope, from the user's sketch: it enters HIGH at the far left
     (up in the top-line's zone), dives steeply across the breathing space —
     clearing below the bun's dome — flattens into its lowest point under the
     front card slot (t≈0.56), then lifts gently toward the right. All in
     SCENE coordinates (the svg's top edge = the scene's top edge). */
  const ropeSceneY = (sx) => {
    // Keep t free beyond the viewport edges so the rope continues with the
    // same tangent instead of flattening at x = 0 and creating a visible kink.
    const t = sx / W;
    const belly = vpTop + 58;                 // keeps cards at their tuned height
    const drop = Math.min(0.19 * W, belly - 8); // sketch: ~19% of the frame
    const rise = 0.045 * W;                   // right-side lift
    const wig = 1.4 * Math.sin(t * 5.2 + 0.7); // hand wobble
    if (t < tb) return belly - drop * Math.pow((tb - t) / tb, 2.8) + wig;
    return belly - rise * Math.pow((t - tb) / (1 - tb), 2.6) + wig;
  };

  // same curve in the cards' frame (the old viewport-space rope origin),
  // preserving the calibrated pin constant in place()
  const ropeY = (sx) => ropeSceneY(sx) - vpTop - 10;

  const buildRope = () => {
    if (!rope || !ropePath) return;
    const h = Math.ceil(vpTop + 58 + 96);
    rope.setAttribute("width", W);
    rope.setAttribute("height", h);
    rope.setAttribute("viewBox", `0 0 ${W} ${h}`);
    // Run the continuous curve beyond both viewport edges. The parent clips the
    // excess, leaving no endpoint or fold visible at either screen boundary.
    const x0 = -48;
    const x1 = W + 48;
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const sx = x0 + ((x1 - x0) * i) / 64;
      pts.push(`${sx.toFixed(1)} ${ropeSceneY(sx).toFixed(2)}`);
    }
    ropePath.setAttribute("d", "M " + pts.join(" L "));
  };

  /* ---- top artwork rope: hold its stroke at exactly the --pc-rope-w dial's
     CSS px at any viewport width, zoom or DPI. The artwork lives in a
     2172-unit viewBox stretched to 100vw, so the needed user-unit width is
     plain arithmetic: dial * 2172 / rendered-width. (vector-effect:
     non-scaling-stroke was tried first, but it strokes against different
     coordinate bases on different display scalings — thin on some machines,
     right on others. Math can't disagree with itself.) ---- */
  const topLineSvg = document.querySelector(".pc-top-line");
  const topLinePath = topLineSvg ? topLineSvg.querySelector("path") : null;
  const TOP_LINE_VB_W = 2172; // artwork viewBox width (scripts/trace-clothesline.py)
  const syncTopRope = () => {
    if (!topLineSvg || !topLinePath) return;
    const w = topLineSvg.clientWidth || window.innerWidth;
    if (!w) return; // never divide by zero — a bogus Infinity would blow the stroke up
    const host = topLineSvg.closest(".pc-scene") || topLineSvg;
    const dial = parseFloat(getComputedStyle(host).getPropertyValue("--pc-rope-w")) || 1.5;
    topLinePath.style.strokeWidth = ((dial * TOP_LINE_VB_W) / w).toFixed(3);
  };

  const measure = () => {
    W = Math.max(1, viewport.clientWidth);
    vpTop = viewport.offsetTop;
    syncTopRope();
    inset = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    cardW = cards[0] ? cards[0].offsetWidth : 1;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 40;
    S = cardW + gap;
    snaps = cards.map((_, i) => i * S);
    // pull the LAST stop in by LAST_STOP_SHIFT_VW so the final card rests that
    // much further right than the others (never past the 2nd-to-last stop)
    if (snaps.length > 1) {
      const lastShift = (LAST_STOP_SHIFT_VW / 100) * W;
      snaps[snaps.length - 1] = Math.max(
        snaps[snaps.length - 2] + 1,
        snaps[snaps.length - 1] - lastShift
      );
    }
    maxX = snaps[snaps.length - 1]; // drag/rubber-band bound = the last stop
    // the rope bottoms out exactly under the front card slot, at every width
    tb = clamp((inset + cardW / 2) / W, 0.3, 0.7);
    buildRope();
  };

  /* ---- state: ONE explicit index is the source of truth. The track only
     ever rests at snaps[activeProjectIndex]; every gesture changes the index
     by exactly ±1 and a single tween carries the track there. ---- */
  let x = 0;                      // current track offset (px, positive = moved left)
  let sway = 0;                   // current sway angle (deg)
  let dragging = false;
  let running = false;            // render loop live?
  let activeProjectIndex = 0;
  let isProjectAnimating = false; // step tween in flight — new input is ignored
  let animFrom = 0;
  let animTo = 0;
  let animStart = 0;
  let gestureCooldownUntil = 0;   // swallows the trackpad inertia tail after a step
  let wheelAccum = 0;
  let dragStartIndex = 0;
  const STEP_MS = 780;            // fast start, gentle deceleration, soft stop
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  /* Map the current track offset to a fractional card index where each snap maps
     to its exact integer index (snaps[i] -> i). With every snap at i*S this is
     just x/S; with the LAST snap pulled in (LAST_STOP_SHIFT_VW) it keeps the
     resting card reading as distance 0 — so clarity tracks the ACTIVE card, not
     the fixed inset slot, and the shifted last card stays crisp when it rests. */
  const fracIndex = (xx) => {
    if (xx <= snaps[0]) return xx / S;                 // left rubber-band
    for (let i = 0; i < snaps.length - 1; i++) {
      if (xx <= snaps[i + 1]) {
        const span = snaps[i + 1] - snaps[i] || 1;
        return i + (xx - snaps[i]) / span;
      }
    }
    return snaps.length - 1 + (xx - snaps[snaps.length - 1]) / S; // right rubber-band
  };

  /* Each card hangs where its pins meet the rope. The pin midpoint sits 2.5px
     above the card's top, the card top is 24px down the track, the track begins
     6px into the viewport, and the rope svg renders at viewport-top 10 —
     so ty = ropeY(cx) - 17.5 puts the pins exactly on the line. */
  const place = () => {
    const fi = fracIndex(x);
    cards.forEach((c, i) => {
      const tx = inset + i * S - x;
      // hang WITH the rope: the card sits on the CHORD between its two clip
      // points on the curve — both clips grip the line exactly, on any slope
      // or curvature — tilting with it and easing level in the flat front slot
      const pl = tx + cardW * 0.13 + 4.5;  // clip centres (13% / 90% − pin half)
      const pr = tx + cardW * 0.90 - 4.5;
      const yl = ropeY(pl);
      const yr = ropeY(pr);
      // 10.5 (was 17.5): cards hang 7px lower, so the rope crosses the clips
      // near their tops and the clips grip only the card's upper edge
      const ty = (yl + yr) / 2 - 10.5;
      // Follow the rope's REAL local slope everywhere: the left dive is steep
      // (chord angles reach ~25-30° where cards are still faintly visible), and
      // the old ±6° cap made sliding/blurred cards saturate level and visibly
      // detach from the line. The wide ±28° bound is only a numeric safety net.
      const tilt = clamp(Math.atan2(yr - yl, pr - pl) * 57.2958, -28, 28);
      c.style.transform =
        `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)` +
        ` rotate(${(tilt + sway * svs[i]).toFixed(3)}deg)`;
      // clarity follows the DISTANCE from the active slot, symmetrically: the
      // active card is crisp; an immediate neighbour (left OR right) is softly
      // blurred at ~45% — recognisable, clearly "not the current one"; anything
      // further melts away smoothly (no popping). Because opacity/blur derive
      // from the same tx as the motion, they always change in step with it.
      const d = Math.abs(i - fi);
      const op = d <= 1 ? 1 - 0.55 * d : Math.max(0, 0.45 - 0.45 * (d - 1));
      c.style.opacity = op.toFixed(3);
      const b = Math.min(2.6 * d, 4);
      c.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "none";
      // Only the current front project is interactive: the ones that slid away
      // (blurred / non-active) must not respond to the mouse — no hover, no
      // "coming soon" note, no clicks. CSS turns pointer-events off for every
      // card except .pc-card-active, so their hot-zones truly leave with them.
      c.classList.toggle("pc-card-active", i === activeProjectIndex);
      if (i !== activeProjectIndex) c.classList.remove("pc-hot"); // hover never outlives the front slot
    });

    // Desktop cursor hint, only at the two ENDS of the row: on the first card a
    // right arrow says "keep going that way", on the last a left arrow says
    // "back the other way". In between the pointer stays ordinary — the hint is
    // for the ends, where the direction to travel is unambiguous. Driven from
    // here so it stays in step with the index on every path that moves the row
    // (drag, wheel, keys, dots); CSS swaps the cursor image off these classes,
    // and scopes them to the ACTIVE card so blurred neighbours never show one.
    viewport.classList.toggle("pc-at-first", activeProjectIndex === 0);
    viewport.classList.toggle("pc-at-last", activeProjectIndex >= snaps.length - 1);
  };

  let lastT = 0;

  const render = (now) => {
    const t = typeof now === "number" ? now : performance.now();
    const dt = clamp(lastT ? t - lastT : 16.7, 1, 120);
    lastT = t;
    const ease = (per16) => 1 - Math.pow(1 - per16, dt / 16.7);

    const prev = x;
    if (isProjectAnimating) {
      // the step tween: time-based easeOutCubic — starts fast, decelerates
      // toward the target and lands EXACTLY on it (no overshoot, no later
      // correction, so there is never a settle-then-shift artifact)
      const p = clamp((t - animStart) / STEP_MS, 0, 1);
      x = animFrom + (animTo - animFrom) * easeOutCubic(p);
      if (p >= 1) {
        x = animTo;
        isProjectAnimating = false;
        gestureCooldownUntil = t + 300; // swallow the trackpad inertia tail
      }
    }
    const vel = x - prev;

    // a whisper of hanging sway driven by velocity, always easing back to rest
    if (!reduceMotion) {
      const targetSway = clamp(-vel * 0.12, -1.2, 1.2);
      sway += (targetSway - sway) * ease(0.12);
    }

    place();

    if (dragging || isProjectAnimating || Math.abs(sway) > 0.02) {
      schedule();
    } else {
      sway = 0;
      place();
      running = false;
      lastT = 0;
      // The carousel just came to rest — a card may have slid UNDER a
      // stationary cursor, which fires no pointermove. Re-judge the hover
      // from the last known coordinates so the front card lights up without
      // the user having to twitch the mouse.
      syncHotAtRest();
    }
  };

  // rAF while visible; timeout heartbeat while hidden (rAF pauses there)
  const schedule = () => {
    running = true;
    if (document.visibilityState === "hidden") {
      window.setTimeout(() => render(performance.now()), 50);
    } else {
      requestAnimationFrame(render);
    }
  };

  const kick = () => {
    if (!running) schedule();
  };

  /* The ONLY way the track moves (outside a live drag): clamp the index —
     `Math.min(i, last)` style bounds — then tween the whole track to that
     card's fixed snap position. At the last project a forward step resolves to
     the same index and becomes a no-op, so the track can never travel past it;
     backward steps always work. */
  const stepTo = (i, instant = false) => {
    measure();
    const next = clamp(i, 0, snaps.length - 1);
    activeProjectIndex = next;
    wheelAccum = 0;
    const dest = snaps[next];
    if (instant || reduceMotion || Math.abs(dest - x) < 0.5) {
      isProjectAnimating = false;
      x = dest;
      place();
      kick();
      return;
    }
    animFrom = x;
    animTo = dest;
    animStart = performance.now();
    isProjectAnimating = true;
    kick();
  };

  /* ---- pointer drag (mouse + touch), 1:1 with rubber-banded ends ---- */
  let startX = 0;
  let startTrack = 0;
  let moved = 0;
  let gestureStepped = false; // did this gesture actually change project?
  let pressLink = null;       // the card link the press started on (for click-nav)
  let lastEvX = 0;
  let lastEvT = 0;
  let flick = 0; // px per frame equivalent at release

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button) return;
    // Remember the card link under the press NOW: setPointerCapture below
    // retargets the later `click` to the viewport, so the <a> never receives it
    // — we navigate ourselves in the click handler using this.
    // Scoped to the drawn frame on purpose: .pc-card-body sits inside the <a>,
    // so every pixel of the frame resolves here, while the clothespins pinned
    // above its top edge — siblings of the <a> — do not. That keeps the click
    // target exactly aligned with the hover target (see .pc-card-body:hover in
    // styles.css); a press with no hover feedback under it never navigates.
    pressLink = event.target.closest ? event.target.closest(".pc-card-link[href]") : null;
    if (isProjectAnimating) return; // one motion at a time — no mid-tween grabs
    dragging = true;
    moved = 0;
    gestureStepped = false;
    flick = 0;
    startX = lastEvX = event.clientX;
    startTrack = x;
    dragStartIndex = activeProjectIndex;
    lastEvT = performance.now();
    measure();
    viewport.classList.add("is-dragging");
    try { viewport.setPointerCapture(event.pointerId); } catch (e) { /* older browsers */ }
    kick();
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    let nx = startTrack - dx;
    if (nx < 0) nx *= 0.35;
    else if (nx > maxX) nx = maxX + (nx - maxX) * 0.35;
    x = nx;
    const now = performance.now();
    const dt = Math.max(1, now - lastEvT);
    flick = ((lastEvX - event.clientX) / dt) * 16;
    lastEvX = event.clientX;
    lastEvT = now;
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove("is-dragging");
    // one gesture, one card: a deliberate drag or flick advances exactly ±1
    // from the index where the gesture BEGAN (inertia can never skip cards);
    // anything less settles softly back onto the current card.
    const travelled = x - snaps[dragStartIndex];
    let dir = 0;
    if (Math.abs(flick) > 5) dir = Math.sign(flick);
    else if (Math.abs(travelled) > S * 0.18) dir = Math.sign(travelled);
    gestureStepped = dir !== 0;
    stepTo(dragStartIndex + dir);
  };

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  /* ---- coordinate-driven hover (.pc-hot). On at least one machine the
     browser's real-mouse hit test goes stale over part of the ACTIVE card
     (its right side stops answering :hover) while coordinate hit-tests stay
     correct — so the hover state is derived from the pointer's coordinates
     directly. Every move hit-tests the point and lights .pc-hot on the card
     it lands in; the CSS interaction rules (note peek, cover zoom, view-link
     tint) key off BOTH :hover and .pc-hot, so whichever path survives, the
     card responds. The hot zone is exactly the drawn frame — the hit-test
     honours the border-radius — and matches the click zone by construction.
     Window-level on purpose: even if a misrouted event lands outside the
     viewport subtree, the coordinates still tell the truth. ---- */
  let lastPX = -1;
  let lastPY = -1;

  const syncHot = (cx, cy) => {
    // elementsFromPoint (plural): scan the whole stack under the point and
    // take the first hit inside the active card. This sees THROUGH anything
    // a browser extension floats over the page (VPN widgets and the like) —
    // with elementFromPoint a foreign overlay was the only thing returned
    // and the card under it went cold.
    let hot = null;
    if (!dragging) {
      for (const el of document.elementsFromPoint(cx, cy)) {
        const c = el.closest ? el.closest(".pc-card-active") : null;
        if (c) { hot = c; break; }
      }
    }
    // Touch the DOM only when the verdict actually changes. Style invalidation
    // on every raw pointer event was heavy enough to drop frames on its own.
    for (const c of cards) {
      const want = c === hot;
      if (c.classList.contains("pc-hot") !== want) c.classList.toggle("pc-hot", want);
    }
    /* The swipe-hint CURSOR needs no work here — it is pure CSS — but it does
       lean on this class. Its rules list .pc-card-active.pc-hot alongside
       .pc-hang:hover, so the hint survives wherever the browser's own hover
       goes stale, and they append `*` so the card's descendants cannot
       reclaim the pointer with their default hand. See the cursor: block in
       styles.css. */
  };
  const syncHotAtRest = () => {
    if (lastPX >= 0) syncHot(lastPX, lastPY);
  };
  // Self-healing clock: a parked cursor gets re-judged ~3×/s, so the state
  // converges to the truth no matter what momentarily lied — stale hit-test
  // data as the track settles, an extension overlay appearing or vanishing, a
  // missed event. Scheduled on requestAnimationFrame, NOT setInterval: on the
  // machine this saga was debugged on, a plain interval simply never fired
  // (judge age grew unbounded) while rAF demonstrably ran — the carousel
  // animates there. Ride the scheduler that is proven alive. Throttled inside
  // the frame callback; the per-frame overhead is a subtraction and a compare.
  let hotClockAt = 0;
  const hotClock = (t) => {
    // rAF re-armed FIRST: a throw inside the judge can never break the chain
    // and strand the highlight (that failure mode is silent and permanent).
    requestAnimationFrame(hotClock);
    if (t - hotClockAt < 300) return;
    hotClockAt = t;
    try {
      syncHotAtRest();
    } catch (e) {
      /* keep ticking */
    }
  };
  requestAnimationFrame(hotClock);
  // Every coordinate-bearing input feeds the judge — not just pointermove.
  // The pure-trackpad flow (⌘R reload → two-finger scroll to the section →
  // two-finger swipe between cards → wait) never moves the cursor at all, so
  // after a reload the browser has NO idea where it is: no pointer event ever
  // fires, native :hover is dead page-wide, and a pointermove-only judge sits
  // blind forever. But WheelEvent extends MouseEvent — every scroll and swipe
  // CARRIES the cursor position. Harvesting it closes the last gap: the
  // moment any input happens, the clock below has true coordinates to judge.
  // A trackpad fires well over a hundred moves a second, and the hit test is
  // the expensive part of the judge. Coalescing it to at most one per
  // animation frame keeps a fast sweep across the carousel off the critical
  // path — 60Hz is all the screen can show anyway — while the coordinates
  // themselves are recorded on every single event, so the frame that does run
  // always judges the newest position.
  let hitQueued = false;
  const runQueuedHit = () => {
    hitQueued = false;
    syncHot(lastPX, lastPY);
  };
  const noteCursor = (event) => {
    if (event.pointerType === "touch") return; // hover is a pointer concept
    lastPX = event.clientX;
    lastPY = event.clientY;
    if (!hitQueued) {
      hitQueued = true;
      requestAnimationFrame(runQueuedHit);
    }
  };
  // capture: window's capture listener fires FIRST, before any element (or
  // any injected extension code) can stopPropagation the event away from us
  ["pointermove", "pointerover", "pointerdown"].forEach((t) =>
    window.addEventListener(t, noteCursor, { passive: true, capture: true })
  );
  window.addEventListener(
    "wheel",
    (event) => {
      lastPX = event.clientX; // cursor position rides along on wheel events
      lastPY = event.clientY;
    },
    { passive: true, capture: true }
  );
  /* No pointerout handler on purpose. An earlier one cleared the highlight and
     dropped the cached coordinates whenever a pointerout arrived with a null
     relatedTarget, read as "the cursor left the window". Anything that merely
     takes focus away fires that too — a macOS screenshot, for one — and the
     dropped coordinates then silently disabled the self-healing clock below,
     so the card went dark and STAYED dark with no way back until the mouse
     moved again. Native :hover does not behave that way either: it holds its
     state through a focus change and updates on the next real move. The clock
     re-judges from the last known point, so anything that actually matters —
     the page scrolling, the carousel stepping, the cursor moving off — is
     picked up within a tick anyway. */

  // A real drag/flick must not fire the card link underneath — but an ordinary
  // click always jitters a few px (trackpad drift, touch taps), so only swallow
  // the click when the gesture actually MOVED the carousel or dragged a long way.
  // (The old 8px cut was so tight it ate normal clicks — "can't click in".)
  viewport.addEventListener(
    "click",
    (event) => {
      // A real drag/flick must never navigate.
      if (gestureStepped || moved > 24) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      // Clean click: because setPointerCapture retargeted this click onto the
      // viewport, the card's <a> never fired — so open its link ourselves.
      if (pressLink) {
        const href = pressLink.getAttribute("href");
        if (href) {
          event.preventDefault();
          if (pressLink.getAttribute("target") === "_blank") {
            window.open(href, "_blank", "noopener,noreferrer");
          } else {
            window.location.href = href;
          }
        }
      }
    },
    true
  );

  /* ---- horizontal trackpad gesture = exactly ONE step. Vertical wheel is
     never hijacked — it stays with the page, so page scrolling and project
     switching can't fight over the same input. While a step animates, and
     through the ~300ms inertia tail right after it, wheel events are swallowed
     so one physical swipe can never skip several projects. ---- */
  viewport.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return; // vertical → page
      event.preventDefault(); // horizontal gestures always belong to the line
      const now = performance.now();
      if (isProjectAnimating || now < gestureCooldownUntil) return;
      wheelAccum += event.deltaX;
      if (Math.abs(wheelAccum) < 24) return; // ignore micro-jitter
      stepTo(activeProjectIndex + Math.sign(wheelAccum));
    },
    { passive: false }
  );

  /* ---- keyboard navigation ---- */
  viewport.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepTo(activeProjectIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepTo(activeProjectIndex - 1);
    }
  });

  const stabilizeCards = () => {
    // Keep the cards behind the boot veil until their geometry and inline
    // transforms agree. This is used for first paint and return paths alike,
    // so no static, un-hung card can leak through between a restore and place().
    document.documentElement.classList.add("pc-boot");
    stepTo(activeProjectIndex, true);
    document.documentElement.classList.remove("pc-boot");
  };

  window.addEventListener("resize", stabilizeCards);
  // Returning to the page after it was away — tab switch back, bfcache
  // restore, or a discarded-tab reload ("长时间不动，突然回页面"): while the
  // page was hidden rAF never ran, and a resize/zoom/font settle in that gap
  // leaves the cards pinned to stale geometry for one visible frame. Re-pin
  // instantly in the same task, before that frame can paint.
  window.addEventListener("pageshow", stabilizeCards);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") stabilizeCards();
  });
  window.addEventListener("load", () => {
    measure();
    kick();
  });

  // Coming back from a case study: rest on THAT project's card, not the first
  // one. project.js stamps the slug into sessionStorage on every project page
  // load; consume it here (one-shot) and match it against the card links, so
  // the line opens on Voderrn after /projects/voderrn, on Chushubao after
  // /projects/chushubao, and so on. Consumed before the first place(), so the
  // boot veil never shows the wrong card. A bfcache restore skips all this and
  // simply keeps the index it left with.
  try {
    const slug = sessionStorage.getItem("pc-return-project");
    if (slug) {
      sessionStorage.removeItem("pc-return-project");
      const returnIndex = cards.findIndex((c) => {
        const link = c.querySelector(".pc-card-link[href]");
        return link && link.getAttribute("href") === `/projects/${slug}`;
      });
      if (returnIndex >= 0) activeProjectIndex = returnIndex;
    }
  } catch (e) { /* storage blocked — start at card 0 */ }

  // The first paint uses the exact same guarded path as a bfcache/visibility
  // restore. That keeps the initial and return states mechanically identical.
  stabilizeCards();

  /* ---- bun: calm two-eye blink every 4–6s, occasionally a quick double ---- */
  if (bun && !reduceMotion) {
    const closeFor = 110; // eyes shut duration (quick)
    const blinkOnce = (then) => {
      bun.classList.add("is-blink");
      window.setTimeout(() => {
        bun.classList.remove("is-blink");
        if (then) window.setTimeout(then, 150); // gap before a second blink
      }, closeFor);
    };
    const loop = () => {
      // ~35% of the time it's a gentle double blink
      blinkOnce(Math.random() < 0.35 ? () => blinkOnce() : null);
      window.setTimeout(loop, 4000 + Math.random() * 2000);
    };
    window.setTimeout(loop, 2200);
  }
})();
