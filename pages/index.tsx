import React, { useEffect } from "react";
import SignIn from "./signin";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

const HomePage: React.FC = () => {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/routines");
    }
  }, [router, status]);

  return <SignIn />;
};

export default HomePage;
