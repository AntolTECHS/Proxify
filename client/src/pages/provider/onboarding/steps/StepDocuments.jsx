import { useState, useEffect } from "react";

export default function StepDocuments({ next, back, update, data = {} }) {
  const [documentsText, setDocumentsText] = useState(data.documentsText || "");
  const [files, setFiles] = useState(Array.isArray(data.documents) ? data.documents : []);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setDocumentsText(data.documentsText || "");
    setFiles(Array.isArray(data.documents) ? data.documents : []);
  }, [data.documents, data.documentsText]);

  const validate = () => {
    const newErrors = {};
    if (!documentsText.trim() && files.length === 0) {
      newErrors.documents = "Provide document details or upload at least one file.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setFiles(selectedFiles);
    if (errors.documents) setErrors({ ...errors, documents: "" });
  };

  const removeFile = (idx) => {
    const updated = [...files];
    updated.splice(idx, 1);
    setFiles(updated);
  };

  const handleNext = () => {
    if (!validate()) return;

    // Update via AuthContext (no Redux)
    update("documents", files.map((f) => ({
      file: f.file || null,
      name: f.name || "Unnamed",
      size: f.size || 0,
      type: f.type || "unknown",
    })));
    update("documentsText", documentsText.trim());

    next();
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white shadow-lg rounded-xl border border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Documents</h2>

      <label className="block text-gray-700 font-medium mb-2">Document Details</label>
      <textarea
        placeholder="Describe your documents (IDs, certificates, etc.)"
        className={`w-full border rounded-md px-4 py-2 resize-none h-32 mb-2 focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.documents ? "border-red-500" : "border-gray-400"}`}
        value={documentsText}
        onChange={(e) => {
          setDocumentsText(e.target.value);
          if (errors.documents) setErrors({ ...errors, documents: "" });
        }}
      />
      {errors.documents && <p className="text-red-500 text-sm mb-2">{errors.documents}</p>}

      <label className="block text-gray-700 font-medium mb-2">Upload Files</label>
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        className="block w-full text-gray-700 border border-gray-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
      />

      {files.length > 0 && (
        <ul className="mb-4 text-gray-600">
          {files.map((f, idx) => (
            <li key={idx} className="flex justify-between items-center text-sm mb-1">
              <span>{f.name} ({Math.round(f.size / 1024)} KB)</span>
              <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700 text-xs ml-2">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex justify-between">
        <button onClick={back} className="px-5 py-2 border border-gray-400 rounded-md hover:bg-gray-100 transition">
          Back
        </button>
        <button onClick={handleNext} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md transition">
          Next
        </button>
      </div>
    </div>
  );
}
