/**
 * Haptic feedback via the Vibration API.
 * Silently no-ops on browsers/devices that don't support it.
 */

interface NavigatorWithVibrate {
  vibrate?: (pattern: VibratePattern) => boolean;
}

/** Short pulse — trip started */
export function hapticStart(): void {
  (navigator as NavigatorWithVibrate).vibrate?.([60]);
}

/** Double pulse — trip ended */
export function hapticEnd(): void {
  (navigator as NavigatorWithVibrate).vibrate?.([40, 60, 40]);
}

/** Single short buzz — trip discarded */
export function hapticDiscard(): void {
  (navigator as NavigatorWithVibrate).vibrate?.([20]);
}
