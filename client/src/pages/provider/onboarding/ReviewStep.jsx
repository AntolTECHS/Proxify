export default function ReviewStep({ form, back, submit }) {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4">
        Review & Submit
      </h2>

      <pre className="bg-gray-100 p-4 rounded text-sm">
        {JSON.stringify(form, null, 2)}
      </pre>

      <div className="flex justify-between mt-6">
        <button onClick={back}>Back</button>
        <button onClick={submit} className="btn-primary">
          Complete Registration
        </button>
      </div>
    </>
  );
}
