import { useState } from "react";

const ONBOARDING_KEY = "mc-onboarded";

function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

// ─── Step definitions ──────────────────────────────────────────────────────

interface Step {
  icon: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: "directions_car",
    title: "Welcome to OpenRoad",
    body: "Automatically track every business, medical, or charity drive for your IRS tax deduction — all stored privately on your device.",
  },
  {
    icon: "location_on",
    title: "Set Up a Home Zone",
    body: "A Zone is a location (like your home or office) that acts as a geofence. OpenRoad starts a trip when you leave a zone and ends it when you return.",
  },
  {
    icon: "gps_fixed",
    title: "Enable GPS",
    body: "On the Dashboard, tap Enable GPS to start location tracking. On iOS, keep this page open in Safari for continuous tracking — background location is limited.",
  },
  {
    icon: "check_circle",
    title: "You're All Set",
    body: "Trips are logged automatically. You can also start one manually by tapping a purpose button on the Dashboard. Head to Reports any time to export your mileage log.",
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

interface OnboardingModalProps {
  onDone: () => void;
}

export function OnboardingModal({ onDone }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleNext = () => {
    if (isLast) {
      markOnboardingComplete();
      onDone();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1));
  };

  const handleSkip = () => {
    markOnboardingComplete();
    onDone();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "var(--md-surface-container-low)",
          borderRadius: "28px 28px 0 0",
          padding: "32px 28px calc(40px + env(safe-area-inset-bottom, 0px))",
          width: "100%",
          maxWidth: "560px",
          boxSizing: "border-box",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: "32px",
            height: "4px",
            borderRadius: "2px",
            background: "var(--md-outline-variant)",
            margin: "0 auto 28px",
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "var(--md-primary-container)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <span
            className="ms icon-32"
            aria-hidden="true"
            style={{ color: "var(--md-on-primary-container)" }}
          >
            {current.icon}
          </span>
        </div>

        {/* Text */}
        <h2
          style={{
            fontSize: "1.375rem",
            fontWeight: 700,
            color: "var(--md-on-surface)",
            textAlign: "center",
            margin: "0 0 12px",
            lineHeight: 1.25,
          }}
        >
          {current.title}
        </h2>
        <p
          style={{
            fontSize: "0.9375rem",
            color: "var(--md-on-surface-variant)",
            textAlign: "center",
            lineHeight: 1.6,
            margin: "0 0 32px",
          }}
        >
          {current.body}
        </p>

        {/* Step dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "28px",
          }}
        >
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? "24px" : "8px",
                height: "8px",
                borderRadius: "4px",
                background:
                  i === step
                    ? "var(--md-primary)"
                    : "var(--md-outline-variant)",
                transition: "width 0.25s, background-color 0.25s",
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="md-btn-outlined"
              style={{ flex: 1 }}
            >
              Back
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="md-btn-text"
              style={{ flex: 1 }}
            >
              Skip
            </button>
          )}
          <button
            onClick={handleNext}
            className="md-btn-filled"
            style={{ flex: 2 }}
          >
            {isLast ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
