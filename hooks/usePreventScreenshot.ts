import { screenshotManager } from "@/lib/screenshotManager";
import { useEffect } from "react";

export function usePreventScreenshot(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    screenshotManager.enable();

    return () => {
      screenshotManager.disable();
    };
  }, [enabled]);
}
