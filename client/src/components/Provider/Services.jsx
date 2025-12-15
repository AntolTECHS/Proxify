import { useEffect, useState } from "react";
import API from "../../api/axios";

export default function Services() {
  const [services, setServices] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");

  useEffect(() => {
    const fetchServices = async () => {
      const res = await API.get("/services/provider");
      setServices(res.data);
    };
    fetchServices();
  }, []);

  const handleAddService = async () => {
    const res = await API.post("/services/add", { name, description, cost });
    setServices([...services, res.data.service]);
    setName(""); setDescription(""); setCost("");
  };

  return (
    <div className="bg-white p-6 rounded shadow-md my-4">
      <h2 className="text-xl font-bold mb-4">My Services</h2>
      <input
        placeholder="Service Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 w-full mb-2 rounded"
      />
      <input
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border p-2 w-full mb-2 rounded"
      />
      <input
        placeholder="Cost"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        className="border p-2 w-full mb-4 rounded"
      />
      <button
        onClick={handleAddService}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
      >
        Add Service
      </button>

      <ul>
        {services.map((s) => (
          <li key={s._id} className="border-b py-1">{s.name} - ${s.cost}</li>
        ))}
      </ul>
    </div>
  );
}
