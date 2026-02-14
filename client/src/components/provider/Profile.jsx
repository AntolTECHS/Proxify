import { useEffect, useState } from "react";
import API from "../../api/axios";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await API.get("/providers/me");
      setProfile(res.data);
      setBio(res.data.bio || "");
      setAddress(res.data.location?.address || "");
    };
    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    try {
      const res = await API.put("/providers/update", { bio, address });
      setProfile(res.data.profile);
      alert("Profile updated");
    } catch (err) {
      console.error(err);
    }
  };

  if (!profile) return <p>Loading...</p>;

  return (
    <div className="bg-white p-6 rounded shadow-md my-4">
      <h2 className="text-xl font-bold mb-4">Provider Profile</h2>
      <input
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Bio"
        className="border p-2 w-full mb-4 rounded"
      />
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Address"
        className="border p-2 w-full mb-4 rounded"
      />
      <button
        onClick={handleUpdate}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
      >
        Update Profile
      </button>
    </div>
  );
}
