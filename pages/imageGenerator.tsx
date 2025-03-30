import React, { useState } from "react";
import { getImageFromOpenAI } from "../utils/helpers";
import { FaSpinner } from "react-icons/fa";
import LoadingIndicator from "../components/LoadingIndicator";

const imageGeneratorHome = () => {
  const [userPrompt, setUserPrompt] = useState("");
  const [image, setImage] = useState("images/image.jpg");
  const [loading, setIsLoading] = useState(false);
  const handleGenerateImage = () => {
    getImageFromOpenAI(setImage, setIsLoading, userPrompt);
  };
  return (
    <div className="container  mt-2">
      <div className="d-flex">
        <input
          className="form-control "
          type="text"
          placeholder="Describe the image"
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
        />
        <button
          className="btn btn-success"
          disabled={userPrompt === ""}
          onClick={handleGenerateImage}
        >
          Generate
        </button>
      </div>
      {loading ? (
        <div className="spinning m-3 text-center">
          <FaSpinner />
        </div>
      ) : (
        image && (
          <img
            src={image}
            alt="img"
            style={{ paddingTop: "10px", maxWidth: "100%" }}
          />
        )
      )}
    </div>
  );
};

export default imageGeneratorHome;
