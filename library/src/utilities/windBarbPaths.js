/**
 * Utility for generating wind barb SVG element descriptors.
 *
 * Canonical orientation: the data point is at the origin (0, 0). The staff
 * extends upward (toward negative y). Barb flags attach near the top of the
 * staff and extend to the right (positive x) of the staff.
 *
 * To render a barb at a given meteorological direction (degrees the wind comes
 * FROM, clockwise from north), rotate the group by that direction value using
 * an SVG `rotate()` transform. SVG rotation is clockwise-positive, which
 * matches meteorological degrees, so `rotate(direction)` is correct with no
 * additional conversion.
 *
 * Speed buckets are unit-agnostic: every 5 units of speed adds one flag
 * feature. The caller is responsible for providing values in a consistent unit.
 */

const CALM_THRESHOLD = 2.5;
const BUCKET_SIZE = 5;

function speedToBucket(speed) {
  const numeric = Number(speed);
  if (!Number.isFinite(numeric) || numeric < CALM_THRESHOLD) return 0;
  return Math.floor((numeric + CALM_THRESHOLD) / BUCKET_SIZE);
}

/**
 * Build an array of SVG element descriptors for a wind barb.
 *
 * @param {number} speed  - numeric speed value (unit-agnostic, 5-unit buckets)
 * @param {number} size   - pixel length of the staff
 * @returns {Array<object>} element descriptors suitable for rendering in React SVG
 */
export function buildWindBarbElements(speed, size) {
  const L = Math.max(4, Number(size) || 20);
  const bucket = speedToBucket(speed);

  // Calm: circle with short staff to show direction
  if (bucket === 0) {
    const r = Math.max(2, L * 0.15);
    const calmStaffLen = L * 0.6; // shorter staff for calm winds
    return [
      { type: 'circle', cx: 0, cy: 0, r: r },
      { type: 'staff', x1: 0, y1: -r, x2: 0, y2: -(r + calmStaffLen) },
    ];
  }

  const barbLen = L * 0.4;
  const halfBarbLen = L * 0.2;
  const barbSpacing = L * 0.15; // spacing between flags along the staff

  const pennants = Math.floor(bucket / 10);
  const remaining = bucket % 10;
  const fullBarbs = Math.floor(remaining / 2);
  const halfBarb = remaining % 2;

  const elements = [];

  // Staff: tip at origin, tail at top
  elements.push({ type: 'staff', x1: 0, y1: 0, x2: 0, y2: -L });

  // Track current y-position, starting at the tail (top of staff)
  let y = -L;

  // Pennants (filled triangles, each occupies one barbSpacing)
  for (let i = 0; i < pennants; i++) {
    const yTop = y;
    const yMid = y + barbSpacing * 0.5;
    const yBottom = y + barbSpacing;
    elements.push({
      type: 'pennant',
      // Tip at staff top, swept-back triangle pointing right
      points: [
        [0, yTop],
        [barbLen, yMid],
        [0, yBottom],
      ],
    });
    y = yBottom;
  }

  // Extra gap after pennant block so barbs don't crowd it
  if (pennants > 0 && (fullBarbs > 0 || halfBarb > 0)) {
    y += barbSpacing * 0.4;
  }

  // Full barbs
  for (let i = 0; i < fullBarbs; i++) {
    elements.push({
      type: 'barb',
      x1: 0,
      y1: y,
      x2: barbLen,
      y2: y,
    });
    y += barbSpacing;
  }

  // Half barb (shorter line, typically placed last)
  if (halfBarb) {
    // Add a small extra gap when following full barbs so it reads distinctly
    if (fullBarbs > 0) {
      y += barbSpacing * 0.15;
    }
    elements.push({
      type: 'barb',
      x1: 0,
      y1: y,
      x2: halfBarbLen,
      y2: y,
    });
  }

  return elements;
}
