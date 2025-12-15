import { useEffect, useState } from "react";
import API from "../../api/axios";

export default function SearchProviders() {
  const [providers, setProviders] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await API.get("/providers");
      setProviders(res.data);
    };
    fetchProviders();
  }, []);

  const filtered = providers.filter((p) =>
    p.bio?.toLowerCase().includes(query.toLowerCase()) || p.user.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="bg-white p-6 rounded shadow-md my-4">
      <h2 className="text-xl font-bold mb-4">Find Providers</h2>
      <input
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border p-2 w-full mb-4 rounded"
      />
      <ul>
        {filtered.map((p) => (
          <li key={p._id} className="border-b py-2">
            <p className="font-bold">{p.user.name}</p>
            <p>{p.bio}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
