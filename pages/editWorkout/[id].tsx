// pages/editWorkout/[id].tsx
import React from "react";
import { useRouter } from "next/router";

import { Button } from "react-bootstrap";
import { IoIosList } from "react-icons/io";
import { FaDumbbell } from "react-icons/fa";

const EditWorkoutPage = () => {
  const router = useRouter();
  const { id } = router.query;

  return (
    <div className="container">
      <div className="d-flex justify-content-between border boder-secondary">
        <Button variant="light" href="/workouts">
          <IoIosList />
        </Button>
        <Button variant="light" href={`/workout/${id}`}>
          <FaDumbbell />
        </Button>
      </div>
      <h1 className="text-center">Edit Workout with ID: {id}</h1>
    </div>
  );
};

export default EditWorkoutPage;
