
import * as React from "react"

const MOBILE_BREAKPOINT = 768 // Standard md breakpoint

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check
    if (typeof window !== 'undefined') {
      checkDevice();
    }
    
    // Listener for window resize
    window.addEventListener("resize", checkDevice);

    // Cleanup listener
    return () => window.removeEventListener("resize", checkDevice);
  }, []); // Empty array ensures this effect runs only once on mount and cleanup on unmount

  return isMobile === undefined ? false : isMobile; // Default to false during SSR or before first check
}
