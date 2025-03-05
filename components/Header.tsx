import { Button } from "react-bootstrap";
import UserProfile from "./UserProfile";
import { FaSignOutAlt } from "react-icons/fa";
import { signOut } from "next-auth/react";

const Header = ({ user, setUser }) => {
  const handleSignOut = async () => {
    try {
      setUser({ ...user, darkMode: false });
      await signOut({ redirect: true, callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const { darkMode } = user;
  return (
    <div className="d-flex justify-content-between">
      <UserProfile user={user} setUser={setUser} />
      <Button
        variant={darkMode ? "bg-custom-dark text-white" : "white"}
        onClick={handleSignOut}
      >
        <FaSignOutAlt />
      </Button>
    </div>
  );
};

export default Header;
