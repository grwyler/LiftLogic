import { Button } from "react-bootstrap";
import { FaSignOutAlt } from "react-icons/fa";
import { signOut } from "next-auth/react";
import { useRouter } from "next/router";

const Header = ({ user, setUser }) => {
  const router = useRouter();
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
      <Button
        className={`user-profile-button ${
          darkMode ? "dark-mode" : "light-mode"
        }`}
        onClick={() => {
          router.push("/user");
        }}
      >
        {user.username}
      </Button>
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
