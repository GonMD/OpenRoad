import { useRef, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/** Ordered list of tab routes for swipe navigation */
const TAB_ROUTES = ["/", "/trips", "/plan", "/zones", "/reports", "/settings"];

/** Minimum horizontal distance (px) to trigger a swipe */
const SWIPE_THRESHOLD = 50;

/** Maximum vertical distance (px) allowed during a horizontal swipe */
const VERTICAL_TOLERANCE = 100;

/** Maximum swipe duration (ms) to count as a quick swipe */
const SWIPE_MAX_DURATION = 500;

/** Minimum swipe velocity (px/ms) - allows slower but longer swipes */
const MIN_VELOCITY = 0.15;

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
}

/**
 * Hook that enables swipe left/right gestures to navigate between tabs.
 * Returns a ref to attach to the swipeable container element.
 */
export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStateRef = useRef<TouchState | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const getCurrentTabIndex = useCallback(() => {
    const path = location.pathname;
    const index = TAB_ROUTES.indexOf(path);
    return index >= 0 ? index : 0;
  }, [location.pathname]);

  const navigateToTab = useCallback(
    (direction: "left" | "right") => {
      const currentIndex = getCurrentTabIndex();
      let newIndex: number;

      if (direction === "left") {
        // Swipe left → go to next tab (right in the tab bar)
        newIndex = currentIndex + 1;
        if (newIndex >= TAB_ROUTES.length) return; // Already at last tab
      } else {
        // Swipe right → go to previous tab (left in the tab bar)
        newIndex = currentIndex - 1;
        if (newIndex < 0) return; // Already at first tab
      }

      const targetRoute = TAB_ROUTES[newIndex] as string | undefined;
      if (targetRoute !== undefined) {
        void navigate(targetRoute);
      }
    },
    [getCurrentTabIndex, navigate],
  );

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0] as Touch | undefined;
    if (touch === undefined) return;

    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const touchState = touchStateRef.current;
      if (!touchState) return;

      const touch = e.changedTouches[0] as Touch | undefined;
      if (touch === undefined) return;

      const deltaX = touch.clientX - touchState.startX;
      const deltaY = touch.clientY - touchState.startY;
      const duration = Date.now() - touchState.startTime;

      // Reset state
      touchStateRef.current = null;

      // Calculate velocity (px/ms)
      const velocity = duration > 0 ? Math.abs(deltaX) / duration : 0;

      // Check if this qualifies as a horizontal swipe
      // Either: fast swipe within time limit, OR slower swipe with sufficient velocity
      const isHorizontalEnough = Math.abs(deltaY) < VERTICAL_TOLERANCE;
      const isFastSwipe =
        Math.abs(deltaX) > SWIPE_THRESHOLD && duration < SWIPE_MAX_DURATION;
      const isVelocitySwipe =
        Math.abs(deltaX) > SWIPE_THRESHOLD && velocity > MIN_VELOCITY;

      const isHorizontalSwipe =
        isHorizontalEnough && (isFastSwipe || isVelocitySwipe);

      if (!isHorizontalSwipe) return;

      if (deltaX < 0) {
        // Swiped left
        navigateToTab("left");
      } else {
        // Swiped right
        navigateToTab("right");
      }
    },
    [navigateToTab],
  );

  // Attach event listeners to the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return containerRef;
}
