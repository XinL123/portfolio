/* ============================================================
   小橘子 · intro-scene companion — behaviour (home page)

   The self-intro screen is a pinned, scroll-scrubbed scene; the site's own
   scroll physics move it, this script only adds LIFE, all smooth + scrubbed:

     • lip orange:   climbs out from behind the glass panel's lip exactly
                     as the panel buries the work section, then shyly ducks
                     back in (rise = smooth function of the panel's real
                     on-screen position; scrolling back replays it)
     • anchor orange: blooms as the pinned scene arrives; its eyes follow
                     whichever intro sentence is alive, then look straight
                     ahead as the closing tagline appears
     • ambient glow: soft flowing light in the section's four palette
                     colours, gathering behind the focused sentence

   Remove this file and the markup degrades to quiet static ornaments.
   ============================================================ */

(() => {
  if (document.body.dataset.page !== "home") return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* pinned intro scene parts */
  const runway = document.querySelector(".obx-runway");
  const anchor = document.querySelector(".obx-anchor");
  const phrases = [...document.querySelectorAll(".obx-phrase")];
  const tagline = document.querySelector(".obx-tagline");
  const glow = document.querySelector(".obx-glow");
  if (!runway || !anchor) return;

  /* lip peeker (optional) — a shy orange that peeks over the glass panel's lip */
  const lipWrap = document.querySelector(".obx-lip-wrap");
  const lip = document.querySelector(".obx-lip");
  const studio = document.querySelector(".studio-block");

  /* ambient-light nodes: where the glow gathers + which palette colour it wears
     for each of the four sentences (the section's own peach / butter / matcha /
     coral). Positions roughly track each sentence's block on screen. */
  const GLOW_NODES = [
    { x: 27, y: 32, c: [255, 186, 145] }, // ph1 left-upper  · peach
    { x: 73, y: 40, c: [255, 219, 143] }, // ph2 right-upper · butter
    { x: 20, y: 58, c: [178, 207, 148] }, // ph3 left-lower  · matcha (nudged left)
    { x: 71, y: 60, c: [255, 199, 178] }, // ph4 right-lower · coral
  ];

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => {
    const t = clamp01((v - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const setVar = (el, k, v) => el.style.setProperty(k, v);

  /* The stacked tiers (same media terms as orange-buddy.css) put every
     sentence in ONE shared box below the dome, so the desktop's overlapping
     crossfade would double-expose two sentences mid-switch. There the windows
     must be strictly sequential. Checked per tick — a resize/rotation simply
     changes which timeline the same scroll position reads from. */
  const stackedMq = window.matchMedia(
    "(max-width: 1080px), (max-width: 1180px) and (orientation: portrait)"
  );

  /* ---------- shared blink (life only — off under reduced motion) ---------- */
  if (!reduceMotion) {
    const allEyes = [...document.querySelectorAll(".obx-eye")];
    const blink = () => {
      allEyes.forEach((e) => {
        e.classList.remove("is-blinking");
        void e.offsetWidth;
        e.classList.add("is-blinking");
      });
      setTimeout(blink, 3000 + Math.random() * 3600);
    };
    setTimeout(blink, 2400);
  }

  /* ---------- state ---------- */
  let aLX = 0, aLY = 0;
  let rise = 0, lastLipDocTop = -1, lipLX = 0, lipLY = 0;
  let lastTickAt = 0;
  /* glow state (smoothly lerped toward the focused sentence) */
  let glX = 50, glY = 48, glR = 255, glG = 186, glB = 145, glO = 0;

  const tick = (now) => {
    lastTickAt = now;
    const vh = window.innerHeight;
    const y = window.scrollY;

    /* ---- lip orange: peek out while the panel buries the work, then shyly
       duck all the way back in before the panel parks. Starts MOSTLY hidden (a
       thin sliver), gradually emerges with scroll, reaches 2/3 out just past the
       half-viewport mark, then retracts COMPLETELY as the scroll continues. Pure
       function of the panel's real position — scrolling back replays it. */
    if (lip && lipWrap && studio) {
      /* Opening gate. While the opening choreography runs, the work section is
         position:fixed and the glass panel is hidden, so the panel's measured
         position is meaningless — gluing the peeker to it teleports the anchor
         to the top of the page. Bail out ENTIRELY (no glue, no curve) and hard-
         zero the state: lerping toward 0 is not enough, because the rest state
         on Projects is a 0.10 sliver whose --obx-lip-o is already 1.0, so the
         decay left the orange fully opaque for the first frames of the reverse
         handoff — the "small orange appears upper-right" artifact. CSS hides
         the wrap on the same condition; this keeps the state clean too, so the
         peeker re-enters from rest rather than resuming mid-decay. */
      const openingDone =
        document.body.classList.contains("home-opening-complete") &&
        !document.body.classList.contains("home-opening-active");

      if (!openingDone) {
        rise = 0;
        lastLipDocTop = -1; // force a re-glue once the panel is real again
        setVar(lipWrap, "--obx-rise", "0");
        setVar(lipWrap, "--obx-lip-o", "0");
      } else {
        const sr = studio.getBoundingClientRect();
        const st = sr.top;
        /* glue the peeker's anchor to the panel's top edge in document space
           (the panel is in-flow, so this only changes on layout shifts) */
        const docTop = sr.top + y - (studio.offsetParent ? studio.offsetParent.getBoundingClientRect().top + y : 0);
        if (Math.abs(docTop - lastLipDocTop) > 0.5) {
          lastLipDocTop = docTop;
          setVar(lipWrap, "--obx-lip-top", `${docTop.toFixed(1)}px`);
        }
        const emerge = 0.1 + 0.57 * smooth(vh * 0.95, vh * 0.48, st); /* sliver 0.10 → 2/3 out */
        const duck = 1 - smooth(vh * 0.44, vh * 0.12, st);            /* … → fully hidden */
        const target = emerge * duck;
        rise = reduceMotion ? target : lerp(rise, target, 0.16);
        setVar(lipWrap, "--obx-rise", rise.toFixed(3));
        /* fully retracted = sunk into the frost: fade the under-glass body away */
        setVar(lipWrap, "--obx-lip-o", clamp01(rise / 0.08).toFixed(3));
        /* eyes: centred, gazing up over the lip, easing back as it ducks */
        const outAmt = Math.min(1, rise / 0.67);
        lipLX = lerp(lipLX, 0, 0.12);
        lipLY = lerp(lipLY, lerp(1.6, -2.0, outAmt), 0.12);
        setVar(lip, "--obx-lx", `${lipLX.toFixed(2)}px`);
        setVar(lip, "--obx-ly", `${lipLY.toFixed(2)}px`);
      }
    }

    /* ---- pinned intro scene: scroll progress IS the timeline ----
       p = how far the visitor has scrubbed through the runway (0→1).
       Every value below is a pure function of p — scrub back, it plays back. */
    if (!reduceMotion) {
      const r = runway.getBoundingClientRect();
      const span = Math.max(1, r.height - vh);
      const p = clamp01(-r.top / span);

      /* anchor orange: a long, gentle bloom — most of it is the scroll-scrubbed
         fade that plays after the stage pins. Driven by the scene's real position
         r.top (monotonic with scroll). Finishes long before the first sentence
         (p 0.08), so the gaze is straight. lipClear crossfades the anchor in only
         as the peeker ducks away — never both prominent at once. */
      const lipClear = 1 - clamp01((rise - 0.15) / 0.45);
      const inF = smooth(vh * 0.7, -vh * 1.1, r.top) * lipClear;
      const guide = smooth(0.9, 1, p);
      anchor.style.setProperty("--obx-s", (0.72 + 0.28 * inF).toFixed(3));
      anchor.style.setProperty("--obx-o", inF.toFixed(3));
      anchor.style.setProperty("--obx-dy", `${(guide * 16).toFixed(1)}px`);

      /* each sentence lives in a progress window: [fade-in a→b, hold, fade-out c→d].
         Desktop scatter: windows overlap (a crossfade between different spots).
         Stacked tiers: strictly sequential with a beat of air between — two
         sentences may never share the one text box. */
      const stacked = stackedMq.matches;
      const W = stacked
        ? [
            [0.06, 0.11, 0.19, 0.24],
            [0.26, 0.31, 0.39, 0.44],
            [0.46, 0.51, 0.59, 0.64],
            [0.66, 0.71, 0.79, 0.84],
          ]
        : [
            [0.08, 0.18, 0.30, 0.40],
            [0.24, 0.34, 0.46, 0.56],
            [0.40, 0.50, 0.62, 0.72],
            [0.56, 0.66, 0.80, 0.88],
          ];
      /* where the anchor's eyes turn while each sentence is alive. Desktop:
         toward each scattered phrase (±20px at a 259px body). Stacked: every
         sentence sits centred BELOW the dome, so the gaze just dips down with
         a tiny alternating sideways flick for life. */
      const sz = (anchor.offsetWidth || 259) / 259;
      const LOOK = (stacked
        ? [[-6, 12], [6, 12], [-6, 12], [6, 12]]
        : [[-20, -8], [20, -6.6], [-20, 12.3], [20, 13.8]]
      ).map(([x, y]) => [x * sz, y * sz]);
      let lx = 0, ly = 0, wsum = 0;
      let gx = 0, gy = 0, gr = 0, gg = 0, gb = 0, gw = 0; // weighted glow target
      phrases.forEach((el, i) => {
        if (!W[i]) return;
        const [a, b, c, d] = W[i];
        const fi = smooth(a, b, p);
        const fo = 1 - smooth(c, d, p);
        const vis = fi * fo;
        el.style.opacity = vis.toFixed(3);
        el.style.transform = `translateY(${((1 - fi) * 30 - (1 - fo) * 22).toFixed(1)}px)`;
        lx += LOOK[i][0] * vis; ly += LOOK[i][1] * vis; wsum += vis;
        const n = GLOW_NODES[i];
        gx += n.x * vis; gy += n.y * vis;
        gr += n.c[0] * vis; gg += n.c[1] * vis; gb += n.c[2] * vis; gw += vis;
      });

      /* tagline arrives late and stays for the hand-off. On the stacked tiers
         it shares the sentence box, so it must wait for ph4 to finish (0.84) */
      const tf = stacked ? smooth(0.86, 0.94, p) : smooth(0.8, 0.92, p);
      if (tagline) {
        tagline.style.setProperty("--obx-tag-o", tf.toFixed(3));
        tagline.style.setProperty("--obx-tag-y", `${((1 - tf) * 22).toFixed(1)}px`);
      }

      /* eyes follow the living sentence, then return to a straight forward gaze
         as the closing tagline takes over — no downward glance at the end. */
      const px = wsum > 0.02 ? lx / wsum : 0;
      const py = wsum > 0.02 ? ly / wsum : 0;
      const settle = smooth(0.78, 0.9, p); // 0 while reading, 1 once the tagline shows
      aLX = lerp(aLX, lerp(px, 0, settle), 0.14);
      aLY = lerp(aLY, lerp(py, 0, settle), 0.14);
      anchor.style.setProperty("--obx-lx", `${aLX.toFixed(2)}px`);
      anchor.style.setProperty("--obx-ly", `${aLY.toFixed(2)}px`);

      /* ---- ambient glow: light gathers behind the focused sentence and shifts
         among the four palette colours as the reading flow moves left↔right.
         Between sentences it eases toward centre. As the closing tagline appears
         it flattens into a soft horizontal band on the tagline line and fades. */
      if (glow) {
        let tX, tY, tR, tG, tB;
        if (gw > 0.05) {
          tX = gx / gw; tY = gy / gw; tR = gr / gw; tG = gg / gw; tB = gb / gw;
        } else {
          // no sentence dominant → gather softly at centre; hold current colour
          tX = 50; tY = 46; tR = glR; tG = glG; tB = glB;
        }
        const inScene = smooth(0.02, 0.12, p);
        const lineF = smooth(0.80, 0.93, p);          // tagline takeover
        const fadeOut = 1 - smooth(0.86, 0.98, p);    // vanish with the last line
        tX = lerp(tX, 50, lineF);
        tY = lerp(tY, 60, lineF);
        const focus = 0.55 + 0.45 * clamp01(gw);
        // peak layer opacity — the one knob for "how visible". Lower for fainter.
        const targetO = inScene * fadeOut * focus * 1.0;

        glX = lerp(glX, tX, 0.07);
        glY = lerp(glY, tY, 0.07);
        glR = lerp(glR, tR, 0.06);
        glG = lerp(glG, tG, 0.06);
        glB = lerp(glB, tB, 0.06);
        glO = lerp(glO, targetO, 0.09);

        // flatten into a wide, low band as the tagline takes over ("in a line")
        const rx = lerp(32, 60, lineF);
        const ry = lerp(25, 11, lineF);

        glow.style.setProperty("--glow-x", `${glX.toFixed(1)}%`);
        glow.style.setProperty("--glow-y", `${glY.toFixed(1)}%`);
        glow.style.setProperty("--glow-color", `${Math.round(glR)}, ${Math.round(glG)}, ${Math.round(glB)}`);
        glow.style.setProperty("--glow-opacity", glO.toFixed(3));
        glow.style.setProperty("--glow-rx", `${rx.toFixed(1)}vmax`);
        glow.style.setProperty("--glow-ry", `${ry.toFixed(1)}vmax`);
      }
    }

    schedule();
  };

  /* rAF while visible; slow heartbeat while hidden (rAF pauses there) */
  const schedule = () => {
    if (document.visibilityState === "hidden") setTimeout(() => tick(performance.now()), 120);
    else requestAnimationFrame(tick);
  };

  /* watchdog: restart the loop if the browser froze it (bfcache etc.) */
  const kick = () => {
    if (performance.now() - lastTickAt > 1000) schedule();
  };
  document.addEventListener("visibilitychange", kick);
  window.addEventListener("pageshow", kick);

  schedule();
})();
