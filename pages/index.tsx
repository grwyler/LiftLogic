import React, { useState, useEffect } from "react";
import SignIn from "./signin";
import { FaSign, FaSignInAlt, FaTrash } from "react-icons/fa";
import { useRouter } from "next/router";
import { Button } from "react-bootstrap";

const HomePage: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // Check if the session identifier is present in local storage
    const sessionId = localStorage.getItem("sessionId");

    if (sessionId) {
      // Redirect to the routines page if the session identifier is present
      router.push("/routines");
    }
  }, []);

  return (
    <div
      className="container border p-2 rounded vh-100"
      style={{ maxWidth: 600 }}
    >
      <h3 className="m-3">Home</h3>
      <SignIn />
    </div>
  );
};

export default HomePage;
