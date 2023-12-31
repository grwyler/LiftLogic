// pages/signup.tsx
import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "react-bootstrap";

const SignUp: React.FC = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        console.log("User registered successfully!");
        router.push("/");
      } else {
        console.error("Error during registration:", response.statusText);
      }
    } catch (error) {
      console.error("Error during registration:", error);
    }
  };

  return (
    <form className="container" onSubmit={handleSubmit}>
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
        className="btn btn-primary mt-2"
        type="submit"
      >
        Sign up
      </Button>
      <Link className="small ms-2" href="/">
        Sign in
      </Link>
    </form>
  );
};

export default SignUp;
