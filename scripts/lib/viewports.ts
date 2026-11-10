/** Viewport widths used for every fidelity capture (height is fixed so `vh`-based layouts are stable). */
export const VIEWPORTS = [1920, 1440, 1024, 768, 390] as const;
export const VIEWPORT_HEIGHT = 900;
export type ViewportWidth = (typeof VIEWPORTS)[number];
