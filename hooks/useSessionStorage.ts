import { useEffect } from "react";
import { signIn } from "next-auth/react";

const useSessionStorage = (session: any) => {
  useEffect(() => {
    if (!session) return; // Only update storage when session changes

    localStorage.setItem("session", JSON.stringify(session));
  }, [session]);
};

export default useSessionStorage;
