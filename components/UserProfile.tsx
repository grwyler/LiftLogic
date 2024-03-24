import React, { useState } from "react";
import { Button, Form, FormGroup, FormCheck } from "react-bootstrap";
import { saveUser } from "../utils/helpers";

function UserProfile({ user, setUser, darkMode, setDarkMode }) {
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkModeOn, setIsdarkModeOn] = useState(darkMode);

  const toggleSettings = () => {
    if (showSettings) {
      setIsdarkModeOn(user.darkMode || false);
    }
    setShowSettings(!showSettings);
  };

  const toggleDarkMode = () => {
    setIsdarkModeOn(!isDarkModeOn);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSettings(false);
    setDarkMode(isDarkModeOn);
    user.darkMode = isDarkModeOn;
    setUser(user);
    saveUser(user);
  };

  return (
    <div className="user-profile-container" style={{ width: "200px" }}>
      <Button
        className={`user-profile-button ${
          darkMode ? "dark-mode" : "light-mode"
        }`}
        onClick={toggleSettings}
      >
        {user.username}
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
