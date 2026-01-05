export default function AccountStep({ form, setForm, next }) {
  const valid =
    form.name && form.email && form.password.length >= 6;

  return (
    <>
      <h2 className="text-xl font-semibold mb-4">
        Create Your Account
      </h2>

      <input
        className="input"
        placeholder="Full Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />

      <input
        className="input"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <input
        type="password"
        className="input"
        placeholder="Password (min 6 chars)"
        onChange={(e) =>
          setForm({ ...form, password: e.target.value })
        }
      />

      <button
        disabled={!valid}
        onClick={next}
        className="btn-primary mt-4"
      >
        Continue
      </button>
    </>
  );
}
