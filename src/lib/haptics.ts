/** Short haptic taps on supporting devices. Silently absent everywhere else. */
type Pattern = "tap" | "good" | "bad";

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 8,
  good: [12, 40, 22],
  bad: [30, 45, 30],
};

export function buzz(pattern: Pattern): void {
  try {
    navigator.vibrate?.(PATTERNS[pattern]);
  } catch {
    /* unsupported — non-fatal */
  }
}
