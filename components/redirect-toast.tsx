"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  getRedirectToastMessage,
  REDIRECT_TOAST_QUERY_PARAM,
} from "@/lib/messages";

export function RedirectToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const lastShownCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const code = searchParams.get(REDIRECT_TOAST_QUERY_PARAM);
    if (!code) {
      return;
    }

    if (lastShownCodeRef.current === code) {
      return;
    }

    const message = getRedirectToastMessage(code);
    if (!message) {
      return;
    }

    // Keep toast one-shot per redirect code to avoid rerender duplicates.
    toast.success(message);
    lastShownCodeRef.current = code;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete(REDIRECT_TOAST_QUERY_PARAM);
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
