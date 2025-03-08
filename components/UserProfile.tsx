import React, { useState } from "react";
import { Button, Form, FormGroup, FormCheck } from "react-bootstrap";
import { saveUser } from "../utils/helpers";

function UserProfile({ user, setUser }) {
  const { darkMode, username } = user;
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkModeOn, setIsdarkModeOn] = useState(darkMode);

  const toggleSettings = () => {
    // if (showSettings) {
    //   setIsdarkModeOn(darkMode);
    // }
    setShowSettings(!showSettings);
  };

  const toggleDarkMode = () => {
    setIsdarkModeOn(!isDarkModeOn);
  };

  const handleSubmit = (e) => {
    const newUser = { ...user, darkMode: isDarkModeOn };
    e.preventDefault();
    setShowSettings(false);
    setUser(newUser);
    saveUser(newUser);
  };

  return (
    <div className="user-profile-container" style={{ width: "200px" }}>
      <Button
        className={`user-profile-button ${
          darkMode ? "dark-mode" : "light-mode"
        }`}
        onClick={toggleSettings}
      >
        {username}
      </Button>
      {showSettings && (
        <div
          className={`user-settings ${
            darkMode ? "bg-custom-dark text-white" : "text-dark"
          }`}
        >
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <FormCheck
                type="switch"
                id="darkModeSwitch"
                label="Dark Mode"
                checked={isDarkModeOn}
                onChange={toggleDarkMode}
              />
            </FormGroup>
            <hr />
            <Button type="submit">Save</Button>
            <Button variant="secondary" onClick={toggleSettings}>
              Close
            </Button>
          </Form>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
