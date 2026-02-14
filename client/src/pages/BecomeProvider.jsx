import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function BecomeProvider() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (!user) {
      // 🚫 Not logged in
      navigate("/auth/login");
      return;
    }

    if (user.role === "provider") {
      if (user.isVerified) {
        // ✅ Already verified provider → dashboard
        navigate("/provider/dashboard");
      } else {
        // ⏳ Pending provider → pending page
        navigate("/provider/pending");
      }
      return;
    }

    // ✅ New user → go to onboarding
    navigate("/provider/onboarding");
  }, [user, navigate]);

  return (
    <div className="max-w-3xl mx-auto mt-24 p-6">
      <h1 className="text-3xl font-bold mb-4">Become a Provider</h1>
      <p className="text-gray-600 mb-6">
        Create your provider profile and submit documents for verification.
      </p>
      <p className="text-gray-500">
        Redirecting you to the right page...
      </p>
    </div>
  );
}
