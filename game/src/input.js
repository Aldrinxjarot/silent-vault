// Keyboard input: held movement keys become a direction vector, Shift runs
// (faster, but much easier to spot), P or Escape pauses, R restarts, and
// Enter or Space confirms on the menu screens. The game reads the plain
// object this returns; the screenshot scenes feed the same shape by hand.

export function createInput() {
  const held = new Set();
  const pressed = new Set();
  const TRACKED = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'shift', 'p', 'r', 'enter', ' ', 'escape'];

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (!TRACKED.includes(key)) return;
    if (key.startsWith('arrow') || key === ' ') event.preventDefault();
    if (!held.has(key)) pressed.add(key);
    held.add(key);
  });
  window.addEventListener('keyup', (event) => held.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => held.clear());

  return {
    /** Current movement intent: x and y in -1..1 (not normalised), run flag. */
    vector() {
      const x = (held.has('arrowright') || held.has('d') ? 1 : 0) - (held.has('arrowleft') || held.has('a') ? 1 : 0);
      const y = (held.has('arrowdown') || held.has('s') ? 1 : 0) - (held.has('arrowup') || held.has('w') ? 1 : 0);
      return { x, y, run: held.has('shift') };
    },
    /** True once per physical press of the named action: 'pause' | 'restart' | 'confirm'. */
    tapped(action) {
      const keys = action === 'pause' ? ['p', 'escape'] : action === 'restart' ? ['r'] : ['enter', ' '];
      return keys.some((key) => pressed.has(key));
    },
    /** Call at the end of each frame so a press is only seen once. */
    endFrame() {
      pressed.clear();
    },
  };
}
