const SERVICES = [
  "Plumbing",
  "Cleaning",
  "Electrician",
  "Relocation",
];

export default function ServicesStep({ form, setForm, next, back }) {
  const toggle = (service) => {
    setForm({
      ...form,
      services: form.services.includes(service)
        ? form.services.filter((s) => s !== service)
        : [...form.services, service],
    });
  };

  return (
    <>
      <h2 className="text-xl font-semibold mb-4">
        Services You Offer
      </h2>

      {SERVICES.map((s) => (
        <label key={s} className="block">
          <input
            type="checkbox"
            checked={form.services.includes(s)}
            onChange={() => toggle(s)}
          />{" "}
          {s}
        </label>
      ))}

      <input
        className="input mt-4"
        placeholder="Years of Experience"
        value={form.experience}
        onChange={(e) =>
          setForm({ ...form, experience: e.target.value })
        }
      />

      <div className="flex justify-between mt-6">
        <button onClick={back}>Back</button>
        <button
          onClick={next}
          disabled={!form.services.length}
          className="btn-primary"
        >
          Continue
        </button>
      </div>
    </>
  );
}
