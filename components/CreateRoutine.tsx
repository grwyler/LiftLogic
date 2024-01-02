import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { FaSave, FaSpinner } from "react-icons/fa";
import { saveRoutine } from "../utils/helpers";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import styles from "../styles/createRoutine.module.css";

const CreateRoutine = ({ setIsCreatingRoutine, routines }) => {
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);
  const router = useRouter();
  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };
  const [routine, setRoutine] = useState({
    name: "",
    description: "",
    userId: "",
    days: {
      sunday: {
        title: "Mobility and Active Recovery",
        exercises: [
          {
            name: "Dynamic Stretching Routine",
            type: "timed",
            sets: [
              {
                name: "Stretch and Foam Roll",
                seconds: 0,
                minutes: 15,
                actualMinutes: "",
                actualSeconds: "",
                hours: 1,
                actualHours: "",
              },
            ],
          },
        ],
      },
      monday: { title: "Jiu-Jitsu Anvil", exercises: [] },
      tuesday: {
        title: "Strength Training",
        complete: false,
        exercises: [
          {
            name: "Squats",
            type: "weight",
            max: 315,
            rest: 120,
            complete: false,
            sets: [
              {
                name: "Warm-up set 1",
                reps: 10,
                percentage: 0.5,
                actualReps: "",
                actualWeight: "",
                weight: 315 * 0.5,
              },
              {
                name: "Warm-up set 2",
                reps: 10,
                percentage: 0.6,
                actualReps: "",
                actualWeight: "",
                weight: 315 * 0.6,
              },
              {
                name: "Working set 1",
                reps: 6,
                percentage: 0.75,
                actualReps: "",
                actualWeight: "",
                weight: 315 * 0.75,
              },
              {
                name: "Working set 2",
                reps: 6,
                percentage: 0.78,
                actualReps: "",
                actualWeight: "",
                weight: 315 * 0.78,
              },
              {
                name: "Working set 3",
                reps: 6,
                percentage: 0.82,
                actualReps: "",
                actualWeight: "",
                weight: 315 * 0.82,
              },
              {
                name: "Working set 4",
                reps: 6,
                percentage: 0.85,
                actualReps: "",
                actualWeight: "",
                weight: 315 * 0.85,
              },
            ],
          },
          {
            name: "Bench Press",
            type: "weight",
            max: 225,
            rest: 120,
            complete: false,
            sets: [
              {
                name: "Warm-up set 1",
                reps: 10,
                percentage: 0.5,
                actualReps: "",
                actualWeight: "",
                weight: 225 * 0.5,
              },
              {
                name: "Warm-up set 2",
                reps: 10,
                percentage: 0.6,
                actualReps: "",
                actualWeight: "",
                weight: 225 * 0.6,
              },
              {
                name: "Working set 1",
                reps: 6,
                percentage: 0.75,
                actualReps: "",
                actualWeight: "",
                weight: 225 * 0.75,
              },
              {
                name: "Working set 2",
                reps: 6,
                percentage: 0.78,
                actualReps: "",
                actualWeight: "",
                weight: 225 * 0.78,
              },
              {
                name: "Working set 3",
                reps: 6,
                percentage: 0.82,
                actualReps: "",
                actualWeight: "",
                weight: 225 * 0.82,
              },
              {
                name: "Working set 4",
                reps: 6,
                percentage: 0.85,
                actualReps: "",
                actualWeight: "",
                weight: 225 * 0.85,
              },
            ],
          },
          {
            name: "Bent Over Rows",
            type: "weight",
            max: 155,
            rest: 120,
            complete: false,
            sets: [
              {
                name: "Working set 1",
                reps: 10,
                percentage: 0.75,
                actualReps: "",
                actualWeight: "",
                weight: 155 * 0.75,
              },
              {
                name: "Working set 2",
                reps: 10,
                percentage: 0.78,
                actualReps: "",
                actualWeight: "",
                weight: 155 * 0.78,
              },
              {
                name: "Working set 3",
                reps: 10,
                percentage: 0.82,
                actualReps: "",
                actualWeight: "",
                weight: 155 * 0.82,
              },
            ],
          },
          {
            name: "Lunges",
            type: "weight",
            max: 155,
            rest: 120,
            complete: false,
            sets: [
              {
                name: "Working set 1",
                reps: 10,
                percentage: 0.75,
                actualReps: "",
                actualWeight: "",
                weight: 155 * 0.75,
              },
              {
                name: "Working set 2",
                reps: 10,
                percentage: 0.78,
                actualReps: "",
                actualWeight: "",
                weight: 155 * 0.78,
              },
              {
                name: "Working set 3",
                reps: 10,
                percentage: 0.82,
                actualReps: "",
                actualWeight: "",
                weight: 155 * 0.82,
              },
            ],
          },
        ],
      },
      wednesday: { title: "Jiu-Jitsu Anvil", exercises: [] },
      thursday: {
        title: "Strength Training",
        exercises: [
          {
            name: "Deadlifts",
            type: "weight",
            max: 405,
            rest: 120,
            complete: false,
            sets: [
              {
                name: "Warm-up set 1",
                reps: 10,
                percentage: 0.5,
                actualReps: "",
                actualWeight: "",
                weight: 405 * 0.5,
              },
              {
                name: "Warm-up set 2",
                reps: 10,
                percentage: 0.6,
                actualReps: "",
                actualWeight: "",
                weight: 405 * 0.6,
              },
              {
                name: "Working set 1",
                reps: 6,
                percentage: 0.75,
                actualReps: "",
                actualWeight: "",
                weight: 405 * 0.75,
              },
              {
                name: "Working set 2",
                reps: 6,
                percentage: 0.78,
                actualReps: "",
                actualWeight: "",
                weight: 405 * 0.78,
              },
              {
                name: "Working set 3",
                reps: 6,
                percentage: 0.82,
                actualReps: "",
                actualWeight: "",
                weight: 405 * 0.82,
              },
              {
                name: "Working set 4",
                reps: 6,
                percentage: 0.85,
                actualReps: "",
                actualWeight: "",
                weight: 405 * 0.85,
              },
            ],
          },
          {
            name: "Overhead Press",
            type: "weight",
            max: 145,
            rest: 120,
            complete: false,
            sets: [
              {
                name: "Warm-up set 1",
                reps: 10,
                percentage: 0.5,
                actualReps: "",
                actualWeight: "",
                weight: 145 * 0.6,
              },
              {
                name: "Warm-up set 2",
                reps: 10,
                percentage: 0.6,
                actualReps: "",
                actualWeight: "",
                weight: 145 * 0.6,
              },
              {
                name: "Working set 1",
                reps: 6,
                percentage: 0.75,
                actualReps: "",
                actualWeight: "",
                weight: 145 * 0.75,
              },
              {
                name: "Working set 2",
                reps: 6,
                percentage: 0.78,
                actualReps: "",
                actualWeight: "",
                weight: 145 * 0.78,
              },
              {
                name: "Working set 3",
                reps: 6,
                percentage: 0.82,
                actualReps: "",
                actualWeight: "",
                weight: 145 * 0.82,
              },
              {
                name: "Working set 4",
                reps: 6,
                percentage: 0.85,
                actualReps: "",
                actualWeight: "",
                weight: 145 * 0.85,
              },
            ],
          },
          {
            name: "Pull-Ups",
            type: "weight",
            max: 35,
            rest: 120,
            complete: false,
            sets: [
              {
                name: "Working set 1",
                reps: 10,
                percentage: 0.75,
                actualReps: "",
                actualWeight: "",
                weight: 35 * 0.75,
              },
              {
                name: "Working set 2",
                reps: 10,
                percentage: 0.78,
                actualReps: "",
                actualWeight: "",
                weight: 35 * 0.78,
              },
              {
                name: "Working set 3",
                reps: 10,
                percentage: 0.82,
                actualReps: "",
                actualWeight: "",
                weight: 35 * 0.82,
              },
            ],
          },
          {
            name: "Bulgarian Split Squats",
            type: "weight",
            max: 45,
            rest: 120,
            complete: false,
            sets: [
              {
                name: "Working set 1",
                reps: 10,
                percentage: 0.75,
                actualReps: "",
                actualWeight: "",
                weight: 45 * 0.75,
              },
              {
                name: "Working set 2",
                reps: 10,
                percentage: 0.78,
                actualReps: "",
                actualWeight: "",
                weight: 45 * 0.78,
              },
              {
                name: "Working set 3",
                reps: 10,
                percentage: 0.82,
                actualReps: "",
                actualWeight: "",
                weight: 45 * 0.82,
              },
            ],
          },
          {
            name: "Planks",
            type: "timed",
            rest: 30,
            complete: false,
            sets: [
              {
                name: "Working set 1",
                seconds: 60,
                actualSeconds: "",
                minutes: 0,
                actualMinutes: "",
                hours: 0,
                actualHours: "",
              },
              {
                name: "Working set 2",
                seconds: 60,
                actualSeconds: "",
                minutes: 0,
                actualMinutes: "",
                hours: 0,
                actualHours: "",
              },
              {
                name: "Working set 3",
                seconds: 60,
                actualSeconds: "",
                minutes: 0,
                actualMinutes: "",
                hours: 0,
                actualHours: "",
              },
            ],
          },
        ],
      },
      friday: { title: "Rest and Recovery", exercises: [] },
      saturday: { title: "Jiu-Jitsu Open Mat", exercises: [] },
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRoutine((prevRoutine) => ({
      ...prevRoutine,
      [name]: value,
    }));
  };

  const handleFormSubmit = async () => {
    setIsSavingRoutine(true);
    routine.userId = session?.token.user._id;
    routine.name = routine.name.trim();
    routines.push(routine);
    await saveRoutine(routine);
    setIsCreatingRoutine(false);
  };

  return (
    <Form className="mt-3 container-fluid" onSubmit={handleFormSubmit}>
      <Form.Group controlId="routineName">
        <Form.Label className="small">Name</Form.Label>
        <Form.Control
          type="text"
          size="sm"
          placeholder="Enter routine name"
          name="name"
          value={routine.name}
          onChange={handleInputChange}
        />
      </Form.Group>
      <Form.Group controlId="routineDescription">
        <Form.Label className="small">Description</Form.Label>
        <Form.Control
          as="textarea"
          size="sm"
          rows={3}
          placeholder="Enter routine description"
          name="description"
          value={routine.description}
          onChange={handleInputChange}
        />
      </Form.Group>
      <Button
        disabled={
          !routine.name ||
          routine.name === "" ||
          routine.name.length <= 2 ||
          isSavingRoutine
        }
        size="sm"
        className={`mt-3 ${isSavingRoutine ? styles.spinning : ""}`}
        variant="primary"
        type="button"
        onClick={handleFormSubmit}
      >
        {isSavingRoutine ? (
          <>
            Creating <FaSpinner />
          </>
        ) : (
          <>
            Create Routine <FaSave />
          </>
        )}
      </Button>
    </Form>
  );
};

export default CreateRoutine;
