import { useEffect, useState } from "react";

const roleLabels = {
  student: "Student",
  mentor: "Mentor",
  super_admin: "Superadmin",
};

const statusLabels = {
  planned: "Čeka potvrdu",
  active: "Aktivna",
  completed: "Završena",
  cancelled: "Otkazana",
  draft: "Skica",
  pending: "Čeka pregled",
  approved: "Odobren",
  rejected: "Vraćen na doradu",
};

const activityLabels = {
  development: "Razvoj",
  testing: "Testiranje",
  documentation: "Dokumentacija",
  other: "Ostalo",
};

function formatDate(value) {
  return value ? value.slice(0, 10).split("-").reverse().join(".") : "—";
}

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/admin/dashboard", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      })
      .then(setDashboard)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      });

    return () => controller.abort();
  }, []);

  if (error) {
    return <p className="dashboard-message dashboard-message--error">{error}</p>;
  }

  if (!dashboard) {
    return <p className="dashboard-loading">Učitavanje podataka…</p>;
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-heading">
        <p className="mentor-eyebrow">Pregled sustava</p>
        <h1 className="dashboard-title">Superadmin</h1>
      </div>

      <div className="admin-summary">
        <article className="dash-card"><span>Korisnici</span><strong>{dashboard.summary.users}</strong></article>
        <article className="dash-card"><span>Prakse</span><strong>{dashboard.summary.internships}</strong></article>
        <article className="dash-card"><span>Zapisi</span><strong>{dashboard.summary.entries}</strong></article>
        <article className="dash-card"><span>Dokumenti</span><strong>{dashboard.summary.documents}</strong></article>
      </div>

      <section className="admin-section">
        <h2>Korisnici</h2>
        <div className="admin-table-wrap">
          <table className="dash-table">
            <thead><tr><th>Ime i prezime</th><th>Email</th><th>Uloga</th><th>Ustanova</th><th>Status</th></tr></thead>
            <tbody>
              {dashboard.users.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>{roleLabels[user.role]}</td>
                  <td>{user.faculty_name || "—"}</td>
                  <td>{user.is_active ? "Aktivan" : "Neaktivan"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Prakse</h2>
        <div className="admin-table-wrap">
          <table className="dash-table">
            <thead><tr><th>Student</th><th>Mentor</th><th>Tvrtka</th><th>Razdoblje</th><th>Sati</th><th>Status</th></tr></thead>
            <tbody>
              {dashboard.internships.length === 0 ? (
                <tr><td colSpan="6">Nema praksi.</td></tr>
              ) : dashboard.internships.map((internship) => (
                <tr key={internship.id}>
                  <td>{internship.student_name}</td>
                  <td>{internship.mentor_name}</td>
                  <td>{internship.company_name}</td>
                  <td>{formatDate(internship.start_date)} – {formatDate(internship.end_date)}</td>
                  <td>{internship.required_hours} h</td>
                  <td>{statusLabels[internship.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Dnevnik rada</h2>
        <div className="admin-table-wrap">
          <table className="dash-table">
            <thead><tr><th>Student</th><th>Datum</th><th>Vrsta</th><th>Sati</th><th>Opis</th></tr></thead>
            <tbody>
              {dashboard.entries.length === 0 ? (
                <tr><td colSpan="5">Nema zapisa.</td></tr>
              ) : dashboard.entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.student_name}</td>
                  <td>{formatDate(entry.entry_date)}</td>
                  <td>{activityLabels[entry.activity_type]}</td>
                  <td>{entry.hours} h</td>
                  <td>{entry.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Dokumenti</h2>
        <div className="admin-table-wrap">
          <table className="dash-table">
            <thead><tr><th>Student</th><th>Status</th><th>Verzija</th><th>Datoteka</th><th>Poslano</th></tr></thead>
            <tbody>
              {dashboard.documents.length === 0 ? (
                <tr><td colSpan="5">Nema dokumenata.</td></tr>
              ) : dashboard.documents.map((document) => (
                <tr key={document.id}>
                  <td>{document.student_name}</td>
                  <td>{statusLabels[document.status]}</td>
                  <td>{document.version_number}</td>
                  <td>{document.file_name || "—"}</td>
                  <td>{formatDate(document.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export default AdminDashboard;
