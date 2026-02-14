export default function StepReview({ data = {}, back, submit }) {
  return (
    <div className="max-w-xl mx-auto p-8 bg-white shadow-lg rounded-xl border border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Review Your Profile
      </h2>

      <div className="mb-4">
        <strong>Business Name:</strong> {data.businessName || "-"}
      </div>

      <div className="mb-4">
        <strong>About:</strong> {data.bio || "-"}
      </div>

      <div className="mb-4">
        <strong>Services:</strong>
        {data.services && data.services.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {data.services.map((service, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm"
              >
                {service}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1">-</p>
        )}
      </div>

      <div className="mb-4">
        <strong>Availability:</strong> {data.availability || "-"}
      </div>

      <div className="mb-4">
        <strong>Documents:</strong>
        <p>{data.documents || "-"}</p>
        {data.files && data.files.length > 0 && (
          <ul className="mt-2 list-disc list-inside text-gray-700">
            {data.files.map((file, idx) => (
              <li key={idx}>{file.name}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={back}
          className="px-5 py-2 border border-gray-400 rounded-md hover:bg-gray-100 transition"
        >
          Back
        </button>
        <button
          onClick={submit}
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md transition"
        >
          Submit & Become Provider
        </button>
      </div>
    </div>
  );
}
