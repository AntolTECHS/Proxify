export default function Status({ status }) {
  const map = {
    open: "Open",
    responded: "Responded",
    under_review: "Under Review",
    resolved: "Resolved",
    closed: "Closed",
  };

  return <span>{map[status] || status || "Unknown"}</span>;
}