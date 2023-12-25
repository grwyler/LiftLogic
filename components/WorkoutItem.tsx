// components/WorkoutItem.tsx
import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { useSwipeable } from "react-swipeable";
import { useRouter } from "next/router";

interface WorkoutItemProps {
  workout: {
    id: number;
    name: string;
  };
  onSwipeLeft?: () => void;
}

const WorkoutItem: React.FC<WorkoutItemProps> = ({ workout, onSwipeLeft }) => {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [hasSwipedLeft, setHasSwipedLeft] = useState(false);
  const router = useRouter();
  const handleSelectWorkout = () => {
    router.push(`/workout/${workout.id}`);
  };
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (onSwipeLeft && swipeDistance < -200 && !hasSwipedLeft) {
        setHasSwipedLeft(true);
      }
      setSwipeDistance(0);
    },
    onSwiping: (event) => {
      setSwipeDistance(event.deltaX);
    },
    onSwipedRight: () => {
      setSwipeDistance(0);
    },
    onTap: () => {
      if (!hasSwipedLeft) handleSelectWorkout();
    },

    trackTouch: true,
  });

  return (
    <React.Fragment>
      {hasSwipedLeft ? (
        <div
          className="card border border-danger m-2"
          style={{
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
            transition: "transform 0.3s ease",
            transform: `translateX(${swipeDistance}px)`,
            overflow: "visible",
          }}
        >
          <div className="card-header bg-danger text-light">
            <h3>Delete {workout.name}?</h3>
          </div>
          <div className="card-body d-flex justify-content-evenly">
            <Button variant="danger" onClick={() => onSwipeLeft()}>
              Delete
            </Button>
            <Button onClick={() => setHasSwipedLeft(false)} variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="card m-2"
          style={{
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
            transition: "transform 0.3s ease",
            transform: `translateX(${swipeDistance}px)`,
            overflow: "visible",
          }}
          {...handlers}
          onClick={() => {
            if (!hasSwipedLeft) handleSelectWorkout();
          }}
        >
          <div className="card-header">
            <h3>{workout.name}</h3>
          </div>
          <div className="card-body">Details go here</div>
        </div>
      )}
    </React.Fragment>
  );
};

export default WorkoutItem;
