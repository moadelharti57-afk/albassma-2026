/**
 * Shared, mutable state between the DOM (GSAP ScrollTrigger, pointer events)
 * and the WebGL scene. Plain object, read inside useFrame, so updating it
 * never triggers a React re-render.
 */
export const heroState = {
  /** 0 at the top of the hero, 1 once it has scrolled out of view */
  scroll: 0,
  /** Pointer position normalised to -1..1 */
  pointerX: 0,
  pointerY: 0,
};
