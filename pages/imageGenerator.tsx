import React, { useState } from "react";
import { getImageFromOpenAI } from "../utils/helpers";
import { FaSpinner } from "react-icons/fa";

const ImageGeneratorHome = () => {
  const [userPrompt, setUserPrompt] = useState("");
  const [image, setImage] = useState("/images/image.jpg");
  const [loading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateImage = async () => {
    await getImageFromOpenAI(setImage, setIsLoading, userPrompt, setError);
  };

  return (
    <div className="container  mt-2">
      <div className="d-flex">
        <input
          className="form-control "
          type="text"
          placeholder="Describe the image"
          value={userPrompt}
          onChange={(e) => {
            setUserPrompt(e.target.value);
            if (error) {
              setError("");
            }
          }}
        />
        <button
          className="btn btn-success"
          disabled={userPrompt === "" || loading}
          onClick={handleGenerateImage}
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>
      {error ? <p className="mt-2 text-danger">{error}</p> : null}
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

export default ImageGeneratorHome;
