import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const SignIn = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // New state for error message

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const sessionId = data.sessionId;

        // Store the session identifier in local storage
        localStorage.setItem("sessionId", sessionId);

        console.log("User Sign-In Successful");
        // Redirect the user after successful sign-in
        router.push("/workouts");
      } else {
        const data = await response.json();
        console.error("User Sign-In Error:", data.message);
        // Handle authentication error, show a message, or redirect to an error page
      }
    } catch (error) {
      console.error("User Sign-In Error:", error);
      // Handle unexpected errors
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        className="form-control"
        placeholder="Enter Your Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        className="form-control mt-2"
        placeholder="Enter Your Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        disabled={password === "" || username === ""}
        className="btn btn-primary mt-2"
        type="submit"
      >
        Sign In
      </button>
      <Link className="mt-2 ms-2" href="/signup">
        Sign Up
      </Link>

      {error && <div className="text-danger mt-2">{error}</div>}
    </form>
  );
};

export default SignIn;
