import { useEffect, useState } from "react";

function Export({ user }) {
  const [entries, setEntries] = useState([]);
  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(false);

  const [docInfo, setDocInfo] = useState({
    indexNumber: "",
    study: "",
    year: "",
    mentorPhone: "",
    teacherName: "",
    teacherEmail: "",
    teacherPhone: "",
    taskDescription: "",
    conclusion: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:3001/entries"),
      fetch("http://localhost:3001/internships/active"),
    ]).then(async ([entriesResponse, internshipResponse]) => {
      if (!entriesResponse.ok) {
        throw new Error("Nije moguće dohvatiti zapise.");
      }

      if (!internshipResponse.ok) {
        throw new Error("Nije moguće dohvatiti aktivnu praksu.");
      }

      const entriesData = await entriesResponse.json();
      const internshipData = await internshipResponse.json();

      setEntries(entriesData);
      setInternship(internshipData);
    });
  }, []);

  const handleChange = (e) => {
    setDocInfo({
      ...docInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handleGenerate = async () => {
  setLoading(true);

  try {
    const response = await fetch("http://localhost:3001/documents/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        docInfo,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    alert(
      `Dokument je poslan mentoru. Verzija dokumenta: ${data.version_number}`
    );
      } catch (error) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    };

  const totalHours = entries.reduce(
    (sum, entry) => sum + Number(entry.hours),
    0
  );

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.entry_date) - new Date(b.entry_date)
  );

  return (
    <div className="export-layout">
      <div className="export-form-col">
        <h1 className="dashboard-title">Izvoz</h1>

        <div className="export-section">
          <h3 className="export-section-title">Podaci o studentu</h3>

          <div className="doc-form">
            <div className="doc-field">
              <label>Ime i prezime</label>
              <input
                type="text"
                value={user?.fullName || ""}
                readOnly
              />
            </div>

            <div className="doc-field">
              <label>Broj indeksa</label>
              <input
                type="text"
                name="indexNumber"
                value={docInfo.indexNumber}
                onChange={handleChange}
              />
            </div>

            <div className="doc-field">
              <label>Studij i modul</label>
              <input
                type="text"
                name="study"
                value={docInfo.study}
                onChange={handleChange}
              />
            </div>

            <div className="doc-field">
              <label>Godina studiranja</label>
              <input
                type="text"
                name="year"
                value={docInfo.year}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="export-section">
          <h3 className="export-section-title">Podaci o tvrtki</h3>

          <div className="doc-form">
            <div className="doc-field">
              <label>Naziv tvrtke / ustanove</label>
              <input
                type="text"
                value={internship?.company_name || ""}
                readOnly
              />
            </div>

            <div className="doc-field">
              <label>Voditelj prakse</label>
              <input
                type="text"
                value={internship?.mentor_name || ""}
                readOnly
              />
            </div>

            <div className="doc-field">
              <label>Telefon voditelja</label>
              <input
                type="text"
                name="mentorPhone"
                value={docInfo.mentorPhone}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="export-section">
          <h3 className="export-section-title">Nastavnik fakulteta</h3>

          <div className="doc-form">
            <div className="doc-field">
              <label>Ime i prezime</label>
              <input
                type="text"
                name="teacherName"
                value={docInfo.teacherName}
                onChange={handleChange}
              />
            </div>

            <div className="doc-field">
              <label>E-mail</label>
              <input
                type="email"
                name="teacherEmail"
                value={docInfo.teacherEmail}
                onChange={handleChange}
              />
            </div>

            <div className="doc-field">
              <label>Telefon</label>
              <input
                type="text"
                name="teacherPhone"
                value={docInfo.teacherPhone}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="export-section">
          <h3 className="export-section-title">Podaci o praksi</h3>

          <div className="doc-form">
            <div className="doc-field">
              <label>Datum početka</label>
              <input
                type="date"
                value={internship?.start_date || ""}
                readOnly
              />
            </div>

            <div className="doc-field">
              <label>Datum završetka</label>
              <input
                type="date"
                value={internship?.end_date || ""}
                readOnly
              />
            </div>

            <div className="doc-field">
              <label>Kratki opis radnih zadataka</label>
              <textarea
                name="taskDescription"
                rows={3}
                value={docInfo.taskDescription}
                onChange={handleChange}
              />
            </div>

            <div className="doc-field">
              <label>Zaključak i mišljenje o praksi</label>
              <textarea
                name="conclusion"
                rows={4}
                value={docInfo.conclusion}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <button
          className="btn-generate"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generiranje..." : "⬇ Generiraj dokument (.docx)"}
        </button>
      </div>

      <div className="export-preview-col">
        <h3 className="export-section-title">Pregled unosa</h3>

        <div className="export-preview">
          <div className="preview-header">
            <p>
              <strong>EVIDENCIJA STRUČNE PRAKSE</strong>
            </p>

            <p>
              <strong>DNEVNIK PRAKSE</strong>
            </p>

            <hr />

            <p>
              <strong>Student:</strong> {user?.fullName || "—"}
            </p>

            <p>
              <strong>Broj indeksa:</strong>{" "}
              {docInfo.indexNumber || "—"}
            </p>

            <p>
              <strong>Studij:</strong> {docInfo.study || "—"}
            </p>

            <p>
              <strong>Tvrtka:</strong>{" "}
              {internship?.company_name || "—"}
            </p>

            <p>
              <strong>Mentor:</strong>{" "}
              {internship?.mentor_name || "—"}
            </p>

            <p>
              <strong>Period prakse:</strong>{" "}
              {internship?.start_date || "—"} –{" "}
              {internship?.end_date || "—"}
            </p>

            <hr />

            <p>
              <strong>Ukupno odrađeno sati: {totalHours} h</strong>
            </p>

            <hr />
          </div>

          <div className="preview-entries">
            {sortedEntries.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>
                Nema unosa u dnevniku.
              </p>
            ) : (
              sortedEntries.map((entry, index) => (
                <div key={entry.id} className="preview-entry">
                  <p className="preview-entry-day">
                    <strong>
                      Dan {index + 1} – {entry.entry_date} ({entry.hours}h)
                    </strong>
                  </p>

                  <p className="preview-entry-desc">
                    {entry.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Export;