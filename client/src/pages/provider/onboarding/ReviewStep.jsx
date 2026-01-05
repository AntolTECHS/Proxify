export default function ReviewStep({ form, back, submit }) {
  return (
    <div className="max-w-md mx-auto bg-white shadow-xl rounded-2xl p-8 mt-10 border border-gray-200">
      <h2 className="text-2xl font-bold text-teal-600 mb-6 text-center">
        Review & Submit
      </h2>

      {/* Review Details */}
      <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
        <ReviewRow label="Full Name" value={form.name} />
        <ReviewRow label="Email" value={form.email} />
        <ReviewRow
          label="Password"
          value={"•".repeat(form.password.length)}
        />
        <ReviewRow
          label="Services"
          value={form.services.length ? form.services.join(", ") : "-"}
        />
        <ReviewRow label="Experience" value={`${form.experience} years`} />
        <ReviewRow label="Bio" value={form.bio || "-"} />
        <ReviewRow label="Location" value={form.location || "-"} />
        <ReviewRow label="Availability" value={form.availability || "-"} />
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={back}
          className="px-6 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition font-medium"
        >
          Back
        </button>
        <button
          type="button"
          onClick={submit}
          className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-lg transition"
        >
          Complete Registration
        </button>
      </div>
    </div>
  );
}

/* ---------- Helper Component ---------- */
function ReviewRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-gray-800">{value}</p>
    </div>
  );
}
