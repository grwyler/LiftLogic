import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { Button } from "react-bootstrap";

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
        className="form-control form-control-sm"
        placeholder="Enter your username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        className="form-control form-control-sm mt-2"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button
        disabled={password === "" || username === ""}
        className="btn btn-primary mt-2"
        size="sm"
        type="submit"
      >
        Sign in
      </Button>
      <Link className="mt-2 ms-2 small" href="/signup">
        Sign up
      </Link>

      {error && <div className="text-danger mt-2">{error}</div>}
    </form>
  );
};

export default SignIn;
