import SearchProviders from "../components/Customer/SearchProviders.jsx";

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">Welcome to ServLink</h1>
      <SearchProviders />
    </div>
  );
}
