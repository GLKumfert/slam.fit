// 5-stop DSE color ramp: Darkest Navy → Medium Teal → Darker Green → Ghastly Green → Neon Green
// Each stop is { at: number (0–1), r, g, b } so we can interpolate between adjacent pairs.
const STOPS: { at: number; r: number; g: number; b: number }[] = [
  { at: 0.00, r: 0x1c, g: 0x2c, b: 0x35 }, // #1c2c35 — Darkest Navy       (0 % free)
  { at: 0.25, r: 0x17, g: 0x70, b: 0x72 }, // #177072 — Medium Teal        (25% free)
  { at: 0.50, r: 0x2c, g: 0x76, b: 0x3b }, // #2c763b — Darker Green       (50% free)
  { at: 0.75, r: 0x75, g: 0x9f, b: 0x3f }, // #759f3f — Ghastly Green      (75% free)
  { at: 1.00, r: 0xb3, g: 0xce, b: 0x3c }, // #b3ce3c — Neon Green         (100% free)
];

/**
 * Converts a single 0–255 channel value to a two-character hex string.
 * e.g. 10 → "0a", 255 → "ff"
 */
function toHex(channel: number): string {
  // Math.round avoids accumulating a fractional drift over many interpolations.
  // toString(16) gives hex; padStart ensures we always get two digits.
  return Math.round(channel).toString(16).padStart(2, "0");
}

/**
 * Returns a hex color string representing how freely available a time slot is.
 * Uses DSE color palette: Darkest Navy (0%) → Neon Green (100%).
 *
 * @param ratio - A number in [0, 1]:
 *   0 means nobody is free (Darkest Navy),
 *   1 means everyone is free (Neon Green).
 */
export function getHeatmapColor(ratio: number): string {
  // Step 1 — Clamp so values outside [0, 1] don't produce nonsense colors.
  const clamped = Math.min(1, Math.max(0, ratio));

  // Step 2 — Find the two adjacent stops that bracket the clamped ratio.
  // We walk the stops array looking for the first stop whose position is >= our ratio.
  // The stop before it is the "lower" anchor and the matching stop is the "upper" anchor.
  let lower = STOPS[0];
  let upper = STOPS[STOPS.length - 1];

  for (let i = 0; i < STOPS.length - 1; i++) {
    if (clamped >= STOPS[i].at && clamped <= STOPS[i + 1].at) {
      lower = STOPS[i];
      upper = STOPS[i + 1];
      break;
    }
  }

  // Step 3 — Compute how far (0–1) the ratio sits between the two stops.
  // This is called the "local t" (or mix factor).
  // Example: ratio=0.375 sits halfway between the 0.25 and 0.50 stops → t=0.5
  const spanWidth = upper.at - lower.at;
  // Guard against a zero-width span (shouldn't happen with our ramp, but be safe).
  const t = spanWidth === 0 ? 0 : (clamped - lower.at) / spanWidth;

  // Step 4 — Linear interpolation (lerp) for each RGB channel independently.
  // lerp(a, b, t) = a + t * (b - a)
  //   when t=0 → result is `a` (the lower stop's color)
  //   when t=1 → result is `b` (the upper stop's color)
  const r = lower.r + t * (upper.r - lower.r);
  const g = lower.g + t * (upper.g - lower.g);
  const b = lower.b + t * (upper.b - lower.b);

  // Step 5 — Assemble the final hex string, e.g. "#9ac5ef"
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
