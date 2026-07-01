import * as React from "react";

// Tailwind `md` breakpoint — keep in sync with responsive layouts using md:hidden / hidden md:grid.
const MD_BREAKPOINT = 768;

export function useIsMd() {
  const [isMd, setIsMd] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${MD_BREAKPOINT}px)`);
    const onChange = () => {
      setIsMd(window.innerWidth >= MD_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMd(window.innerWidth >= MD_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMd;
}
