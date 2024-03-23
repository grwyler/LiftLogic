import React, { useState } from "react";
import { Button } from "react-bootstrap";
import Accordion from "react-bootstrap/Accordion";
import Card from "react-bootstrap/Card";
import { IoCaretDown, IoCaretUp } from "react-icons/io5";

function EquipmentAccordion({
  requiredEquipment,
  selectedEquipment,
  setSelectedEquipment,
  darkMode,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleEquipmentClick = (equipment) => {
    if (selectedEquipment.includes(equipment)) {
      setSelectedEquipment(
        selectedEquipment.filter((item) => item !== equipment)
      );
    } else {
      setSelectedEquipment([...selectedEquipment, equipment]);
    }
  };

  const handleSelectAll = () => {
    if (selectedEquipment.length === requiredEquipment.length) {
      setSelectedEquipment([]);
    } else {
      setSelectedEquipment([...requiredEquipment]);
    }
  };

  return (
    <Accordion>
      <Card className={darkMode ? "bg-dark border-light" : ""}>
        <Card.Header className="d-flex justify-content-between">
          <Button
            variant={darkMode ? "dark" : "white"}
            onClick={handleToggleCollapse}
            aria-expanded={!isCollapsed}
            aria-controls="equipmentCollapse"
          >
            {isCollapsed ? <IoCaretDown /> : <IoCaretUp />} Available Equipment
          </Button>
          <Button
            variant={
              selectedEquipment.length === requiredEquipment.length
                ? "secondary"
                : "white"
            }
            onClick={handleSelectAll}
            aria-expanded={!isCollapsed}
            aria-controls="equipmentCollapse"
          >
            {selectedEquipment.length === requiredEquipment.length
              ? "Deselect All"
              : "Select All"}
          </Button>
        </Card.Header>
        <Accordion.Collapse eventKey="0" in={!isCollapsed}>
          <Card.Body id="equipmentCollapse">
            {requiredEquipment.map((equipment, index) => (
              <button
                key={index}
                type="button"
                className={`btn btn-sm me-2 mb-2 ${
                  selectedEquipment.includes(equipment)
                    ? "btn-primary"
                    : "btn-outline-secondary"
                }`}
                onClick={() => handleEquipmentClick(equipment)}
              >
                {equipment}
              </button>
            ))}
          </Card.Body>
        </Accordion.Collapse>
      </Card>
    </Accordion>
  );
}

export default EquipmentAccordion;
