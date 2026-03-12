import React, { useEffect } from "react";
import SignIn from "./signin";
import { useRouter } from "next/router";

const HomePage: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    const storedSession = localStorage.getItem("session");
    const sessionId = localStorage.getItem("sessionId");

    if (storedSession || sessionId) {
      router.push("/routines");
    }
  }, [router]);

  return <SignIn />;
};

export default HomePage;
