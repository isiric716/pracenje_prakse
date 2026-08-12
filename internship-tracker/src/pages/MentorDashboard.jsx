import { useEffect, useRef, useState } from "react";

const API_URL = "http://localhost:3001";

const internshipStatuses = {
  planned: "Planirana",
  active: "Aktivna",
  completed: "Završena",
  cancelled: "Otkazana",
};

const documentStatuses = {
  pending: "Čeka pregled",
  approved: "Odobren",
  rejected: "Vraćen na doradu",
};

function formatDate(value) {
  return value.slice(0, 10).split("-").reverse().join(".");
}

function MentorDashboard() {
  const [dashboard, setDashboard] = useState({ students: [], documents: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [actionDocumentId, setActionDocumentId] = useState(null);
  const [error, setError] = useState("");
  const decisionRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_URL}/mentor/dashboard`, {
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
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  async function handleDownload(id, fileName) {
    setError("");

    try {
      const response = await fetch(`${API_URL}/mentor/documents/${id}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message);
    }
  }

  async function handleDecision(documentId, decision) {
    if (decisionRef.current) return;

    const comment = decision === "reject"
      ? window.prompt("Unesite razlog vraćanja dokumenta na doradu:")
      : null;

    if (decision === "reject" && !comment?.trim()) return;

    decisionRef.current = true;
    setActionDocumentId(documentId);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/mentor/documents/${documentId}/${decision}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: decision === "reject" ? JSON.stringify({ comment }) : undefined,
        }
      );
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setDashboard((current) => ({
        ...current,
        documents: current.documents.map((documentItem) =>
          documentItem.id === documentId
            ? { ...documentItem, ...data }
            : documentItem
        ),
      }));
    } catch (decisionError) {
      setError(decisionError.message);
    } finally {
      decisionRef.current = false;
      setActionDocumentId(null);
    }
  }

  if (isLoading) {
    return <p className="mentor-loading">Učitavanje mentor dashboarda…</p>;
  }

  return (
    <section className="mentor-dashboard">
      <div className="mentor-heading">
        <p className="mentor-eyebrow">Mentor</p>
        <h1>Pregled stručne prakse</h1>
        <p>Pratite dodijeljene studente i pregledajte njihove dokumente.</p>
      </div>

      {error && <p className="mentor-error" role="alert">{error}</p>}

      <section className="mentor-panel" aria-labelledby="students-title">
        <div className="mentor-panel-heading">
          <div>
            <h2 id="students-title">Dodijeljeni studenti</h2>
            <p>{dashboard.students.length} ukupno</p>
          </div>
        </div>

        {dashboard.students.length === 0 ? (
          <div className="mentor-empty">
            <h3>Nema dodijeljenih studenata</h3>
            <p>Studenti će se prikazati nakon što odaberu vas kao mentora.</p>
          </div>
        ) : (
          <div className="mentor-table-wrap">
            <table className="mentor-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Kompanija</th>
                  <th>Razdoblje</th>
                  <th>Napredak</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.students.map((student) => {
                  const progress = Math.min(
                    100,
                    Math.round((student.completed_hours / student.required_hours) * 100)
                  );

                  return (
                    <tr key={student.id}>
                      <td>
                        <strong>{student.full_name}</strong>
                        <span>{student.email}</span>
                      </td>
                      <td>{student.company_name}</td>
                      <td>{formatDate(student.start_date)} – {formatDate(student.end_date)}</td>
                      <td>
                        <div className="mentor-progress-label">
                          <span>{student.completed_hours} / {student.required_hours} h</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="mentor-progress-track">
                          <span style={{ width: `${progress}%` }} />
                        </div>
                      </td>
                      <td>
                        <span className={`mentor-status mentor-status--${student.status}`}>
                          {internshipStatuses[student.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mentor-panel" aria-labelledby="documents-title">
        <div className="mentor-panel-heading">
          <div>
            <h2 id="documents-title">Predani dokumenti</h2>
            <p>{dashboard.documents.length} ukupno</p>
          </div>
        </div>

        {dashboard.documents.length === 0 ? (
          <div className="mentor-empty">
            <h3>Nema predanih dokumenata</h3>
            <p>Dokumenti će se prikazati kada ih student pošalje na pregled.</p>
          </div>
        ) : (
          <div className="mentor-table-wrap">
            <table className="mentor-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Verzija</th>
                  <th>Status</th>
                  <th>Datum predaje</th>
                  <th>Komentar</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.documents.map((documentItem) => (
                  <tr key={documentItem.id}>
                    <td>
                      <strong>{documentItem.student_name}</strong>
                      <span>{documentItem.student_email}</span>
                    </td>
                    <td>v{documentItem.version_number}</td>
                    <td>
                      <span className={`mentor-status mentor-status--${documentItem.status}`}>
                        {documentStatuses[documentItem.status]}
                      </span>
                    </td>
                    <td>{formatDate(documentItem.submitted_at)}</td>
                    <td>{documentItem.mentor_comment || "Bez komentara"}</td>
                    <td>
                      <div className="mentor-actions">
                        <button type="button" onClick={() => handleDownload(documentItem.id, documentItem.file_name)}>
                          Preuzmi
                        </button>
                        {documentItem.status === "pending" && (
                          <>
                            <button
                              className="mentor-approve"
                              type="button"
                              disabled={actionDocumentId !== null}
                              onClick={() => handleDecision(documentItem.id, "approve")}
                            >
                              Odobri
                            </button>
                            <button
                              className="mentor-reject"
                              type="button"
                              disabled={actionDocumentId !== null}
                              onClick={() => handleDecision(documentItem.id, "reject")}
                            >
                              Vrati
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

export default MentorDashboard;
