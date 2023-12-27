import React, { useState, useEffect } from "react";
import SignIn from "./signin";
import { FaTrash } from "react-icons/fa";
import { useRouter } from "next/router";

const HomePage: React.FC = () => {
  const [users, setUsers] = useState([]);
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/getUsers"); // Replace with your API route
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    // Fetch users data from your API endpoint
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    try {
      console.log("Deleting user with ID:", userId);

      const response = await fetch(`/api/deleteUser?id=${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        console.log("User deleted successfully");
      } else {
        console.error("Failed to delete user. Server response:", response);
      }

      // Fetch updated user list after deletion
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  useEffect(() => {
    // Check if the session identifier is present in local storage
    const sessionId = localStorage.getItem("sessionId");

    if (sessionId) {
      // Redirect to the workouts page if the session identifier is present
      router.push("/workouts");
    }
  }, []);

  return (
    <div className="container-fluid">
      <h1>Home</h1>
      <SignIn />
      <div>
        <h2>Users</h2>
        {users.length === 0 && <div className="text-muted">No Users</div>}
        {users.map((user) => (
          <div className="row align-items-center bg-light" key={user._id}>
            <div className="col-10">{user.username}</div>
            <div className="col-2">
              <button
                className="btn btn-light btn-sm"
                onClick={() => handleDeleteUser(user._id)}
              >
                <FaTrash className="text-danger" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
