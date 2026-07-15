import assert from "node:assert/strict";
import test from "node:test";

import { createKittyStateController } from "../js/kitty-state-controller.js";


function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    now: () => now,
    schedule(callback, delay) {
      const id = nextId++;
      timers.set(id, { at: now + delay, callback });
      return id;
    },
    cancel(id) {
      timers.delete(id);
    },
    advance(milliseconds) {
      const target = now + milliseconds;
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, timer]) => timer.at <= target)
          .sort((left, right) => left[1].at - right[1].at)[0];
        if (!due) break;
        const [id, timer] = due;
        timers.delete(id);
        now = timer.at;
        timer.callback();
      }
      now = target;
    },
  };
}


function setup() {
  const clock = fakeClock();
  const changes = [];
  const controller = createKittyStateController({
    now: clock.now,
    schedule: clock.schedule,
    cancel: clock.cancel,
    onChange: (value) => changes.push(value),
  });
  return { clock, changes, controller, current: () => changes.at(-1) };
}


test("priority is drag over click over hover over wave over sad over reading over sleep over idle", () => {
  const { controller, current } = setup();
  assert.equal(current().state, "idle");
  controller.setTaskState("running");
  assert.equal(current().state, "running");
  controller.setTaskState("failed");
  assert.equal(current().state, "failed");
  controller.foreground();
  assert.equal(current().state, "waving");
  controller.pointerEnter();
  assert.equal(current().state, "jumping");
  controller.click();
  assert.equal(current().state, "waiting");
  controller.drag("left");
  assert.equal(current().state, "running-left");
  controller.endDrag();
  assert.equal(current().state, "waiting");
  controller.dispose();
});

test("reading remains selected for the full working interval", () => {
  const { clock, controller, current } = setup();
  controller.setTaskState("running");
  clock.advance(20_000);
  assert.equal(current().state, "running");
  controller.setTaskState("idle");
  assert.equal(current().state, "idle");
  controller.dispose();
});

test("sleep starts after 180000 ms and interaction resets it", () => {
  const { clock, controller, current } = setup();
  clock.advance(179_999);
  assert.equal(current().state, "idle");
  controller.pointerMove();
  clock.advance(179_999);
  assert.equal(current().state, "idle");
  clock.advance(1);
  assert.equal(current().state, "waiting");
  controller.pointerEnter();
  assert.equal(current().state, "jumping");
  controller.pointerLeave();
  assert.equal(current().state, "idle");
  controller.dispose();
});

test("foreground wave uses a 10000 ms cooldown", () => {
  const { clock, controller, current } = setup();
  controller.foreground();
  const firstInstance = current().instance;
  controller.foreground();
  assert.equal(current().instance, firstInstance);
  clock.advance(10_000);
  controller.foreground();
  assert.ok(current().instance > firstInstance);
  controller.dispose();
});

test("click restarts waiting feedback while it is already active", () => {
  const { controller, current } = setup();
  controller.click();
  const firstInstance = current().instance;
  controller.click();
  assert.equal(current().state, "waiting");
  assert.ok(current().instance > firstInstance);
  controller.dispose();
});

test("periodic sad cannot interrupt reading hover click or drag", () => {
  for (const [prepare, expected] of [
    [(controller) => controller.setTaskState("running"), "running"],
    [(controller) => controller.pointerEnter(), "jumping"],
    [(controller) => controller.click(), "waiting"],
    [(controller) => controller.drag("right"), "running-right"],
  ]) {
    const { clock, controller, current } = setup();
    clock.advance(1_499_999);
    prepare(controller);
    clock.advance(1);
    assert.equal(current().state, expected);
    controller.dispose();
  }
});

test("controller exposes no open-main-window action", () => {
  const { controller } = setup();
  assert.equal("openMainWindow" in controller, false);
  controller.dispose();
});
