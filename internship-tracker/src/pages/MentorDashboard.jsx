import { useEffect, useState } from "react";

function MentorDashboard() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3001/mentors/1/entries")
      .then((res) => res.json())
      .then((data) => setEntries(data));
  }, []);

  const handleApprove = (id) => {
    fetch(`http://localhost:3001/entries/${id}/approve`, {
      method: "PATCH",
    })
      .then((res) => res.json())
      .then((approvedEntry) => {
        setEntries(
          entries.map((entry) =>
            entry.id === approvedEntry.id ? approvedEntry : entry
          )
        );
      });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Mentor dashboard</h1>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Datum</th>
            <th>Sati</th>
            <th>Opis</th>
            <th>Status</th>
            <th>Akcija</th>
          </tr>
        </thead>

        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.studentId}</td>
              <td>{entry.date}</td>
              <td>{entry.hours}</td>
              <td>{entry.description}</td>
              <td>{entry.status}</td>
              <td>
                {entry.status === "pending" ? (
                  <button onClick={() => handleApprove(entry.id)}>
                    Odobri
                  </button>
                ) : (
                  <span>Odobreno</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MentorDashboard;