// components/WorkoutItem.tsx
import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { useSwipeable } from "react-swipeable";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";

interface RoutineItemProps {
  routine: {
    name: string;
    description: string;
  };
  onSwipeLeft?: () => void;
  setSelectedRoutine: (routine) => void;
}

const RoutineItem: React.FC<RoutineItemProps> = ({
  routine,
  onSwipeLeft,
  setSelectedRoutine,
}) => {
  const { data: session } = useSession() as {
    data: (Session & { token: { user } }) | null;
  };
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [hasSwipedLeft, setHasSwipedLeft] = useState(false);
  const handleSelectWorkout = () => {
    setSelectedRoutine(routine);
  };
  const handlers = useSwipeable({
    onSwipedLeft: async () => {
      if (onSwipeLeft && swipeDistance < -200 && !hasSwipedLeft) {
        setHasSwipedLeft(true);
      }
      setSwipeDistance(0);
      try {
        await fetch(
          `/api/routine?userId=${session?.token.user._id}&name=${routine.name}`,
          {
            method: "DELETE",
          }
        );
      } catch (error) {
        console.error("Error deleting workout:", error);
      }
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
          className="card m-3"
          style={{
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
            transition: "transform 0.3s ease",
            overflow: "visible",
          }}
        >
          <div className="p-2">
            <h5>Delete {routine.name}?</h5>
          </div>
          <div className="p-2 d-flex justify-content-between align-items-center">
            <Button size="sm" variant="danger" onClick={() => onSwipeLeft()}>
              Delete
            </Button>
            <Button
              size="sm"
              onClick={() => setHasSwipedLeft(false)}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="card m-3"
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
          <div className="p-2 fw-bold">
            <div>{routine.name}</div>
          </div>

          <div className="p-2">{routine.description}</div>
        </div>
      )}
    </React.Fragment>
  );
};

export default RoutineItem;
