"use client";

import { useEffect } from "react";
import { type TopbarConfig, useTopbar } from "@/components/topbar/topbar-context";

type TopbarConfigControllerProps = {
  config: TopbarConfig;
};

export function TopbarConfigController({ config }: TopbarConfigControllerProps) {
  const { setConfig, clearConfig } = useTopbar();

  useEffect(() => {
    // Apply page-level topbar actions while this page is mounted.
    setConfig(config);
    return () => clearConfig();
  }, [clearConfig, config, setConfig]);

  return null;
}
