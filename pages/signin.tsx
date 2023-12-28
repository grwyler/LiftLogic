import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";

const SignIn = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // New state for error message

  const { data: session } = useSession();

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Sign in using NextAuth
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result.error) {
      console.error("Sign-In Error:", result.error);
    } else {
      console.log("User Sign-In Successful");

      router.push("/routines");
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
