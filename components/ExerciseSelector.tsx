import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button, Form, InputGroup, Spinner, Table } from "react-bootstrap";
import { FaChevronLeft, FaPlus } from "react-icons/fa";
import { initialExercises } from "../utils/sample-data";

const ExerciseSelector = ({
  setIsAddingExercise,
  addExerciseToWorkout,
  darkMode,
  isPersistent,
}) => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bodyParts, setBodyParts] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [targets, setTargets] = useState([]);
  const [filters, setFilters] = useState({
    bodyPart: "",
    equipment: "",
    target: "",
  });

  // Fetch dropdown lists (body parts, equipment, target muscles)
  useEffect(() => {
    const fetchLists = async () => {
      try {
        const [bodyPartsRes, equipmentRes, targetsRes] = await Promise.all([
          axios.get("/api/exercises?type=bodyPartList"),
          axios.get("/api/exercises?type=equipmentList"),
          axios.get("/api/exercises?type=targetList"),
        ]);
        setBodyParts(bodyPartsRes.data);
        setEquipment(equipmentRes.data);
        setTargets(targetsRes.data);
      } catch (err) {
        // console.error("Error fetching filter lists:", err);
      }
    };

    fetchLists();
  }, []);

  // Fetch exercises dynamically from API
  useEffect(() => {
    const fetchExercises = async () => {
      setLoading(true);
      setError(null);

      let apiUrl = "/api/exercises?type=all"; // Default: Get all exercises

      if (filters.bodyPart)
        apiUrl = `/api/exercises?type=bodyPart&param=${filters.bodyPart}`;
      if (filters.equipment)
        apiUrl = `/api/exercises?type=equipment&param=${filters.equipment}`;
      if (filters.target)
        apiUrl = `/api/exercises?type=target&param=${filters.target}`;
      if (searchQuery)
        apiUrl = `/api/exercises?type=name&param=${searchQuery.toLowerCase()}`;

      try {
        const response = await axios.get(apiUrl);
        setExercises(response.data);
      } catch (err) {
        setError("API is down, using a static list of exercises");
        setExercises(initialExercises);
        console.log("API is down");
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [filters, searchQuery]); // Trigger fetch when filters or search change
  const handleAddExercise = (exercise) => {
    setIsAddingExercise(false);
    addExerciseToWorkout({
      ...exercise,
      isPersistent,
      sets: [
        {
          actualReps: "",
          actualWeight: "",
          complete: false,
        },
      ],
    });
  };
  return (
    <div className="container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button
          onClick={() => setIsAddingExercise(false)}
          variant={darkMode ? "dark" : "white"}
        >
          <FaChevronLeft /> Back
        </Button>
      </div>

      <h3 className="text-center mb-3">Select an Exercise</h3>

      {/* Search & Filter Section */}
      <InputGroup className="mb-3">
        <Form.Control
          type="text"
          placeholder="Search exercises..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </InputGroup>

      <div className="d-flex gap-2 flex-wrap mb-3">
        <Form.Select
          className="flex-grow-1"
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, bodyPart: e.target.value }))
          }
          value={filters.bodyPart}
        >
          <option value="">Filter by Body Part</option>
          {bodyParts.map((part) => (
            <option key={part} value={part}>
              {part}
            </option>
          ))}
        </Form.Select>

        <Form.Select
          className="flex-grow-1"
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, equipment: e.target.value }))
          }
          value={filters.equipment}
        >
          <option value="">Filter by Equipment</option>
          {equipment.map((eq) => (
            <option key={eq} value={eq}>
              {eq}
            </option>
          ))}
        </Form.Select>

        <Form.Select
          className="flex-grow-1"
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, target: e.target.value }))
          }
          value={filters.target}
        >
          <option value="">Filter by Target Muscle</option>
          {targets.map((target) => (
            <option key={target} value={target}>
              {target}
            </option>
          ))}
        </Form.Select>
      </div>

      {/* Exercise List */}
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" />
        </div>
      ) : (
        <div className="row">
          <div className="alert alert-warning">{error}</div>
          {exercises.map((exercise) => (
            <div key={exercise.id} className="col-12 col-md-6 col-lg-4 mb-3">
              <div className="card shadow-sm h-100">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{exercise.name}</h5>
                  <p className="text-muted mb-1">
                    <strong>Body Part:</strong> {exercise.bodyPart}
                  </p>
                  <p className="text-muted mb-1">
                    <strong>Equipment:</strong> {exercise.equipment}
                  </p>
                  <p className="text-muted">
                    <strong>Target:</strong> {exercise.target}
                  </p>

                  <div className="mt-auto">
                    <Button
                      variant="light"
                      className="w-100 text-success"
                      onClick={() => handleAddExercise(exercise)}
                    >
                      <FaPlus /> Add Exercise to Routine
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExerciseSelector;
