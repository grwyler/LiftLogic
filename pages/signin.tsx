import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { Button } from "react-bootstrap";
import { FaSave, FaSignInAlt, FaSpinner, FaTrash } from "react-icons/fa";
import user from "./api/user";
import UserTable from "../components/UserTable";

const SignIn = () => {
  const [users, setUsers] = useState([]);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoadingUsers, setIsloadingUsers] = useState(true);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const submitButtonRef = useRef();
  const [error, setError] = useState("");

  const { data: session } = useSession();

  const router = useRouter();
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/user");
      const data = await response.json();
      setUsers(data.users);
      setIsloadingUsers(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError(error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (theUsername?, thePassword?) => {
    setIsSigningIn(true);
    // Sign in using NextAuth
    const myUsername = theUsername ? theUsername : username;
    const myPassword = thePassword ? thePassword : password;
    const result = await signIn("credentials", {
      username: myUsername,
      password: myPassword,
      redirect: false,
    });

    if (result.error) {
      console.error("Sign-In Error:", result.error);
      setError("👀👀 we don't know you");
      // setHasFailedLogin(true);
      setIsSigningIn(false);
    } else {
      console.log("User Sign-In Successful");

      router.push("/routines");
    }
  };
  return (
    <React.Fragment>
      <form>
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
          ref={submitButtonRef}
          disabled={password === "" || username === "" || isSigningIn}
          variant="primary"
          className={`my-3 ${isSigningIn ? "spinning" : ""}`}
          size="sm"
          onClick={() => handleSubmit()}
        >
          {isSigningIn ? (
            <>
              Signing in <FaSpinner />
            </>
          ) : (
            <>
              Sign in <FaSignInAlt />
            </>
          )}
        </Button>
        <Link className="my-3 ms-3 small" href="/signup">
          Sign up
        </Link>

        {error && <div className="text-danger mt-2">{error}</div>}
      </form>
      {process.env.NEXT_PUBLIC_ENV === "local" && (
        <div className="mt-3 ">
          <h5>Users</h5>
          {isLoadingUsers && (
            <div className="spinning">
              Loading users <FaSpinner />
            </div>
          )}
          {!isLoadingUsers && users && users.length === 0 && (
            <div className="text-muted">No Users</div>
          )}
          {users.map((user) => (
            <UserTable
              user={user}
              setUsername={setUsername}
              setPassword={setPassword}
              handleSubmit={handleSubmit}
              fetchUsers={fetchUsers}
              setError={setError}
            />
          ))}
        </div>
      )}
    </React.Fragment>
  );
};

export default SignIn;
