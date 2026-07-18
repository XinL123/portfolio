/* ============================================================================
   VISUAL SNAPSHOT HARNESS (browser dev tool — not shipped, not linked)
   ----------------------------------------------------------------------------
   Purpose: prove "this change did not move anything" by hashing computed
   styles + geometry of key elements per PAGE × VIEWPORT × INTERACTIVE STATE,
   before and after an edit. Equal hashes = pixel-equivalent for the tracked
   properties; any difference names the exact selector and state.

   HOW TO RUN (dev server on :4173):
     1. Open http://localhost:4173/ in a REAL visible tab, stay at the top
        (fresh load, opening not yet advanced).
     2. In the console:  await import('/scripts/visual-snapshot.browser.js')
     3. Static matrix (hidden iframes, fast):
            await __vsnap.static()
     4. Interactive gallery flow (top window only — it drives the REAL wheel
        pipeline in script.js, not class staging). It disables transitions for
        the duration of the run: every sample is a settled state, so settled
        geometry is identical either way, and it keeps rects truthful even in
        a tab the browser is not compositing (visibilityState 'hidden' — e.g.
        a preview pane that is not on screen — never advances transitions, so
        an inline transform would otherwise read back as its start value
        forever):
            await __vsnap.galleryFlow()     // reloads-sensitive: run on a
                                            // freshly loaded home page only
     5. Copy the JSON output somewhere safe, make your edit, reload, re-run,
        diff. Also re-run __vsnap.static() — it is deterministic.

   COVERAGE HONESTY RULES (the 2026-07-15 lesson — a collage-centering
   regression hid inside a display:none state that the old harness happily
   hashed as "identical"):
     • An element that is display:none, 0×0, or inside a hidden ancestor is
       recorded as HIDDEN and listed in `notCovered` for that state. A HIDDEN
       entry is NOT visual verification of that element.
     • Every result object carries a `coverage` block naming which selectors
       were actually visible in each state. Read it before claiming a pass.
     • The home gallery specifically must be verified via BOTH:
         static 'gallery-rest' (class-staged, layout-level), AND
         galleryFlow() (real opening: rest → reveal-mid → reveal-full →
         reverse-restored), because the reveal writes inline transforms that
         no static state exercises.
   ========================================================================= */
(() => {
  const SEL = [
    '.site-header', '.main-nav a', '.brand-mark',
    // home gallery (visible states only — see coverage rules above)
    '.home-gallery-stage', '.home-photo-a', '.home-photo-b', '.home-photo-c',
    '.home-photo-d', '.home-photo-e', '.home-photo-main',
    '.home-gallery-screen .orange-stage', '.home-vibe-note',
    // clothesline work section
    '.work-section', '.pc-scene', '.pc-top', '.pc-bun', '.pc-l1pic',
    '.pc-l1star', '.pc-card', '.pc-card .pc-media img', '.pc-worked-note',
    '.pc-worked-text', '.pc-pinwheel',
    // studio / intro scene / what-i-like
    '.studio-block', '.obx-stage', '.obx-anchor', '.obx-ph1', '.obx-tagline',
    '.studio-services-inner', '.studio-service-name',
    '.studio-service.is-active .studio-service-big',
    '.studio-service.is-active .studio-service-media',
    // film strip + footer
    '.marquee-viewport', '.marquee-track', '.reach-note', '.site-footer'
  ];
  const PROPS = ['display', 'position', 'top', 'left', 'right', 'bottom',
    'z-index', 'font-family', 'font-size', 'font-weight', 'line-height',
    'letter-spacing', 'color', 'background-color', 'margin', 'padding',
    'border-radius', 'overflow', 'text-align', 'opacity'];
  const VIEWPORTS = [[1440, 900], [1280, 800], [990, 700], [834, 1194],
    [768, 1024], [560, 800], [390, 844]];
  const PAGES = ['/', '/about.html', '/work.html', '/playground.html', '/resume.html'];

  const djb2 = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  };

  /* Timing via a Web Worker: worker timers are exempt from background-tab
     throttling (a hidden pane clamps main-thread setTimeout chains to one
     wake per MINUTE after ~5 min — observed turning a 30s static() run into
     a crawl). Falls back to plain setTimeout if workers are unavailable.
     NOTE this only exempts the harness's own waits; the PAGE's timers (the
     1120ms intro gate galleryFlow depends on) still throttle, so run flows
     within ~5 min of a fresh load. */
  let _w = null, _wid = 0;
  const _pending = {};
  const wait = (ms) => {
    try {
      if (!_w) {
        _w = new Worker(URL.createObjectURL(new Blob(
          ['onmessage=e=>setTimeout(()=>postMessage(e.data[1]),e.data[0])'],
          { type: 'text/javascript' })));
        _w.onmessage = (e) => { const f = _pending[e.data]; delete _pending[e.data]; if (f) f(); };
      }
      return new Promise((r) => { _pending[++_wid] = r; _w.postMessage([ms, _wid]); });
    } catch (e) {
      return new Promise((r) => setTimeout(r, ms));
    }
  };

  const isHidden = (el, win) => {
    if (!el) return true;
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) return true;
    for (let n = el; n; n = n.parentElement) {
      if (win.getComputedStyle(n).display === 'none') return true;
    }
    return false;
  };

  // hash every selector in `doc`; returns { hash, perSel, covered[], hidden[] }
  // perSel keeps one hash PER SELECTOR so a before/after diff names the exact
  // element that moved, not just the state it moved in.
  const snapshotDoc = (doc, win) => {
    let acc = '';
    const covered = [], hidden = [], perSel = {};
    SEL.forEach((sel) => {
      const el = doc.querySelector(sel);
      if (!el) { acc += sel + ':ABSENT;'; return; } // not on this page at all
      if (isHidden(el, win)) { hidden.push(sel); acc += sel + ':HIDDEN;'; perSel[sel] = 'HIDDEN'; return; }
      const cs = win.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const h = djb2(
        PROPS.map((p) => cs.getPropertyValue(p)).join('|') + '@' +
        [r.left, r.top, r.width, r.height].map((n) => Math.round(n)).join(',')
      );
      acc += sel + ':' + h + ';';
      perSel[sel] = h;
      covered.push(sel);
    });
    return { hash: djb2(acc), perSel, covered, hidden };
  };

  const freeze = (doc) => {
    const st = doc.createElement('style');
    st.textContent = '*,*::before,*::after{animation:none !important;transition:none !important}';
    doc.head.appendChild(st);
    return st;
  };

  const inIframe = (w, h, path, stage) => new Promise((resolve) => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:-9999px;top:0;border:0;visibility:hidden;width:' + w + 'px;height:' + h + 'px';
    f.src = path;
    // Readiness = DOM parsed + stylesheet applied + fonts ready. Deliberately
    // NOT the iframe load event: that waits for the autoplay videos (several
    // seconds each), which contribute nothing to computed styles/geometry.
    const t0 = Date.now();
    const measure = () => {
      try {
        const doc = f.contentDocument, win = f.contentWindow;
        freeze(doc);
        stage(doc);
        resolve(snapshotDoc(doc, win));
      } catch (e) { resolve({ hash: 'ERROR:' + e, covered: [], hidden: [] }); }
      finally { f.remove(); }
    };
    const poll = () => {
      let ready = false;
      try {
        const doc = f.contentDocument, win = f.contentWindow;
        // page-agnostic readiness: DOM parsed + main stylesheet applied
        // (body font comes from styles.css on every page)
        ready = !!(doc && doc.body && doc.readyState !== 'loading' &&
          win.getComputedStyle(doc.body).fontFamily.includes('Gaegu'));
      } catch (e) {}
      if (ready) {
        const settle = () => wait(400).then(measure);
        f.contentDocument.fonts.ready.then(settle, settle);
      } else if (Date.now() - t0 > 15000) {
        measure(); // last resort — better a measurement than a hang
      } else {
        wait(100).then(poll);
      }
    };
    document.body.appendChild(f);
    poll();
  });

  const STAGES = {
    // page as it settles after the opening (gallery is display:none here —
    // gallery selectors will report HIDDEN, i.e. NOT verified by this state)
    'opening-complete': (doc) => {
      doc.body.classList.remove('home-opening-active', 'home-gallery-active', 'home-work-handoff');
      doc.body.classList.add('home-opening-complete');
      doc.querySelectorAll('.reveal-section').forEach((s) => s.classList.add('is-visible'));
    },
    // the collage at rest, VISIBLE (layout-level check for the gallery zone)
    'gallery-rest': (doc) => {
      doc.body.classList.add('home-gallery-active');
    }
  };

  const api = {};

  /* Static matrix: home in both states at 7 viewports; other pages in
     opening-complete at 2 viewports. Deterministic; safe in hidden iframes
     because it measures only class-staged layout (no transitions needed). */
  api.static = async () => {
    const out = { hashes: {}, selectors: {}, coverage: {} };
    const record = (key, r) => {
      out.hashes[key] = r.hash;
      out.selectors[key] = r.perSel;
      out.coverage[key] = { covered: r.covered.length, notCovered: r.hidden };
    };
    for (const [w, h] of VIEWPORTS) {
      for (const state of ['opening-complete', 'gallery-rest']) {
        const r = await inIframe(w, h, '/', STAGES[state]);
        record('/@' + w + 'x' + h + '#' + state, r);
      }
    }
    for (const p of PAGES.slice(1)) {
      for (const [w, h] of [[1280, 800], [390, 844]]) {
        const r = await inIframe(w, h, p, STAGES['opening-complete']);
        record(p + '@' + w + 'x' + h + '#opening-complete', r);
      }
    }
    console.log(JSON.stringify(out, null, 1));
    return out;
  };

  /* Diff two static() results; returns only what changed, per state, naming
     the exact selectors. Usage: __vsnap.diff(before, after) */
  api.diff = (a, b) => {
    const report = {};
    const keys = new Set([...Object.keys(a.hashes), ...Object.keys(b.hashes)]);
    keys.forEach((k) => {
      if (a.hashes[k] === b.hashes[k]) return;
      const sa = a.selectors ? a.selectors[k] || {} : {};
      const sb = b.selectors ? b.selectors[k] || {} : {};
      const sels = new Set([...Object.keys(sa), ...Object.keys(sb)]);
      report[k] = [...sels].filter((s) => sa[s] !== sb[s])
        .map((s) => s + ': ' + (sa[s] || 'ABSENT') + ' -> ' + (sb[s] || 'ABSENT'));
    });
    return report;
  };

  /* Interactive gallery flow — TOP WINDOW ONLY, freshly loaded home page.
     Drives the real opening with wheel events (no class staging). Transitions
     are disabled for the run: samples are settled states only, so geometry is
     unchanged, and rects stay truthful even when the tab is not compositing
     (see header). `renderingLive` in the output records whether frames were
     actually being painted during the run. States covered:
       gallery-rest      arrival at the collage via the real opening
       reveal-mid        2 scrub ticks into the reveal (photos dispersing,
                         main video part-enlarged, inline transforms live)
       reveal-full       4 ticks: main at its full enlarged size
       rest-restored     reverse ticks back; MUST hash-equal gallery-rest,
                         proving reverse-scroll restoration is lossless */
  api.galleryFlow = async () => {
    if (window !== window.top) throw new Error('run on the visible top window');
    if (innerWidth === 0 || innerHeight === 0) {
      throw new Error('viewport is 0x0 — size the tab first (all rects would read HIDDEN)');
    }
    // honesty probe: count painted frames while the flow runs
    let frames = 0, rafOn = true;
    const rafCb = () => { frames++; if (rafOn) requestAnimationFrame(rafCb); };
    requestAnimationFrame(rafCb);
    const frozen = freeze(document);
    const tick = (dy) => window.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true }));
    const gallerySel = SEL.filter((s) => s.includes('home-') || s.includes('orange-stage') || s.includes('vibe'));
    const snapGallery = () => {
      let acc = '';
      const hidden = [];
      gallerySel.forEach((sel) => {
        const el = document.querySelector(sel);
        if (!el || isHidden(el, window)) { hidden.push(sel); acc += sel + ':HIDDEN;'; return; }
        const r = el.getBoundingClientRect();
        acc += sel + '@' + [r.left, r.top, r.width, r.height].map((n) => Math.round(n)).join(',') + ';';
      });
      return { hash: djb2(acc), hidden };
    };
    const out = { states: {}, coverage: {} };
    // page through the intros (timer-gated at 1120ms each)
    for (let i = 0; i < 4; i++) { tick(260); await wait(1300); }
    await wait(1200); // gallery arm delay (950ms) before scrubs count
    let s = snapGallery();
    out.states['gallery-rest'] = s.hash; out.coverage['gallery-rest'] = s.hidden;
    for (let i = 0; i < 2; i++) { tick(300); await wait(300); }
    s = snapGallery();
    out.states['reveal-mid'] = s.hash; out.coverage['reveal-mid'] = s.hidden;
    for (let i = 0; i < 2; i++) { tick(300); await wait(300); }
    s = snapGallery();
    out.states['reveal-full'] = s.hash; out.coverage['reveal-full'] = s.hidden;
    for (let i = 0; i < 6; i++) { tick(-300); await wait(300); }
    await wait(400);
    s = snapGallery();
    out.states['rest-restored'] = s.hash;
    out.reverseRestoresExactly = out.states['rest-restored'] === out.states['gallery-rest'];
    // a flow where the reveal never moved anything is a broken run, not a pass
    out.revealActuallyMoved = out.states['reveal-mid'] !== out.states['gallery-rest'] &&
      out.states['reveal-full'] !== out.states['reveal-mid'];
    out.renderingLive = frames > 0;
    rafOn = false;
    frozen.remove();
    console.log(JSON.stringify(out, null, 1));
    return out;
  };

  window.__vsnap = api;
  console.log('__vsnap ready: await __vsnap.static() | await __vsnap.galleryFlow()');
})();
