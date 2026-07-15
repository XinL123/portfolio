import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(process.argv[2], "utf8");
const start = source.indexOf("var KITTY_INACTIVITY_MS");
const end = source.indexOf("function _(", start);
assert.ok(start >= 0 && end > start);

const timers = new Map();
let timerId = 0;
let stateIndex = 0;
const setterCalls = [];
const windowStub = {
  addEventListener() {},
  removeEventListener() {},
  clearTimeout(id) { timers.delete(id); },
  setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; },
};
const b = {
  useEffect(effect) { effect(); },
  useRef(value) { return { current: value ?? { style: {} } }; },
  useState(value) {
    const index = stateIndex++;
    return [value, next => setterCalls.push([index, next])];
  },
};
const x = {
  jsx(type, props) { return { type, props }; },
  jsxs(type, props) { return { type, props }; },
};
const h = () => ({ builtin: true });
const f = (...values) => values.filter(Boolean).join(" ");
const wrapped = "(function(b,x,h,f,window){" + source.slice(start, end) + ";return g})";
const factory = new vm.Script(wrapped, { filename: "mascot-smoke-eval.js" }).runInThisContext();
const mascot = factory(b, x, h, f, windowStub);
const rendered = mascot({ spritesheetUrl: "file:///kitty.webp", state: "idle" });

assert.equal(rendered.type, "div");
assert.equal(rendered.props.children[0].type, "div");
assert.equal(rendered.props.children[0].props.style.backgroundImage, "url(file:///kitty.webp)");
rendered.props.onPointerMove({ buttons: 0, clientX: 10, clientY: 10, pointerId: 1 });
assert.ok(setterCalls.some(([index, value]) => index === 0 && value === true));

setterCalls.length = 0;
rendered.props.onPointerDown({ clientX: 10, clientY: 10, pointerId: 2 });
rendered.props.onPointerMove({ buttons: 1, clientX: 12, clientY: 10, pointerId: 2 });
rendered.props.onPointerUp({ clientX: 12, clientY: 10, pointerId: 2 });
assert.ok(setterCalls.some(([index, value]) => index === 1 && value === true));

setterCalls.length = 0;
rendered.props.onPointerDown({ clientX: 10, clientY: 10, pointerId: 3 });
rendered.props.onPointerMove({ buttons: 1, clientX: 18, clientY: 10, pointerId: 3 });
rendered.props.onPointerUp({ clientX: 18, clientY: 10, pointerId: 3 });
assert.ok(!setterCalls.some(([index, value]) => index === 1 && value === true));
console.log("mascot-runtime-smoke-ok");
