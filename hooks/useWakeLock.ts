import { useEffect } from "react";

const useWakeLock = () => {
  useEffect(() => {
    let wakeLock: any = null;
    let isDisposed = false;

    const releaseWakeLock = async () => {
      if (!wakeLock) {
        return;
      }

      try {
        await wakeLock.release();
      } catch {
        // Ignore release failures from browsers that auto-release on visibility changes.
      } finally {
        wakeLock = null;
      }
    };

    const requestWakeLock = async () => {
      if (
        isDisposed ||
        typeof document === "undefined" ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      try {
        if ((navigator as any)?.wakeLock) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch (error: any) {
        if (error?.name === "NotAllowedError") {
          return;
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
        return;
      }

      void releaseWakeLock();
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isDisposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void releaseWakeLock();
    };
  }, []);
};

export default useWakeLock;
