import { useEffect } from "react";

const useWakeLock = () => {
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        wakeLock = await (navigator as any).wakeLock.request("screen");
        console.log("Wake Lock active!");
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock !== null) {
        wakeLock.release();
        console.log("Wake Lock released!");
      }
    };
  }, []);
};

export default useWakeLock;
