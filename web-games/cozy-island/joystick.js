const root = document.querySelector('#joystick');
const knob = document.querySelector('#joystickKnob');

if (root && knob) {
  const active = new Set();
  const keyMap = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  let pointerId = null;

  const emit = (dir, down) => {
    const code = keyMap[dir];
    if (!code) return;
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  };

  const setDirs = (next) => {
    for (const dir of active) if (!next.has(dir)) emit(dir, false);
    for (const dir of next) if (!active.has(dir)) emit(dir, true);
    active.clear();
    for (const dir of next) active.add(dir);
  };

  const reset = () => {
    setDirs(new Set());
    knob.style.transform = 'translate(-50%, -50%)';
    pointerId = null;
  };

  const move = (event) => {
    if (pointerId !== event.pointerId) return;
    event.preventDefault();
    const rect = root.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const max = rect.width * 0.29;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    const dead = rect.width * 0.11;
    const next = new Set();
    if (Math.abs(dx) > dead) next.add(dx > 0 ? 'right' : 'left');
    if (Math.abs(dy) > dead) next.add(dy > 0 ? 'down' : 'up');
    setDirs(next);
  };

  root.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    pointerId = event.pointerId;
    root.setPointerCapture?.(event.pointerId);
    move(event);
  }, { passive: false });
  root.addEventListener('pointermove', move, { passive: false });
  root.addEventListener('pointerup', reset);
  root.addEventListener('pointercancel', reset);
  window.addEventListener('blur', reset);
}
