const INACTIVITY_MS = 180_000;
const FOREGROUND_COOLDOWN_MS = 10_000;
const PERIODIC_SAD_MS = 1_500_000;
const HAPPY_MS = 1_200;
const WAVE_MS = 1_400;
const PERIODIC_SAD_REACTION_MS = 3_660;


export function createKittyStateController({ now, schedule, cancel, onChange }) {
  let taskState = "idle";
  let hover = false;
  let dragDirection = null;
  let happy = false;
  let waving = false;
  let sleeping = false;
  let periodicSad = false;
  let instance = 0;
  let current = null;
  let lastForegroundAt = -Infinity;
  let inactivityTimer = null;
  let periodicTimer = null;
  let happyTimer = null;
  let waveTimer = null;
  let periodicSadTimer = null;
  let disposed = false;

  function clearTimer(timer) {
    if (timer !== null) cancel(timer);
  }

  function selectedState() {
    if (dragDirection) return `running-${dragDirection}`;
    if (happy) return "waiting";
    if (hover) return "jumping";
    if (waving) return "waving";
    if (taskState === "failed") return "failed";
    if (taskState === "running") return "running";
    if (periodicSad) return "failed";
    if (sleeping) return "waiting";
    return "idle";
  }

  function emit(forceInstance = false) {
    if (disposed) return;
    if (forceInstance) instance += 1;
    const next = { state: selectedState(), instance };
    if (!current || next.state !== current.state || next.instance !== current.instance) {
      current = next;
      onChange(next);
    }
  }

  function armInactivity() {
    clearTimer(inactivityTimer);
    inactivityTimer = null;
    sleeping = false;
    if (taskState !== "idle") return;
    inactivityTimer = schedule(() => {
      inactivityTimer = null;
      sleeping = true;
      emit();
    }, INACTIVITY_MS);
  }

  function interacted() {
    armInactivity();
  }

  function armPeriodicSad() {
    clearTimer(periodicTimer);
    periodicTimer = schedule(() => {
      periodicTimer = null;
      const eligible = taskState === "idle" && !hover && !happy && !dragDirection && !waving;
      if (eligible) {
        periodicSad = true;
        emit(true);
        clearTimer(periodicSadTimer);
        periodicSadTimer = schedule(() => {
          periodicSadTimer = null;
          periodicSad = false;
          emit();
        }, PERIODIC_SAD_REACTION_MS);
      }
      armPeriodicSad();
    }, PERIODIC_SAD_MS);
  }

  const controller = {
    setTaskState(nextTaskState) {
      if (!new Set(["idle", "running", "failed"]).has(nextTaskState)) {
        throw new TypeError(`unsupported task state: ${nextTaskState}`);
      }
      taskState = nextTaskState;
      periodicSad = false;
      clearTimer(periodicSadTimer);
      periodicSadTimer = null;
      armInactivity();
      emit();
    },
    pointerEnter() {
      hover = true;
      interacted();
      emit();
    },
    pointerMove() {
      interacted();
      emit();
    },
    pointerLeave() {
      hover = false;
      emit();
    },
    click() {
      interacted();
      happy = true;
      clearTimer(happyTimer);
      happyTimer = schedule(() => {
        happyTimer = null;
        happy = false;
        emit();
      }, HAPPY_MS);
      emit(true);
    },
    drag(direction) {
      if (direction !== "left" && direction !== "right") {
        throw new TypeError(`unsupported drag direction: ${direction}`);
      }
      interacted();
      dragDirection = direction;
      emit();
    },
    endDrag() {
      dragDirection = null;
      emit();
    },
    foreground() {
      const timestamp = now();
      if (timestamp - lastForegroundAt < FOREGROUND_COOLDOWN_MS) return;
      lastForegroundAt = timestamp;
      waving = true;
      clearTimer(waveTimer);
      waveTimer = schedule(() => {
        waveTimer = null;
        waving = false;
        emit();
      }, WAVE_MS);
      emit(true);
    },
    dispose() {
      disposed = true;
      for (const timer of [
        inactivityTimer,
        periodicTimer,
        happyTimer,
        waveTimer,
        periodicSadTimer,
      ]) {
        clearTimer(timer);
      }
    },
  };

  armInactivity();
  armPeriodicSad();
  emit();
  return controller;
}
