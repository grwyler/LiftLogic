"use client";

import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { fetchUser, saveUser } from "../utils/helpers";
import LoadingIndicator from "../components/LoadingIndicator";
import Header from "../components/Header";
import { Button, Form, FormCheck, FormGroup, FormLabel } from "react-bootstrap";
import { set } from "date-fns";
import { toast } from "react-toastify";

import { useRouter } from "next/navigation";
import { Box, Typography } from "@mui/material";
interface UserPageProps {
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const UserHomePage: React.FC<UserPageProps> = ({ darkMode, setDarkMode }) => {
  const { data: session, status } = useSession() as {
    data: (Session & { token: { user: { _id: string } } }) | null;
    status: any;
  };
  const router = useRouter();
  const [isDarkModeOn, setIsDarkModeOn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  //   const [height, setHeight] = useState(null);
  //   const [weight, setWeight] = useState("");
  //   const [age, setAge] = useState("");
  //   const [gender, setGender] = useState("");
  //   const [activityLevel, setActivityLevel] = useState("");
  //   const [fitnessGoal, setFitnessGoal] = useState("");
  //   const [dietPreference, setDietPreference] = useState("");
  //   const [stepGoal, setStepGoal] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [dietPreference, setDietPreference] = useState("");
  const [stepGoal, setStepGoal] = useState("");

  useEffect(() => {
    if (user) {
      setHeight(user.height);
      setIsDarkModeOn(user.darkMode);
      setWeight(user.weight);
      setAge(user.age);
      setGender(user.gender);
      setActivityLevel(user.activityLevel);
      setFitnessGoal(user.fitnessGoal);
      setDietPreference(user.dietPreference);
      setStepGoal(user.stepGoal);
    }
  }, [user]);

  // Handlers
  //   const handleHeightChange = (e) => setHeight(e.target.value);
  //   const handleWeightChange = (e) => setWeight(e.target.value);
  //   const handleAgeChange = (e) => setAge(e.target.value);
  //   const handleGenderChange = (e) => setGender(e.target.value);
  //   const handleActivityLevelChange = (e) => setActivityLevel(e.target.value);
  //   const handleFitnessGoalChange = (e) => setFitnessGoal(e.target.value);
  //   const handleDietPreferenceChange = (e) => setDietPreference(e.target.value);
  //   const handleStepGoalChange = (e) => setStepGoal(e.target.value);
  //

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newUser = {
      ...user,
      darkMode: isDarkModeOn,
      weight,
      height,
      age,
      gender,
      activityLevel,
      fitnessGoal,
      dietPreference,
      stepGoal,
    };

    setUser(newUser);

    try {
      const response = await saveUser(newUser);
      if (response.success) {
        router.replace("/routines");
      } else {
        toast.error("Failed to update user data."); // ✅ Error toast
      }
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  const handleHeightChange = (e) => setHeight(e.target.value);
  const handleWeightChange = (e) => setWeight(e.target.value);
  const handleAgeChange = (e) => setAge(e.target.value);
  const handleGenderChange = (e) => setGender(e.target.value);
  const handleActivityLevelChange = (e) => setActivityLevel(e.target.value);
  const handleFitnessGoalChange = (e) => setFitnessGoal(e.target.value);
  const handleDietPreferenceChange = (e) => setDietPreference(e.target.value);
  const handleStepGoalChange = (e) => setStepGoal(e.target.value);
  // Fetch user and routine data
  useEffect(() => {
    if (!session?.token?.user?._id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [userData] = await Promise.all([
          fetchUser(session.token.user._id),
        ]);
        setUser(userData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  return loading ? (
    <LoadingIndicator />
  ) : (
    user && (
      <>
        <div
          className={`container p-2 vh-100 ${
            user.darkMode ? "text-white bg-dark" : ""
          }`}
          style={{ maxWidth: 600, height: "100vh", overflowY: "auto" }}
        >
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <FormCheck
                type="switch"
                id="darkModeSwitch"
                label="Dark Mode"
                checked={isDarkModeOn}
                onChange={() => {}}
              />
            </FormGroup>
            <Box sx={{ p: 2 }}>
              <Typography variant="h5" gutterBottom>
                User Page
              </Typography>
              <Button
                variant="contained"
                onClick={() => setDarkMode((prev) => !prev)}
              >
                Toggle Dark Mode
              </Button>
              <Typography sx={{ mt: 2 }}>
                Dark Mode is {darkMode ? "ON" : "OFF"}.
              </Typography>
            </Box>

            <div className="container">
              <div className="row">
                {/* Height */}
                <div className="col">
                  <FormLabel>Height (cm)</FormLabel>
                  <input
                    value={height}
                    onChange={handleHeightChange}
                    type="number"
                    className="form-control"
                  />
                </div>

                {/* Weight */}
                <div className="col">
                  <FormLabel>Weight (kg)</FormLabel>
                  <input
                    value={weight}
                    onChange={handleWeightChange}
                    type="number"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="row mt-3">
                {/* Age */}
                <div className="col">
                  <FormLabel>Age</FormLabel>
                  <input
                    value={age}
                    onChange={handleAgeChange}
                    type="number"
                    className="form-control"
                  />
                </div>

                {/* Gender */}
                <div className="col">
                  <FormLabel>Gender</FormLabel>
                  <select
                    value={gender}
                    onChange={handleGenderChange}
                    className="form-control"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="row mt-3">
                {/* Activity Level */}
                <div className="col">
                  <FormLabel>Activity Level</FormLabel>
                  <select
                    value={activityLevel}
                    onChange={handleActivityLevelChange}
                    className="form-control"
                  >
                    <option value="">Select</option>
                    <option value="sedentary">
                      Sedentary (little or no exercise)
                    </option>
                    <option value="lightly_active">
                      Lightly Active (1-3 days/week)
                    </option>
                    <option value="moderately_active">
                      Moderately Active (3-5 days/week)
                    </option>
                    <option value="very_active">
                      Very Active (6-7 days/week)
                    </option>
                  </select>
                </div>

                {/* Fitness Goal */}
                <div className="col">
                  <FormLabel>Fitness Goal</FormLabel>
                  <select
                    value={fitnessGoal}
                    onChange={handleFitnessGoalChange}
                    className="form-control"
                  >
                    <option value="">Select</option>
                    <option value="weight_loss">Weight Loss</option>
                    <option value="muscle_gain">Muscle Gain</option>
                    <option value="endurance">Endurance</option>
                    <option value="general_fitness">General Fitness</option>
                  </select>
                </div>
              </div>

              <div className="row mt-3">
                {/* Dietary Preference */}
                <div className="col">
                  <FormLabel>Dietary Preference</FormLabel>
                  <select
                    value={dietPreference}
                    onChange={handleDietPreferenceChange}
                    className="form-control"
                  >
                    <option value="">Select</option>
                    <option value="none">No Preference</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="keto">Keto</option>
                    <option value="paleo">Paleo</option>
                  </select>
                </div>
                <div className="col">
                  <FormLabel>Daily Step Goal</FormLabel>
                  <input
                    value={stepGoal}
                    onChange={handleStepGoalChange}
                    type="number"
                    className="form-control"
                  />
                </div>
              </div>
            </div>
            <hr />
            <Button type="submit">Update</Button>
          </Form>
        </div>
      </>
    )
  );
};

export default UserHomePage;
