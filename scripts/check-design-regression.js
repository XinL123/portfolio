const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
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

const bodyRule = css.match(/body\s*{([\s\S]*?)}/);
expect(bodyRule && /background\s*:\s*var\(--paper\)/.test(bodyRule[1]), "page background should be a flat theme color");
expect(bodyRule && !/radial-gradient|linear-gradient/.test(bodyRule[1]), "page background should not use glows or gradients");

const bodyRuleForType = css.match(/body\s*{([\s\S]*?)}/);
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
expect(/\.site-header\.nav-open\s+\.main-nav\s*{[\s\S]*?border-radius:\s*999px[\s\S]*?transform:\s*translateY\(0\)\s*scale\(1\)/.test(css), "mobile menu should open as a floating Framer-style pill");
expect(!/menuButton\.textContent\s*=\s*isOpen\s*\?\s*"Close"/.test(js), "menu button should not change into a Close control");
expect(/@media \(max-width:\s*1080px\)[\s\S]*?\.header-actions\s*{[\s\S]*?display:\s*inline-flex/.test(css), "pull-chain should stay visible in tablet/mobile headers");
expect(/@media \(max-width:\s*1080px\)[\s\S]*?\.header-actions\s+\.connect-button\s*{[\s\S]*?display:\s*none/.test(css), "tablet/mobile header should keep the chain while hiding the connect pill");

const heroRule = css.match(/\.home-hero\s*{([\s\S]*?)}/);
expect(heroRule && /1\.38fr/.test(heroRule[1]) && /0\.62fr/.test(heroRule[1]), "hero layout should give the title enough width for the three-line composition");

const stampRule = css.match(/\.stamp-title\s*{([\s\S]*?)}/);
expect(stampRule && /gap:\s*28px/.test(stampRule[1]), "hero title line spacing should be slightly more open");
expect(stampRule && /line-height:\s*1\.32/.test(stampRule[1]), "hero title should use a slightly more open line height");
expect(stampRule && /font-size:\s*clamp\(28px,\s*3vw,\s*42px\)/.test(stampRule[1]), "hero title should use the smaller approved size scale");

const bodyCopyRule = css.match(/\.role-line,\s*[\s\S]*?\.eyebrow\s*{([\s\S]*?)}/);
expect(bodyCopyRule && /font-size:\s*clamp\(18px,\s*1\.45vw,\s*23px\)/.test(bodyCopyRule[1]), "hero/body supporting copy should be reduced");
expect(html.includes("End to end design · Vibe coding"), "hero role line should use the updated positioning copy");

expect(!/drop-shadow|filter:\s*blur|--glow|orange-stage::before|orange-stage::after/.test(css), "orange character should not glow");
expect(css.includes(".orange-eye"), "CSS should style orange eyes");
expect(/--eye-max-x:\s*74px/.test(css), "eyes should use the expanded maxX range");
expect(/--eye-max-y:\s*56px/.test(css), "eyes should use the expanded maxY range");
expect(/--eye-gap:\s*82px/.test(css), "eyes should use the provided Framer eyeGap value");
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
expect(html.includes("assets/system/crayon-pull-chain.png"), "pull-chain should embed the crayon-textured chain asset");
expect(/class="chain-image"/.test(html), "pull-chain should render the embedded chain as an image layer");
expect(/\.chain-image\s*{[\s\S]*?object-fit:\s*contain/.test(css), "embedded pull-chain image should preserve its aspect ratio");
expect(/\.chain-image\s*{[\s\S]*?pointer-events:\s*none/.test(css), "embedded pull-chain image should keep the button interaction");
expect(/@keyframes chain-pull[\s\S]*?scaleY\(1\.16\)[\s\S]*?rotate\(-7deg\)[\s\S]*?rotate\(6deg\)/.test(css), "pull-chain should stretch and wobble when pulled");
expect(!/box-shadow:\s*[^;]*var\(--orange\)/.test(css), "hover/focus effects should not use orange shadow backgrounds");
expect(/\.pill-button:hover\s*{[\s\S]*?background:\s*var\(--paper\);[\s\S]*?color:\s*var\(--ink\);/.test(css), "pill buttons should hover by inverting between black and white");
expect(html.includes('class="button-arrow"') && !html.includes('aria-hidden="true">↗</span>'), "About button should use the unified CSS arrow, not the text arrow glyph");
expect(/\.button-arrow\s*{[\s\S]*?width:\s*9px[\s\S]*?height:\s*9px[\s\S]*?border-top:\s*2px\s+solid\s+currentColor[\s\S]*?border-right:\s*2px\s+solid\s+currentColor/.test(css), "Button arrows should use the smaller unified CSS stroke language");
expect(/\.work-card:hover\s*{[\s\S]*?transform:\s*translateY\(-2px\)/.test(css), "Work card hover should stay light and restrained");
expect(html.includes('class="work-media work-media-full wentong-media"'), "featured Work card should use a full-image media area");
expect(html.includes('assets/cover/voderrn-cover-balanced.png'), "Voderrn work card should use the balanced uploaded cover image");
expect(html.includes('class="work-media work-media-full gown-media"'), "Gown Card should use the same full-image card language with a placeholder media area");
expect(html.includes("<span>2025</span>") && html.includes("<h3>Fashion × Business</h3>"), "Voderrn project copy should use the updated year and title");
expect(html.includes("<span>2024</span>") && html.includes("<h3>Healthcare</h3>"), "Gown Card project copy should use the updated year and title");
expect(!html.includes('id="work-title">Work.</h2>'), "Work heading should not include a period");
expect(!html.includes('story-strip'), "Home page should not include the 01/02/03 story strip after Work");
expect(!html.includes('about-teaser'), "Home page should not include the About teaser after Work");
expect(/\.work-section\s+\.eyebrow\s*{[\s\S]*?color:\s*var\(--ink\)/.test(css), "Selected projects eyebrow should be black");
expect(/\.work-section\s+h2\s*{[\s\S]*?font-size:\s*clamp\(28px,\s*3vw,\s*42px\)/.test(css), "Work heading should match the homepage title size");
expect(/\.work-card-copy\s+h3\s*{[\s\S]*?font-size:\s*clamp\(20px,\s*1\.85vw,\s*30px\)/.test(css), "Work card titles should be slightly smaller");
expect(/\.work-media-full\s*{[\s\S]*?height:\s*clamp\(280px,\s*34vw,\s*460px\)[\s\S]*?border-radius:\s*22px/.test(css), "Work media should be a large rounded full-image panel with constrained height");
expect(/\.work-card-feature\s+\.work-media-full\s*{[\s\S]*?height:\s*clamp\(300px,\s*36vw,\s*460px\)/.test(css), "Featured Work media should be cinematic but not too tall");
expect(/\.work-row\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.45fr\)\s+minmax\(260px,\s*0\.55fr\)/.test(css), "Desktop Work row should keep Voderrn larger than Gown Card");
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
expect(html.includes('class="footer-nav"') && html.includes('href="index.html"') && html.includes('href="#work"') && html.includes('href="about.html"') && html.includes('href="resume.html"') && html.includes('href="playground.html"'), "Footer should include the full menu navigation");
expect(html.includes('class="footer-socials"') && html.includes("Github") && html.includes("Douyin") && html.includes("RedNote") && html.includes("Let's Connect"), "Footer should include Github, Douyin, RedNote, and Let's Connect in the same right-side list");
expect(/<nav class="footer-socials"[\s\S]*?<p class="footer-copy">Copyright © 2026 C\.L<\/p>[\s\S]*?<\/nav>/.test(html), "Footer copyright should live in the social column to align with Playground");
expect(!/class="[^"]*footer-connect[^"]*"/.test(html), "Footer Let's Connect should not be a separate pill");
expect(!html.includes("<p class=\"eyebrow\">Contact</p>"), "Footer banner should not include the Contact eyebrow");
expect(html.includes("Copyright © 2026 C.L"), "Footer should include the requested copyright");
expect(/\.site-footer\s*{[\s\S]*?--footer-divider-offset:\s*clamp\(28px,\s*3\.2vw,\s*44px\)[\s\S]*?position:\s*relative[\s\S]*?background:\s*var\(--paper\)[\s\S]*?color:\s*var\(--ink\)[\s\S]*?border-top:\s*0/.test(css), "Light footer should be full-bleed white without a top-edge divider");
expect(/\.site-footer::before\s*{[\s\S]*?top:\s*var\(--footer-divider-offset\)[\s\S]*?height:\s*1px[\s\S]*?background:\s*color-mix\(in srgb,\s*var\(--ink\)\s*12%,\s*transparent\)/.test(css), "Footer divider should move down with the banner content");
expect(/\.site-footer\s*{[\s\S]*?--footer-inline-pad:\s*clamp\(52px,\s*7vw,\s*92px\)[\s\S]*?padding:\s*clamp\(84px,\s*9vw,\s*126px\)\s+var\(--footer-inline-pad\)\s+clamp\(42px,\s*5vw,\s*68px\)/.test(css), "Footer content should sit slightly lower with equal inline padding");
expect(/body\[data-theme="dark"\]\s+\.site-footer\s*{[\s\S]*?background:\s*#000000[\s\S]*?color:\s*#ffffff/.test(css), "Dark footer should stay black");
expect(/body\[data-theme="dark"\]\s+\.site-footer::before\s*{[\s\S]*?background:\s*#ffffff/.test(css), "Dark footer should use a white internal divider");
expect(/\.footer-cta\s+h2\s*{[\s\S]*?font-size:\s*clamp\(28px,\s*3vw,\s*42px\)/.test(css), "Footer title should match the homepage title scale");
expect(html.includes("<span>Let's make</span>") && html.includes("<span>something</span>") && html.includes("<span>feel alive!</span>"), "Footer title should be split into controlled lines");
expect(/\.footer-cta\s+h2\s*{[\s\S]*?display:\s*grid[\s\S]*?gap:\s*var\(--footer-title-gap\)/.test(css), "Footer title should use a dedicated larger line gap");
expect(/\.site-footer\s*{[\s\S]*?--footer-title-gap:\s*clamp\(48px,\s*6\.4vw,\s*84px\)/.test(css), "Footer title line spacing should be opened further");
expect(/\.site-footer\s*{[\s\S]*?--footer-list-gap:\s*clamp\(30px,\s*3\.2vw,\s*46px\)/.test(css), "Footer should define one shared list line gap");
expect(/\.footer-nav,\s*[\s\S]*?\.footer-socials\s*{[\s\S]*?grid-template-rows:\s*repeat\(5,\s*minmax\(32px,\s*max-content\)\)[\s\S]*?gap:\s*var\(--footer-list-gap\)/.test(css), "Footer menu and social columns should share the same row grid");
expect(/\.footer-nav,\s*[\s\S]*?\.footer-socials\s*{[\s\S]*?font-size:\s*clamp\(18px,\s*1\.45vw,\s*23px\)/.test(css), "Footer small links should match the hero role line size");
expect(/\.footer-socials\s+a\s*{[\s\S]*?justify-content:\s*flex-start[\s\S]*?gap:\s*18px[\s\S]*?min-width:\s*150px/.test(css), "Footer right-side links should keep compact text-to-arrow spacing");
expect(/\.footer-socials\s+a::after\s*{[\s\S]*?width:\s*8px[\s\S]*?height:\s*8px[\s\S]*?border-top:\s*2px\s+solid\s+currentColor[\s\S]*?border-right:\s*2px\s+solid\s+currentColor/.test(css), "Footer social links should use the tiny CSS arrow style");
expect(/\.footer-copy\s*{[\s\S]*?align-self:\s*center[\s\S]*?text-align:\s*left/.test(css), "Footer copyright should align with the Playground row");
expect(/@media \(max-width:\s*1080px\)[\s\S]*?\.site-footer\s*{[\s\S]*?width:\s*100%[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+auto/.test(css), "Tablet footer should remain full-width with right-aligned auto columns");
expect(!/@media \(max-width:\s*1080px\)[\s\S]*?\.site-header,\s*[\s\S]*?\.site-footer,\s*[\s\S]*?\.page-shell/.test(css), "Tablet container rule should not shrink the footer");

if (failures.length) {
  console.error("Design regression check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Design regression check passed.");
