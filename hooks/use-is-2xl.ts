import * as React from "react";

// Tailwind `2xl` breakpoint — keep in sync with responsive layouts using 2xl:hidden / hidden 2xl:grid.
const XXL_BREAKPOINT = 1536;

export function useIs2xl() {
  const [is2xl, setIs2xl] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${XXL_BREAKPOINT}px)`);
    const onChange = () => {
      setIs2xl(window.innerWidth >= XXL_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIs2xl(window.innerWidth >= XXL_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!is2xl;
}
