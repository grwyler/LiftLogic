import { FaSpinner } from "react-icons/fa";

const LoadingIndicator = () => {
  return (
    <div className="spinning d-flex p-5 justify-content-center align-items-center">
      Loading
      <FaSpinner className="ms-2" />
    </div>
  );
};

export default LoadingIndicator;
