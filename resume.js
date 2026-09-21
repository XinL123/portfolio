/* Résumé — one composition. The pinned sheet on the left never changes; the
   text on the right turns between two pages (Experience / Education + Skills
   + Toolbox) in one fixed slot — both screens share a grid cell, so the slot
   is always as tall as the taller one and nothing below it moves. The two
   arrowheads are the ONLY way to turn the page (by request): the progress
   marks between them just show where you are, and the ends do not wrap. */
(() => {
  const screens = [...document.querySelectorAll(".resume-screen")];
  if (screens.length < 2) return;

  const prevBtn = document.querySelector(".resume-prev");
  const nextBtn = document.querySelector(".resume-next");
  const cap = document.querySelector(".rs-cap");
  const status = document.querySelector(".resume-status");
  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const last = screens.length - 1;
  const names = screens.map((s) => {
    const h = s.querySelector("h2");
    return s.getAttribute("aria-label") || (h ? h.textContent.trim() : "");
  });

  let index = 0;
  let locked = false;
  let lockTimer = null;

  const render = () => {
    screens.forEach((s, i) => {
      s.classList.toggle("is-active", i === index);
      s.classList.toggle("is-past", i < index);
      s.setAttribute("aria-hidden", String(i !== index));
    });
    // the capsule slides one slot (34 svg units = 34px) per page
    if (cap) cap.style.setProperty("--rs-slot", String(index));
    if (status) status.textContent = `Page ${index + 1} of ${screens.length}: ${names[index]}`;
    // the ends are really disabled: no wrap, no hover, out of the tab order
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === last;
  };

  // one press = one page: ignore further input until the swap has settled
  const lock = () => {
    locked = true;
    window.clearTimeout(lockTimer);
    lockTimer = window.setTimeout(() => { locked = false; }, reduceMQ.matches ? 220 : 460);
  };

  const go = (dir) => {
    if (locked) return;
    const next = Math.min(Math.max(index + dir, 0), last);
    if (next === index) return;
    index = next;
    render();
    lock();
  };

  prevBtn && prevBtn.addEventListener("click", () => go(-1));
  nextBtn && nextBtn.addEventListener("click", () => go(1));

  // a disabled arrow drops out of the tab order; when that happens under the
  // keyboard user, hand focus to the arrow that still works so it is not lost
  [prevBtn, nextBtn].forEach((btn, i) => {
    btn && btn.addEventListener("click", () => {
      if (btn.disabled) (i === 0 ? nextBtn : prevBtn)?.focus();
    });
  });

  render();

  /* ---- the pager's right edge. It ends where the text does: on the right
     edge of the widest line in Experience — "... @ Vanderbilt University" on
     a window wide enough to hold it on one line. The line's width follows the
     type's own clamp() while the column is a fixed 560px, so no CSS
     expression tracks both; measured here instead. The +7.5px carries the
     chevron's ink out to that edge (see .resume-pager in styles.css). Phones
     stack the page and keep the CSS fallback. ---- */
  const pager = document.querySelector(".resume-pager");
  const deskMQ = window.matchMedia("(min-width: 821px)");
  const fitPager = () => {
    if (!pager) return;
    if (!deskMQ.matches) {
      pager.style.removeProperty("--rs-pager-w");
      return;
    }
    // measured off the screen's own left edge, so the screens' slide transform
    // (translateX ±16px) does not enter the number
    const left = screens[0].getBoundingClientRect().left;
    let widest = 0;
    screens[0].querySelectorAll(".experience-entry p").forEach((p) => {
      const range = document.createRange();
      range.selectNodeContents(p);
      for (const line of range.getClientRects()) widest = Math.max(widest, line.right - left);
    });
    if (widest > 0) pager.style.setProperty("--rs-pager-w", `${(widest + 7.5).toFixed(1)}px`);
  };

  /* ---- the composition's centre. What the eye takes for the middle of this
     page is the empty channel between the sheet and the text, and that is not
     the middle of the grid box: the sheet hangs at the right of a 396px track
     and the text starts at the left of a 560px column, so the channel sits
     wherever those two tracks leave it. This puts the channel's centre — the
     sheet's right edge to the text's left edge — on the window's centre, the
     line the menu is centred on. The two blocks are different widths, so the
     outer margins are NOT equal afterwards; that is the trade the channel
     costs, and it is the one we want (asked 2026-09-20). ---- */
  const page = document.querySelector(".resume-page");
  const paper = document.querySelector(".resume-paper");
  const screensSlot = document.querySelector(".resume-screens");
  const CHANNEL_NUDGE = 20; // px the channel sits LEFT of the window's centre
  const centreComposition = () => {
    if (!page || !paper || !screensSlot) return;
    if (!deskMQ.matches) {
      page.style.removeProperty("--rs-centre-shift");
      return;
    }
    const sheetRight = paper.getBoundingClientRect().right;
    // the slot's own left edge: every line starts there, and the screens'
    // slide transform (translateX ±16px) stays out of the number
    const textLeft = screensSlot.getBoundingClientRect().left;
    const shift = parseFloat(page.style.getPropertyValue("--rs-centre-shift")) || 0;
    // ... and then a nudge left of it, by eye: the text block is the wider of
    // the two, so a dead-centre channel leaves the page feeling right-heavy
    const error = window.innerWidth / 2 - CHANNEL_NUDGE - (sheetRight + textLeft) / 2;
    if (Math.abs(error) < 0.5) return;
    page.style.setProperty("--rs-centre-shift", `${(shift + error).toFixed(1)}px`);
  };

  const refit = () => {
    fitPager();
    centreComposition();
  };

  refit();
  // Gaegu arrives after first paint and the lines grow; re-measure when it lands
  document.fonts?.ready.then(refit);
  let fitFrame = null;
  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(fitFrame);
    fitFrame = window.requestAnimationFrame(refit);
  });

  /* ---- the breeze. The sheet is still most of the time; now and then a
     draught catches it, swings it about the pin and lets it ring down. The
     first lands 1.1s after the page is seen, then 7–18s after each one has
     settled (a swing itself runs 2.9–8s, the wider the longer), and 3.5–8.5s
     after coming back to the tab. Off for reduced motion and on phones, where
     the sheet sits above the text and a moving picture would only distract. */
  const phoneMQ = window.matchMedia("(max-width: 820px)");
  if (!paper) return;

  let breezeTimer = null;
  const canSway = () => !reduceMQ.matches && !phoneMQ.matches && document.visibilityState === "visible";

  /* How hard this particular draught blows. Three strengths — a breath, a
     gust, a real push — and the wind does not repeat itself: the strength that
     just blew is the least likely to come again, so small and big interleave
     instead of the sheet ticking along at one size. */
  const BREEZE_TIERS = [
    { name: "breath", swing: [0.8, 1.6] },
    { name: "gust", swing: [2.0, 3.4] },
    { name: "strong", swing: [4.0, 6.0] },
  ];

  // odds of [breath, gust, strong] given what blew last — each row leans away
  // from the strength it follows
  const BREEZE_ODDS = {
    none: [0.4, 0.35, 0.25],
    breath: [0.22, 0.4, 0.38],
    gust: [0.42, 0.16, 0.42],
    strong: [0.5, 0.38, 0.12],
  };

  let lastTier = "none";

  const draught = () => {
    const odds = BREEZE_ODDS[lastTier];
    let roll = Math.random();
    let i = 0;
    while (i < odds.length - 1 && roll > odds[i]) {
      roll -= odds[i];
      i += 1;
    }
    lastTier = BREEZE_TIERS[i].name;
    const [low, high] = BREEZE_TIERS[i].swing;
    const swing = low + Math.random() * (high - low);
    // the harder the push, the longer the sheet takes to stop swinging — but
    // only the first swing is slow; the keyframes hand the later ones less and
    // less of this clock, so the flutter quickens as it fades
    const time = (2000 + swing * 850) * (0.92 + Math.random() * 0.16);
    // how much of each swing survives into the next one back
    const decay = 0.4 + Math.random() * 0.1;
    return { swing, time, decay };
  };

  const sway = () => {
    if (!canSway()) return 0;
    const { swing, time, decay } = draught();
    // four peaks, each a fraction of the one before: out, back past rest, and
    // twice more, smaller, until it hangs still
    paper.style.setProperty("--rs-breeze-1", `${swing.toFixed(2)}deg`);
    paper.style.setProperty("--rs-breeze-2", `${(swing * decay).toFixed(2)}deg`);
    paper.style.setProperty("--rs-breeze-3", `${(swing * decay ** 2).toFixed(2)}deg`);
    paper.style.setProperty("--rs-breeze-4", `${(swing * decay ** 3).toFixed(2)}deg`);
    paper.style.setProperty("--rs-breeze-time", `${Math.round(time)}ms`);
    paper.classList.remove("is-swaying");
    void paper.offsetWidth; // restart the keyframes if a previous run is still on the class
    paper.classList.add("is-swaying");
    return time; // the scheduler waits this out before timing the next draught
  };
  paper.addEventListener("animationend", () => paper.classList.remove("is-swaying"));

  const schedule = (delay) => {
    window.clearTimeout(breezeTimer);
    breezeTimer = window.setTimeout(() => {
      // measured from where THIS one settles, so a long push is never followed
      // straight away by the next: 7–18s of genuine stillness in between
      const spent = sway() || 0; // a skipped draught (hidden tab) costs nothing
      schedule(spent + 7000 + Math.random() * 11000);
    }, delay);
  };

  // the first, noticing sway lands once the page's own fade-in has finished
  schedule(1100);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedule(3500 + Math.random() * 5000);
    else window.clearTimeout(breezeTimer);
  });
  reduceMQ.addEventListener?.("change", () => { if (reduceMQ.matches) paper.classList.remove("is-swaying"); });
})();
