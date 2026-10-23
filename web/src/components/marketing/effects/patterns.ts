/**
 * SVG tiles for the home page's brick backgrounds, as CSS `background-image`
 * values: no ids, no DOM, cheap to repeat over a whole section.
 *
 * Colours mirror the `--mk-*` tokens in styles/tokens.css. A data URI cannot
 * read a CSS variable, so they are spelled out here, in one place.
 */

export const mk = {
  bg: '#F8FAF9',
  primary: '#2D6A43',
  primaryDeep: '#1F4D31',
  brick: '#C8553D',
  amber: '#F5B544',
  white: '#FFFFFF',
} as const;

export const BRICK_W = 64;
export const BRICK_H = 16;

const uri = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** Running bond: each course is offset by half a brick from the one above. */
const BOND = `M0 .5H${BRICK_W}M0 ${BRICK_H + 0.5}H${BRICK_W}M.5 0V${BRICK_H}M${BRICK_W / 2 + 0.5} 0V${BRICK_H}M${BRICK_W / 4 + 0.5} ${BRICK_H}V${BRICK_H * 2}M${(BRICK_W * 3) / 4 + 0.5} ${BRICK_H}V${BRICK_H * 2}`;

export function wallTile(stroke: string, opacity: number): string {
  return uri(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${BRICK_W}' height='${BRICK_H * 2}'><path d='${BOND}' fill='none' stroke='${stroke}' stroke-opacity='${opacity}'/></svg>`,
  );
}

/** A fine drafting grid; every fourth line a little stronger. */
export function gridTile(stroke: string, opacity: number): string {
  return uri(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><g fill='none' stroke='${stroke}'><path d='M16 0V64M32 0V64M48 0V64M0 16H64M0 32H64M0 48H64' stroke-opacity='${opacity}'/><path d='M.5 0V64M0 .5H64' stroke-opacity='${opacity * 2}'/></g></svg>`,
  );
}

/** Film grain. Used at 2–3% so large flat areas do not look plastic. */
export const grainTile = uri(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
);

export type Intensity = 'subtle' | 'medium' | 'bold';

export const strokeOpacity: Record<Intensity, number> = { subtle: 0.045, medium: 0.065, bold: 0.085 };

/** Soft edges so one section's pattern melts into the next instead of ending in a line. */
export const edgeFade =
  'linear-gradient(to bottom, transparent 0, #000 14%, #000 86%, transparent 100%), radial-gradient(ellipse 85% 90% at 50% 50%, #000 55%, transparent 100%)';
