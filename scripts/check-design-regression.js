const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const aboutHtml = fs.readFileSync("about.html", "utf8");
const caseHtml = fs.readFileSync("work.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const js = fs.readFileSync("script.js", "utf8");

const failures = [];

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

expect(html.includes('class="pull-chain"'), "theme control should be a pull-chain, not a round toggle");
expect(/<div class="header-actions">[\s\S]*?connect-button[\s\S]*?pull-chain/.test(html), "pull-chain should sit to the right of Let's Connect");
expect(html.includes('class="orange-eye-group"'), "hero orange should use a grouped Framer-style eye container");
expect(html.includes('class="orange-eye orange-eye-left"'), "hero orange should render a left eye");
expect(html.includes('class="orange-eye orange-eye-right"'), "hero orange should render a right eye");

const brandRule = css.match(/\.brand-mark\s*{([\s\S]*?)}/);
expect(brandRule && !/border\s*:/.test(brandRule[1]), "brand logo should not have an outer circular border");
expect(brandRule && !/background\s*:/.test(brandRule[1]), "brand logo should not sit on a white circular background");

// line-start anchor: selectors like `html[data-theme="dark"] body {` (the
// first-frame dark-mode boot) must not shadow the base body rule here
const bodyRule = css.match(/\nbody\s*{([\s\S]*?)}/);
expect(bodyRule && /background\s*:\s*var\(--paper\)/.test(bodyRule[1]), "page background should be a flat theme color");
expect(bodyRule && !/radial-gradient|linear-gradient/.test(bodyRule[1]), "page background should not use glows or gradients");

const bodyRuleForType = css.match(/\nbody\s*{([\s\S]*?)}/);
expect(bodyRuleForType && /font-size:\s*24px/.test(bodyRuleForType[1]), "base body type should be 24px");

const headerRule = css.match(/\.site-header\s*{([\s\S]*?)}/);
expect(headerRule && /position:\s*sticky/.test(headerRule[1]) && /top:\s*0/.test(headerRule[1]), "site header should stay visible while scrolling");
expect(css.includes(".site-header.is-scrolled"), "site header should have a stable scrolled state");
expect(/\.site-header\.is-scrolled\s+\.main-nav\s*{[\s\S]*?border-radius:\s*999px/.test(css), "scrolled menu should keep the light floating pill style");
expect(/\.main-nav\s*{[\s\S]*?font-size:\s*clamp\(18px,\s*1\.45vw,\s*23px\)/.test(css), "menu type should match the hero role line size");
expect(/\.main-nav\s*{[\s\S]*?border:\s*2px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.92\)/.test(css), "menu outer stroke should be white");
const menuHoverRule = css.match(/\.main-nav\s+a:hover,\s*[\s\S]*?\.main-nav\s+a:focus-visible\s*{([\s\S]*?)}/);
expect(/\.main-nav\s+a:hover,[\s\S]*?{[\s\S]*?color:\s*var\(--ink\)/.test(css), "menu hover should keep the original text black while the gray label rolls in");
expect(/\.main-nav a\s*{[\s\S]*?--nav-roll-distance:\s*148%/.test(css), "menu hover should use enough roll distance for longer labels");
expect(/\.main-nav a::after\s*{[\s\S]*?content:\s*attr\(data-nav-label\)[\s\S]*?color:\s*var\(--muted\)[\s\S]*?transform:\s*translateY\(var\(--nav-roll-distance\)\)/.test(css), "menu hover should use a gray duplicate label that rolls up from below");
expect(/\.main-nav a:hover \.nav-link-label,[\s\S]*?{[\s\S]*?transform:\s*translateY\(calc\(-1 \* var\(--nav-roll-distance\)\)\)/.test(css), "menu hover should roll the black label upward");
expect(menuHoverRule && !/background\s*:/.test(menuHoverRule[1]), "menu hover should not use background effects");
expect(menuHoverRule && !/text-decoration\s*:\s*underline/.test(menuHoverRule[1]), "menu hover should not use underline effects");
expect(/\.site-header\.is-scrolled\s+\.pull-chain/.test(css), "pull-chain should remain visible in the scrolled header");
expect(/\.pull-chain\s*{[\s\S]*?position:\s*absolute[\s\S]*?top:\s*calc\(-1\s*\*\s*var\(--header-top-pad\)\)/.test(css), "pull-chain should pin its image to the top edge without increasing header height");
expect(js.includes("is-scrolled") && /addEventListener\(\s*"scroll"/.test(js) && js.includes("requestAnimationFrame"), "script should toggle the scrolled header state with a stable animation-frame scroll handler");
expect(js.includes("SCROLLED_ENTER_Y = 48") && js.includes("SCROLLED_EXIT_Y = 12"), "header scroll state should use hysteresis to prevent menu flicker");
expect(css.includes("@keyframes home-soft-arrive") && css.includes('body[data-page="home"] .home-hero.is-visible .stamp-title span'), "Home hero should fade in with a light staggered arrival");
expect(css.includes("@keyframes about-soft-arrive") && css.includes(".about-hero.is-visible .about-collage"), "About hero should fade in with a light staggered arrival");
expect(css.includes(".about-page .photo-wall.is-visible .photo-card") && js.includes("syncVisibleAboutPhotoWall") && js.includes("let closestWall = null") && js.includes('body[data-page="about"] .photo-wall.reveal-section'), "About photo walls should use scroll-activated photo reveals");
expect(/\.about-page\s*{[\s\S]*?--about-card-width:\s*clamp\(178px,\s*15vw,\s*244px\)[\s\S]*?margin:\s*-30px\s+auto\s+0[\s\S]*?padding:\s*0\s+0/.test(css), "About hero should sit higher and define one gallery card size");
expect(/\.about-collage\s*{[\s\S]*?width:\s*min\(100%,\s*400px\)/.test(css), "About collage should be scaled down without changing its form");
expect(/\.photo-wall-wrap\s*{[\s\S]*?max-width:\s*min\(100%,\s*calc\(var\(--about-card-width\)\s*\*\s*5\s*\+\s*var\(--about-grid-gap\)\s*\*\s*4\)\)/.test(css), "About photo walls should share one centered width system");
expect(/\.grid-four\s*{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*var\(--about-card-width\)\)\)/.test(css), "Four-item about grids should use the shared card width");
expect(/\.grid-five\s*{[\s\S]*?grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*var\(--about-card-width\)\)\)/.test(css), "Five-item about grids should use the shared card width");
expect(/\.poster-media\s*{[\s\S]*?aspect-ratio:\s*7\s*\/\s*9/.test(css), "Poster sections should use the approved tall card proportions");
expect(!/\.poster-grid\s+\.photo-card\.no-caption\s*{[\s\S]*?padding-bottom/.test(css), "Poster cards without captions should not reserve blank caption space");
expect(aboutHtml.includes("Blow, blow, puff<br />puff puff!") && aboutHtml.includes("Two little cats,<br />softly grown.") && aboutHtml.includes("Met my first Vandy squirrel — smile ;)"), "About moment captions should use the requested line breaks and wording");
expect(
  js.includes('document.querySelector(".work-section.reveal-section")') &&
    js.includes("history.scrollRestoration = \"manual\"") &&
    js.includes("resetHomeOpening") &&
    js.includes("workCards.forEach((card) => card.classList.remove(\"is-visible\"))") &&
    js.includes("finishHomeOpening"),
  "Home opening should hold Projects until the gallery transition completes"
);
expect(/@media \(max-width:\s*1080px\)[\s\S]*?\.menu-toggle\s*{[\s\S]*?display:\s*none/.test(css), "tablet header should keep the desktop-style nav instead of switching to a menu button");
expect(/@media \(max-width:\s*1080px\)[\s\S]*?\.main-nav\s*{[\s\S]*?position:\s*static[\s\S]*?opacity:\s*1[\s\S]*?border-radius:\s*999px/.test(css), "tablet nav should remain a visible pill-shaped nav bar");
expect(/@media \(max-width:\s*660px\)[\s\S]*?\.menu-toggle\s*{[\s\S]*?display:\s*inline-flex[\s\S]*?font:\s*0\s*\/\s*0\s*a/.test(css), "phone header should show an icon-only menu button");
expect(/@media \(max-width:\s*660px\)[\s\S]*?body\.nav-lock\s*{[\s\S]*?position:\s*fixed[\s\S]*?overflow:\s*hidden/.test(css), "phone menu should lock body scrolling while open");
expect(/@media \(max-width:\s*660px\)[\s\S]*?\.main-nav\s*{[\s\S]*?position:\s*fixed[\s\S]*?inset:\s*0[\s\S]*?height:\s*100dvh[\s\S]*?background:\s*#ffffff[\s\S]*?font-family:\s*var\(--hand\)/.test(css), "phone menu should open as a restrained full-screen Gaegu overlay");
expect(html.includes('class="menu-socials"') && html.includes("Github") && html.includes("LinkedIn") && html.includes("Douyin") && html.includes("RedNote"), "phone menu should include restrained social links at the bottom");
expect(/@media \(max-width:\s*660px\)[\s\S]*?\.menu-socials\s*{[\s\S]*?display:\s*flex[\s\S]*?color:\s*#8b8b8b/.test(css), "phone menu social links should be gray and low-key");
expect(/\.site-header\.nav-open\s+\.main-nav\s*{[\s\S]*?opacity:\s*1[\s\S]*?transform:\s*translateY\(0\)/.test(css), "phone menu should become visible when nav-open is set");
expect(!/menuButton\.textContent\s*=\s*isOpen\s*\?\s*"Close"/.test(js), "menu button should not change into a Close control");
expect(js.includes("nav-lock") && js.includes("lockedScrollY"), "script should preserve scroll position while the phone menu is open");
expect(/@media \(max-width:\s*1080px\)[\s\S]*?\.header-actions\s*{[\s\S]*?display:\s*inline-flex/.test(css), "pull-chain should stay visible in tablet/mobile headers");
expect(/@media \(max-width:\s*1080px\)[\s\S]*?\.header-actions\s+\.connect-button\s*{[\s\S]*?display:\s*none/.test(css), "tablet/mobile header should keep the chain while hiding the connect pill");

expect(!html.includes('class="home-hero reveal-section"'), "Home should not keep the old hero section when the opening sequence is active");
expect(!html.includes("End to end design · Vibe coding"), "Home should not keep the old positioning copy in the new opening sequence");
// narrowed 2026-07-21: dark-mode charm gems legitimately use drop-shadow; the
// ban is about the ORANGE CHARACTER, so scope it to orange-* rules.
expect(!/\.orange[^{}]*\{[^}]*drop-shadow/m.test(css) && !/--glow/.test(css) && !/orange-stage::(before|after)/.test(css), "orange character should not glow");
expect(css.includes(".orange-eye"), "CSS should style orange eyes");
// The eye rig is proportional: script.js measures the stage against the 360px
// desktop reference and writes --eye-scale, which drives pupil size + gap here
// and the travel range / resting offset in JS. The Framer-era eyeGap (82px) and
// eyeSize (22px) survive as the desktop-reference numerators.
expect(/--eye-scale:\s*1/.test(css), "eye rig should define a scale factor that JS can drive from the stage width");
expect(/--eye-gap:\s*calc\(82px\s*\*\s*var\(--eye-scale\)\)/.test(css), "eye gap should scale from the provided Framer eyeGap value");
expect(/--eye-size:\s*calc\(22px\s*\*\s*var\(--eye-scale\)\)/.test(css), "eye size should scale from the provided Framer eyeSize value");
expect(js.includes("EYE_REF_STAGE_WIDTH") && js.includes("--eye-scale"), "eye travel range should scale with the stage instead of using fixed desktop pixels");
expect(/--eye-top:\s*50%/.test(css), "eyes should use the provided Framer eyeTop value");
expect(/--eye-left:\s*41%/.test(css), "eyes should use the provided Framer eyeLeft value");
expect(/\.orange-eye-group\s*{[\s\S]*?gap:\s*var\(--eye-gap\)/.test(css), "eyes should be positioned as a grouped pair");
expect(/\.orange-eye\s*{[\s\S]*?width:\s*var\(--eye-size\)/.test(css), "eye dots should use a controlled size");
expect(!/\.orange-eye\s*{[\s\S]*?transition:\s*transform\s*100ms/.test(css), "orange eyes should not use laggy transform transitions");
expect(css.includes("@keyframes orange-natural-blink") && css.includes("@keyframes orange-blink-once"), "orange eyes should have natural fallback and one-shot blink animations");
expect(css.includes(".orange-stage.has-random-blink .orange-eye:not(.is-blinking)"), "randomized blink mode should only disable the fallback animation between blinks");
expect(js.includes("requestAnimationFrame") && js.includes("window.addEventListener(\"pointermove\""), "eyes should follow the page pointer smoothly with animation frames");
expect(js.includes('window.addEventListener("mousemove"'), "eyes should also follow mousemove events for browser compatibility");
expect(js.includes("randomBlinkDelay") && js.includes("scheduleBlink") && js.includes('classList.add("has-random-blink")'), "orange eyes should blink at natural randomized intervals");
expect(!/window\.matchMedia\("\(pointer:\s*fine\)"\)\.matches/.test(js), "eye movement should not be disabled by pointer media detection");
expect(js.includes("leftInner") && js.includes("rightInner"), "eyes should support Framer-style inward convergence");
expect(js.includes("maxX = 82") && js.includes("maxY = 62"), "eyes should use an expanded movement range in JavaScript");
expect(js.includes("leftReachBoost = 14") && js.includes("downReachBoost = 8"), "eyes should have extra reach for left and lower-left glances");
expect(js.includes("directionalConvergence"), "eyes should avoid pulling the left eye back when looking left");
expect(js.includes("smoothness = 0.1") && js.includes("convergence = 11"), "eyes should preserve Framer smoothing while increasing convergence for wide side glances");
expect(js.includes("upBoost = 1.1") && js.includes("downReduce = 0.85"), "eyes should use the provided vertical movement multipliers");
expect(js.includes("deadZone = 0.02"), "eyes should use the provided Framer dead zone");
expect(!/pull-chain[\s\S]{0,260}var\(--orange\)/.test(css), "pull-chain hover/focus should not use an orange outer ring");
expect(html.includes("assets/system/chain.png"), "pull-chain should embed the chain asset");
expect(/class="chain-image"/.test(html), "pull-chain should render the embedded chain as an image layer");
expect(/\.chain-image\s*{[\s\S]*?object-fit:\s*contain/.test(css), "embedded pull-chain image should preserve its aspect ratio");
expect(/\.chain-image\s*{[\s\S]*?pointer-events:\s*none/.test(css), "embedded pull-chain image should keep the button interaction");
expect(/@keyframes chain-pull[\s\S]*?scaleY\(1\.16\)[\s\S]*?rotate\(-7deg\)[\s\S]*?rotate\(6deg\)/.test(css), "pull-chain should stretch and wobble when pulled");
expect(!/box-shadow:\s*[^;]*var\(--orange\)/.test(css), "hover/focus effects should not use orange shadow backgrounds");
expect(/\.pill-button:hover\s*{[\s\S]*?background:\s*var\(--paper\);[\s\S]*?color:\s*var\(--ink\);/.test(css), "pill buttons should hover by inverting between black and white");
expect(!html.includes('aria-hidden="true">↗</span>'), "Home should not use the text arrow glyph for buttons");
expect(/\.button-arrow\s*{[\s\S]*?width:\s*9px[\s\S]*?height:\s*9px[\s\S]*?border-top:\s*2px\s+solid\s+currentColor[\s\S]*?border-right:\s*2px\s+solid\s+currentColor/.test(css), "Button arrows should use the smaller unified CSS stroke language");
expect(/\.work-card\.is-visible:hover\s*{[\s\S]*?transform:\s*translateY\(-2px\)/.test(css), "Work card hover should stay light and restrained");
expect(html.includes('class="pc-media pc-media-wentong"'), "featured Work card should hang on the clothesline with the wentong media panel");
expect(html.includes('assets/cover/voderrn-cover-scene.png'), "Voderrn card should use the hand-drawn scene cover");
expect(/body\[data-theme="dark"\]\s+\.voderrn-media\s*{[\s\S]*?background:\s*#d8dde5/.test(css), "Voderrn cover should stay visible on dark mode");
expect(html.includes('class="pc-media pc-media-health"') && html.includes('assets/cover/healthcare-cover-scene.png'), "Healthcare card should hang on the clothesline with the hand-drawn scene cover");
expect(html.includes("<h2 id=\"work-title\" class=\"work-heading-title pc-sr-title\">Selected projects</h2>"), "Home Work title should stay for screen readers only (visually hidden)");
expect(html.includes('pc-card-soon') && html.includes('assets/cover/llm-cover-scene.png'), "Coming-soon card should hang on the line showing the LLM scene cover");
expect(html.includes('class="pc-year">2025<') && html.includes("<h3>Voderrn</h3>"), "Voderrn project copy should use the updated year and title");
expect(html.includes('class="pc-year">2024<') && html.includes("<h3>Healthcare</h3>"), "Healthcare project copy should use the updated year and title");
expect(!html.includes('id="work-title">Work</h2>') && !html.includes('id="work-title">Work.</h2>'), "Work heading should not include the large Work title");
expect(!html.includes('story-strip'), "Home page should not include the 01/02/03 story strip after Work");
expect(!html.includes('about-teaser'), "Home page should not include the About teaser after Work");
expect(/\.work-section\s*{[\s\S]*?background:\s*#ffffff/.test(css), "Home Work section should use a white background in light mode");
expect(/body\[data-theme="dark"\]\s+\.work-section\s*{[\s\S]*?background:\s*#000000/.test(css), "Home Work section should stay black in dark mode");
expect(/\.work-heading-title\s*{[\s\S]*?font-family:\s*var\(--hand\)[\s\S]*?font-size:\s*clamp\(18px,\s*1\.45vw,\s*23px\)/.test(css), "Selected projects heading should match the home body scale");
expect(/\.work-heading-title\s*{[\s\S]*?font-weight:\s*400/.test(css), "Selected projects heading should not be bold");
expect(/\.work-section\s*{[\s\S]*?min-height:\s*min\(980px,\s*100vh\)[\s\S]*?padding:\s*clamp\(84px,\s*7\.5vw,\s*116px\)\s+0\s+96px/.test(css), "Home Work section should keep the tightened vertical spacing (title removed)");
expect(/\.work-board\s*{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[\s\S]*?gap:\s*clamp\(84px,\s*9vw,\s*136px\)\s+clamp\(58px,\s*6\.6vw,\s*104px\)[\s\S]*?width:\s*min\(100%,\s*1000px\)[\s\S]*?margin:\s*0\s+auto/.test(css), "Home Work board should use a centered two-column grid with balanced project spacing");
expect(/\.work-card-copy\s+h3\s*{[\s\S]*?font-size:\s*clamp\(12px,\s*1\.25vw,\s*17px\)/.test(css), "Work card titles should use the smaller approved scale");
expect(/\.work-media-full\s*{[\s\S]*?aspect-ratio:\s*16\s*\/\s*10[\s\S]*?height:\s*auto[\s\S]*?border-radius:\s*22px/.test(css), "Work media should use the updated lighter card proportions");
expect(/\.work-card-feature\s+\.work-media-full\s*{[\s\S]*?height:\s*auto/.test(css), "Featured Work media should stay restrained in the new grid");
expect(/\.work-row\s*{[\s\S]*?display:\s*contents/.test(css), "Desktop Work row wrapper should no longer control the new four-card grid");
expect(/class="pc-media pc-media-wentong">[\s\S]*?<\/div>\s*<div class="pc-caption">\s*<div class="pc-cap-main">\s*<h3>Publishing × AI<\/h3>\s*<span class="pc-year">2026<\/span>/.test(html), "Work card copy should sit inside the card below the image panel, title + year sharing the first caption row");
expect(html.includes('class="pc-go">visit site') && html.includes('class="pc-go">case study') && html.includes('class="pc-go">pitch deck') && /\.pc-go\s*{[\s\S]*?transition:\s*color/.test(css), "Each linked clothesline card should carry a quiet destination hint that warms on hover");
expect(!/\.pc-card[\s\S]{0,400}?scale\(var\(--pc-depth/.test(css) && !js.includes("--pc-depth"), "Lower carousel should stay flat and front-facing — no perspective scaling");
expect(html.includes('class="pc-track"') && html.includes('class="pc-rope"') && html.includes('class="pc-top-line"') && html.includes('assets/system/clothesline-top.svg') && html.includes('clothesline.js'), "Selected projects should keep the two-rope clothesline scene (vector artwork top rope + perspective zipline)");
expect(html.includes('class="pc-bun"') && html.includes('pc-bun-eye-l'), "The orange bun mascot should hang from the fixed top rope with winkable eyes");
expect(js.includes("const workCards = Array.from") && js.includes("syncVisibleWorkCards") && js.includes("(enterLine - top) / (enterLine - settleLine)"), "Work card reveal should be scroll-scrubbed (position-driven progress, glide-compensated), settling into .is-visible — never a triggered pop animation");
expect(html.includes('class="home-intro-screen is-active"') && html.includes('data-text="Hi, I\'m Xin.L"'), "Home should start with the prototype intro sequence");
expect(html.includes('data-text="Currently a senior @ Vanderbilt University"') && html.includes('data-text="I bring designs to life through code"'), "Home intro should keep all three requested lines");
expect(html.includes('class="home-gallery-screen"') && html.includes('class="orange-stage"'), "Home opening should include the hero screen while reusing the existing orange character");
expect(html.includes('class="home-vibe-note">All made with vibe coding ;)'), "Home hero should include the small vibe-coding note below the orange character");
expect(html.includes('class="hh-title">Hi, I\'m Xin.</h1>'), "Home hero should greet with the static handwritten title (no subtitle line)");
expect(html.includes(">play with me!<") && html.includes('class="hh-annot-arrow"'), "The orange should carry the play-with-me annotation with its drawn arrow");
expect((html.match(/class="hh-photo hh-photo-\d"/g) || []).length === 3 && js.includes('querySelectorAll(".hh-photo")') && js.includes("setPointerCapture"), "Home hero should hang exactly three draggable polaroids driven by the pointer-drag module");
expect(!html.includes("data-home-photo") && !html.includes("home-photo-main"), "The old collage photos and main video must stay retired from the home markup");
expect(!/class="hh-photo[^>]*>[\s\S]{0,400}?<figcaption/.test(html), "Hero polaroids must stay caption-free");
expect(/\.hh-photo\s*{[\s\S]*?touch-action:\s*none/.test(css) && /\.hh-title\s*{[\s\S]*?font-family:\s*var\(--hand\)/.test(css), "Hero CSS must be present in the stylesheet (a parallel-editor save once wiped it silently)");
expect(/\.home-intro-screen\s*{[\s\S]*?position:\s*fixed[\s\S]*?background:\s*#ffffff[\s\S]*?font-family:\s*var\(--hand\)/.test(css), "Home intro screens should use the white Gaegu prototype style");
expect(/\.intro-line\s*{[\s\S]*?font-size:\s*clamp\(27px,\s*1\.9vw,\s*30px\)[\s\S]*?font-weight:\s*300[\s\S]*?text-shadow:\s*none/.test(css), "Home intro should keep the prototype-like light type scale (user-tuned 2026-07: 27-30px)");
expect(/\.home-gallery-screen\s*{[\s\S]*?min-height:\s*100svh[\s\S]*?background:\s*#ffffff/.test(css), "Home gallery should be a full white screen before Projects");
expect(/body\.home-opening-complete\s+\.home-gallery-screen\s*{[\s\S]*?display:\s*none/.test(css), "Home gallery should leave normal page flow after the opening completes");
expect(!/body\[data-theme="dark"\]\s+\.home-intro-screen/.test(css), "Intro screens should stay white and should not have a dark mode override");
expect(/body\[data-theme="dark"\]\s+\.home-gallery-screen\s*{[\s\S]*?background:\s*#000000/.test(css), "Home gallery should support dark mode after the intro");
expect(/body\[data-theme="dark"\]\[data-page="home"\]\s+\.home-gallery-screen\s*{[\s\S]*?background:\s*#000000/.test(css), "Home gallery dark override should win over later home-specific light rules");
expect(/body\[data-theme="dark"\]\[data-page="home"\]\s+\.home-vibe-note\s*{[\s\S]*?color:\s*#ffffff/.test(css), "Home gallery vibe note should remain visible in dark mode");
expect(/body\[data-theme="dark"\]\[data-page="home"\]\s+\.home-photo\s*{[\s\S]*?background:\s*[\s\S]*?#121212/.test(css), "Home gallery placeholder cards should use a dark surface in dark mode");
expect(js.includes("typeIntroLine") && js.includes("pageHomeOpening") && js.includes("galleryArmed") && js.includes("applyHomeGalleryDelta") && js.includes("homeRevealProgress"), "Home opening should use prototype paging with scroll-driven gallery progress");
expect(js.includes("reenterHomeGalleryFromProjects") && !js.includes("runHomeGalleryTransition"), "Home gallery should be reversible from Projects and should not autoplay through a timed transition");
expect(!js.includes("homeReentryHoldUntil") && !js.includes("isReturningFromProjects") && !js.includes("isFinishingHomeOpening"), "Home reverse should not keep stale reentry patch state or undeclared finishing flags");
expect(!js.includes("home-reentry-prep") && !css.includes("home-reentry-prep"), "Home reverse should not rely on the failed reentry-prep patch class");
expect(/reenterHomeGalleryFromProjects\(\)[\s\S]*?event\.preventDefault\(\);\s*showHeaderTemporarily\(\);\s*return;/.test(js), "Home reverse wheel event should only enter the centered video state, then wait for the next scroll");
expect(/const\s+reenterHomeGalleryFromProjects\s*=\s*\(\)\s*=>\s*{[\s\S]*?setHomeGalleryProgress\(GALLERY_RELEASE_PROGRESS\);[\s\S]*?return true;/.test(js), "Home reverse should re-enter parked at the handoff's release point (a pixel-identical swap) and ride back through the smoother");
expect(js.includes("reenterHomeGalleryFromProjects"), "Home should support reverse re-entry into the gallery from the projects view");
expect(/deltaY\s*<\s*-28[\s\S]*?reenterHomeGalleryFromProjects/.test(js), "Home reverse re-entry should trigger on a deliberate upward wheel gesture");
expect(js.includes("skipHomeOpening") && js.includes("!window.location.hash"), "Home opening should skip cleanly when entering directly through #work");
expect(!js.includes("--work-preview-") && !css.includes("--work-preview-"), "Home opening should not use a fixed Projects preview layer that overlaps the video");
expect(!css.includes("home-gallery-screen::after"), "Home gallery should not draw a duplicate Selected projects overlay heading");
expect(!js.includes("--home-work-title-") && !css.includes("--home-work-title-"), "Home opening handoff should not use heading-only CSS variables");
expect(js.includes("home-work-handoff") && css.includes(".home-opening-active.home-work-handoff .work-section"), "Home opening should reveal the real Work section during the video handoff");
expect(/body\[data-page="home"\]\.home-opening-active:not\(\.home-work-handoff\)\s+\.work-section,\s*body\[data-page="home"\]\.home-opening-active\s+\.site-footer\s*{[\s\S]*?visibility:\s*hidden/.test(css), "Home opening should hide Projects until the real handoff begins and keep the footer hidden");
expect(!js.includes("snapToWorkGroup") && !js.includes("getWorkSnapTargets") && !js.includes("workSnapLock"), "Home Work should no longer use embedded snap scrolling after the opening animation");
expect(caseHtml.includes('class="case-theme-toggle pull-chain"'), "Voderrn case page should include the pull-chain theme toggle");
expect(/body\[data-theme="dark"\]\[data-page="case-study"\]\s*{[\s\S]*?background:\s*#000000/.test(css), "Voderrn case page should support whole-page dark mode");
expect(/\.case-floating-nav\s*{[\s\S]*?grid-template-columns:\s*64px\s+minmax\(0,\s*auto\)\s+64px/.test(css), "Voderrn case nav should keep arrow, menu, and chain in one balanced row");
expect(/\.work-card-placeholder\s+\.work-media-full::before,[\s\S]*?\.work-card-placeholder\s+\.work-media-full::after\s*{[\s\S]*?content:\s*none/.test(css), "Placeholder Work card should not show a link arrow");
expect(/\.work-media-full\s*{[\s\S]*?--project-arrow-circle:\s*clamp\(30px,\s*3\.2vw,\s*44px\)/.test(css), "Work card arrow circle should keep the original larger circle size");
expect(/\.work-media-full\s*{[\s\S]*?--project-arrow-size:\s*clamp\(5px,\s*0\.55vw,\s*8px\)/.test(css), "Work card arrow itself should be much smaller than the circle");
expect(/\.work-media-full::before\s*{[\s\S]*?border-radius:\s*50%/.test(css), "Work card arrow should sit inside a subtle circular control");
expect(/\.work-media-full::before\s*{[\s\S]*?z-index:\s*2/.test(css), "Work card arrow circle should sit above full-cover images");
expect(/\.work-media-full::after\s*{[\s\S]*?z-index:\s*3/.test(css), "Work card arrow stroke should sit above the arrow circle");
expect(/\.work-media-full::after\s*{[\s\S]*?left:\s*calc\(var\(--project-arrow-left\)\s*\+\s*\(var\(--project-arrow-circle\)\s*-\s*var\(--project-arrow-size\)\)\s*\/\s*2\)/.test(css), "Work card arrow should be horizontally centered inside the circle");
expect(/\.work-media-full::after\s*{[\s\S]*?bottom:\s*calc\(var\(--project-arrow-bottom\)\s*\+\s*\(var\(--project-arrow-circle\)\s*-\s*var\(--project-arrow-size\)\)\s*\/\s*2\)/.test(css), "Work card arrow should be vertically centered inside the circle");
expect(/\.work-media-full::after\s*{[\s\S]*?border-top:\s*2px\s+solid\s+currentColor[\s\S]*?border-right:\s*2px\s+solid\s+currentColor/.test(css), "Work card arrow should be drawn with tiny rounded CSS strokes");
expect(/\.work-card:hover\s+\.work-media-full::before\s*{[\s\S]*?background:\s*#ffffff/.test(css), "Work card hover should reveal a clean white arrow circle");
expect(/\.work-card:hover\s+\.work-media-full::after\s*{[\s\S]*?color:\s*#050505/.test(css), "Work card hover should turn the arrow black");
expect(/\.work-card:hover\s+\.work-media-full\s+img\s*{[\s\S]*?transform:\s*scale\(1\.035\)/.test(css), "Work card hover should gently enlarge the image");
expect(!/\.work-card:hover\s*{[\s\S]*?background:\s*var\(--ink\)/.test(css), "Work card hover should not use a black background");
expect(html.includes("https://www.linkedin.com/in/christus-luo"), "LinkedIn profile should be wired into the page");
expect(/<footer class="site-footer">\s*<nav class="footer-socials"[\s\S]*?<a href="#" aria-label="Douyin">Douyin<\/a>\s*<a href="#" aria-label="RedNote">RedNote<\/a>\s*<\/nav>\s*<p class="footer-copy">Copyright © 2026 C\.L<\/p>\s*<\/footer>/.test(html), "Footer should only keep Douyin, RedNote, and copyright in one row");
expect(!html.includes('class="footer-nav"'), "Footer should not include the old page navigation");
expect(!html.includes('class="footer-cta"'), "Footer should not include the old CTA title");
expect(!/<footer class="site-footer">[\s\S]*?(Github|LinkedIn|Let's Connect)[\s\S]*?<\/footer>/.test(html), "Footer should not include Github, LinkedIn, or Let's Connect links");
expect(/\.footer-socials\s+a::after\s*{[\s\S]*?border-top:\s*2px\s+solid\s+currentColor[\s\S]*?border-right:\s*2px\s+solid\s+currentColor/.test(css), "Footer Douyin and RedNote should use the original tiny arrow decoration");
expect(!/\.footer-nav/.test(css), "Footer CSS should not keep the old footer navigation layout");
expect(!html.includes("<p class=\"eyebrow\">Contact</p>"), "Footer banner should not include the Contact eyebrow");
expect(html.includes("Copyright © 2026 C.L"), "Footer should include the requested copyright");
expect(/\.site-footer\s*{[\s\S]*?--footer-divider-offset:\s*0px[\s\S]*?position:\s*relative[\s\S]*?background:\s*var\(--paper\)[\s\S]*?color:\s*var\(--ink\)[\s\S]*?border-top:\s*0/.test(css), "Light footer should keep content close to the top divider");
expect(/\.site-footer::before\s*{[\s\S]*?top:\s*var\(--footer-divider-offset\)[\s\S]*?height:\s*1px[\s\S]*?background:\s*color-mix\(in srgb,\s*var\(--ink\)\s*12%,\s*transparent\)/.test(css), "Footer divider should align with the compact banner content");
expect(/\.site-footer\s*{[\s\S]*?--footer-inline-pad:\s*max\(56px,\s*calc\(\(100vw\s*-\s*1280px\)\s*\/\s*2\)\)[\s\S]*?display:\s*flex[\s\S]*?justify-content:\s*space-between[\s\S]*?padding:\s*22px\s+var\(--footer-inline-pad\)\s+clamp\(26px,\s*3vw,\s*40px\)/.test(css), "Footer should align its one-line content and divider with the home content width");
expect(/body\[data-theme="dark"\]\s+\.site-footer\s*{[\s\S]*?background:\s*#000000[\s\S]*?color:\s*#ffffff/.test(css), "Dark footer should stay black");
expect(/body\[data-theme="dark"\]\s+\.site-footer::before\s*{[\s\S]*?background:\s*#ffffff/.test(css), "Dark footer should use a white internal divider");
expect(/\.footer-socials\s*{[\s\S]*?display:\s*flex[\s\S]*?font-size:\s*clamp\(18px,\s*1\.45vw,\s*23px\)/.test(css), "Footer social links should keep the existing handwritten type scale");
expect(/\.footer-copy\s*{[\s\S]*?text-align:\s*right[\s\S]*?white-space:\s*nowrap/.test(css), "Footer copyright should sit on the right in one line");
expect(!/@media \(max-width:\s*1080px\)[\s\S]*?\.site-header,\s*[\s\S]*?\.site-footer,\s*[\s\S]*?\.page-shell/.test(css), "Tablet container rule should not shrink the footer");

if (failures.length) {
  console.error("Design regression check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Design regression check passed.");
