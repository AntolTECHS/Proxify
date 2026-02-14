import { useState } from "react";

export default function StepDocuments({ next, back, update, data = {} }) {
  const [documents, setDocuments] = useState(data.documents || "");
  const [files, setFiles] = useState(data.files || []);

  const handleNext = () => {
    if (!documents.trim() && files.length === 0) {
      alert("Please provide document details or upload at least one file.");
      return;
    }

    update({ documents, files }); // save to Redux
    next(); // go to next step
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white shadow-lg rounded-xl border border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Documents
      </h2>

      <label className="block text-gray-700 font-medium mb-2">
        Document Details
      </label>
      <textarea
        placeholder="Describe your documents (IDs, certificates, etc.)"
        className="w-full border border-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none h-32 mb-4"
        value={documents}
        onChange={(e) => setDocuments(e.target.value)}
      />

      <label className="block text-gray-700 font-medium mb-2">
        Upload Files
      </label>
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        className="block w-full text-gray-700 border border-gray-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
      />
      {files.length > 0 && (
        <ul className="mb-4 text-gray-600">
          {files.map((file, idx) => (
            <li key={idx} className="text-sm">{file.name}</li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex justify-between">
        <button
          onClick={back}
          className="px-5 py-2 border border-gray-400 rounded-md hover:bg-gray-100 transition"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
