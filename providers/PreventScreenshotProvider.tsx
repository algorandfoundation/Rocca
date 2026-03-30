import * as ScreenCapture from "expo-screen-capture";
import React, { useEffect } from "react";

// Not really a provider, but this is where we can do the safety reset on unmount
export function PreventScreenshotProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    return () => {
      // Safety reset when app unmounts
      ScreenCapture.allowScreenCaptureAsync().catch((err) => {
        console.debug(
          "PreventScreenshotProvider: Failed to allow screen capture: ",
          err,
        );
      });
    };
  }, []);

  return <>{children}</>;
}
