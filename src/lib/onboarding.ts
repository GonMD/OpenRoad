const ONBOARDING_KEY = "mc-onboarded";

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}
