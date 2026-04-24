import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDispute } from "../../api/disputeApi";

export default function DisputeAccessGuard({ children }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        await getDispute(id); // backend will block unauthorized users
        setAllowed(true);
      } catch (err) {
        navigate("/unauthorized"); // or /404
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [id]);

  if (loading) return <div>Checking access...</div>;

  return allowed ? children : null;
}