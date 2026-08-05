import { useEffect, useState } from "react";

function Export({ user }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [docInfo, setDocInfo] = useState({
    indexNumber: "",
    study: "",
    year: "",
    companyName: "",
    mentor: "",
    mentorEmail: "",
    mentorPhone: "",
    teacherName: "",
    teacherEmail: "",
    teacherPhone: "",
    startDate: "",
    endDate: "",
    taskDescription: "",
    conclusion: "",
  });

  useEffect(() => {
    fetch("http://localhost:3001/entries")
      .then((res) => res.json())
      .then(setEntries);
  }, []);

  const handleChange = (e) => {
    setDocInfo({ ...docInfo, [e.target.name]: e.target.value });
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/generate-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student: { fullName: docInfo.fullName || user?.fullName || "" },
          docInfo,
          studentId: 1,
        }),
      });

      if (!res.ok) throw new Error("Greška");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Dnevnik_strucne_prakse.docx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Greška pri generiranju dokumenta!");
    } finally {
      setLoading(false);
    }
  };

  const totalHours = entries
    .filter((e) => e.status === "approved")
    .reduce((sum, e) => sum + Number(e.hours), 0);

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  return (
    <div className="export-layout">
      {/* Lijevo - forma */}
      <div className="export-form-col">
        <h1 className="dashboard-title">Izvoz</h1>

        <div className="export-section">
          <h3 className="export-section-title">Podaci o studentu</h3>
          <div className="doc-form">
            <div className="doc-field">
              <label>Ime i prezime</label>
            <input
            type="text"
            name="fullName"
            placeholder="Ivona Širić"
            value={docInfo.fullName || user?.fullName || ""}
            onChange={handleChange}
            />
            </div>
            <div className="doc-field">
              <label>Broj indeksa</label>
              <input type="text" name="indexNumber" placeholder="123456" value={docInfo.indexNumber} onChange={handleChange} />
            </div>
            <div className="doc-field">
              <label>Studij i modul</label>
              <input type="text" name="study" placeholder="Primijenjena matematika i informatika" value={docInfo.study} onChange={handleChange} />
            </div>
            <div className="doc-field">
              <label>Godina studiranja</label>
              <input type="text" name="year" placeholder="3" value={docInfo.year} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="export-section">
          <h3 className="export-section-title">Podaci o tvrtki</h3>
          <div className="doc-form">
            <div className="doc-field">
              <label>Naziv tvrtke / ustanove</label>
              <input type="text" name="companyName" placeholder="MathOS d.o.o." value={docInfo.companyName} onChange={handleChange} />
            </div>
            <div className="doc-field">
              <label>Voditelj prakse (ime i prezime)</label>
              <input type="text" name="mentor" placeholder="Marko Horvat" value={docInfo.mentor} onChange={handleChange} />
            </div>
            <div className="doc-field">
              <label>E-mail voditelja</label>
              <input type="email" name="mentorEmail" placeholder="voditelj@tvrtka.hr" value={docInfo.mentorEmail} onChange={handleChange} />
            </div>
            <div className="doc-field">
              <label>Telefon voditelja</label>
              <input type="text" name="mentorPhone" placeholder="099 123 456" value={docInfo.mentorPhone} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="export-section">
          <h3 className="export-section-title">Nastavnik fakulteta</h3>
          <div className="doc-form">
            <div className="doc-field">
              <label>Ime i prezime</label>
              <input type="text" name="teacherName" placeholder="Prof. Pero Perić" value={docInfo.teacherName} onChange={handleChange} />
            </div>
            <div className="doc-field">
              <label>E-mail</label>
              <input type="email" name="teacherEmail" placeholder="pero@mathos.hr" value={docInfo.teacherEmail} onChange={handleChange} />
            </div>
            <div className="doc-field">
              <label>Telefon</label>
              <input type="text" name="teacherPhone" placeholder="031 224 800" value={docInfo.teacherPhone} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="export-section">
          <h3 className="export-section-title">Podaci o praksi</h3>
          <div className="doc-form">
            <div className="doc-field">
              <label>Datum početka</label>
              <input type="text" name="startDate" placeholder="01.04.2024." value={docInfo.startDate} onChange={handleChange} />
            </div>
            <div className="doc-field">
              <label>Datum završetka</label>
              <input type="text" name="endDate" placeholder="31.05.2024." value={docInfo.endDate} onChange={handleChange} />
            </div>
            <div className="doc-field">
              <label>Kratki opis radnih zadataka</label>
              <textarea name="taskDescription" rows={3} placeholder="Razvoj web aplikacije..." value={docInfo.taskDescription} onChange={handleChange} />
            </div>
            <div className="doc-field">
              <label>Zaključak i mišljenje o praksi</label>
              <textarea name="conclusion" rows={4} placeholder="Stručna praksa bila je..." value={docInfo.conclusion} onChange={handleChange} />
            </div>
          </div>
        </div>

        <button className="btn-generate" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generiranje..." : "⬇ Generiraj dokument (.docx)"}
        </button>
      </div>

      {/* Desno - preview */}
      <div className="export-preview-col">
        <h3 className="export-section-title">Pregled unosa</h3>
        <div className="export-preview">
          <div className="preview-header">
            <p><strong>EVIDENCIJA STRUČNE PRAKSE</strong></p>
            <p><strong>DNEVNIK PRAKSE</strong></p>
            <hr />
            <p><strong>Student:</strong> {user?.fullName || "—"}</p>
            <p><strong>Broj indeksa:</strong> {docInfo.indexNumber || "—"}</p>
            <p><strong>Studij:</strong> {docInfo.study || "—"}</p>
            <p><strong>Tvrtka:</strong> {docInfo.companyName || "—"}</p>
            <p><strong>Mentor:</strong> {docInfo.mentor || "—"}</p>
            <p><strong>Period prakse:</strong> {docInfo.startDate || "—"} – {docInfo.endDate || "—"}</p>
            <hr />
            <p><strong>Ukupno odrađeno sati: {totalHours} h</strong></p>
            <hr />
          </div>
          <div className="preview-entries">
            {sortedEntries.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>Nema unosa u dnevniku.</p>
            ) : (
              sortedEntries.map((e, i) => (
                <div key={e.id} className="preview-entry">
                  <p className="preview-entry-day"><strong>Dan {i + 1} – {e.date} ({e.hours}h)</strong></p>
                  <p className="preview-entry-desc">{e.description}</p>
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