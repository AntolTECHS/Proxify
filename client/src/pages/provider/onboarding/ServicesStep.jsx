const SERVICES = ["Plumbing", "Cleaning", "Electrician", "Relocation"];

export default function ServicesStep({ form, setForm, next, back }) {
  const toggle = (service) => {
    setForm({
      ...form,
      services: form.services.includes(service)
        ? form.services.filter((s) => s !== service)
        : [...form.services, service],
    });
  };

  const valid = form.services.length > 0 && form.experience.trim() !== "";

  return (
    <div className="max-w-md mx-auto bg-white shadow-xl rounded-2xl p-8 mt-10 border border-gray-200">
      <h2 className="text-2xl font-bold text-teal-600 mb-6 text-center">
        Services You Offer
      </h2>

      {/* Services checkboxes */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {SERVICES.map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => toggle(s)}
            className={`border rounded-xl px-4 py-3 text-center font-medium transition ${
              form.services.includes(s)
                ? "bg-teal-500 text-white border-teal-500"
                : "bg-white text-gray-700 hover:bg-teal-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Years of Experience */}
      <div className="flex flex-col mb-6">
        <label className="mb-2 font-semibold text-gray-700">
          Years of Experience
        </label>
        <input
          type="number"
          min="0"
          placeholder="e.g., 3"
          value={form.experience}
          onChange={(e) => setForm({ ...form, experience: e.target.value })}
          className="input px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
        />
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
          onClick={next}
          disabled={!valid}
          className={`px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-lg transition ${
            !valid ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
