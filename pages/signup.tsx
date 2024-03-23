// pages/signup.tsx
import React, { Fragment, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "react-bootstrap";
import { FaSignInAlt, FaSpinner } from "react-icons/fa";
import { signIn } from "next-auth/react";

const SignUp: React.FC = () => {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSigningIn(true);
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      if (response.ok && result) {
        console.log("User registered successfully!");

        router.push("/routines");
      } else {
        setIsSigningIn(false);
        console.error("Error during registration:", response.statusText);
      }
    } catch (error) {
      setIsSigningIn(false);
      console.error("Error during registration:", error);
    }
  };

  return (
    <form
      className="container border p-2 rounded vh-100"
      style={{ maxWidth: 600 }}
      onSubmit={handleSubmit}
    >
      <input
        type="text"
        id="username"
        className="form-control form-control-sm mt-2"
        placeholder="Enter a username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        id="password"
        className="form-control form-control-sm mt-2"
        placeholder="Enter a password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Button
        size="sm"
        disabled={username === "" || password === ""}
        className="btn btn-primary mt-2 "
        type="submit"
      >
        {isSigningIn ? (
          <div className="spinning">
            Signing in <FaSpinner />
          </div>
        ) : (
          <Fragment>
            Sign up <FaSignInAlt />
          </Fragment>
        )}
      </Button>
      <Link className="small ms-2" href="/">
        Sign in
      </Link>
    </form>
  );
};

export default SignUp;
