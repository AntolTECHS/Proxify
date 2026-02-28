// src/pages/provider/ProviderPending.jsx
import { FaExclamationTriangle } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

export default function ProviderPending() {
  const { user } = useAuth();

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-8 rounded-lg shadow-md max-w-md text-center">
        <FaExclamationTriangle className="text-yellow-600 w-12 h-12 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Account Pending Verification</h1>
        <p className="text-gray-700 mb-4">
          Hi {user?.name || "Provider"}, your provider account is currently under review.
          You will be notified once your documents and profile have been approved.
        </p>
        <p className="text-gray-600 text-sm">
          In the meantime, you can review your submitted information or update your profile if needed.
        </p>
      </div>
    </div>
  );
}