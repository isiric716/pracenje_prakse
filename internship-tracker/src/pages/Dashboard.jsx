import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const activityLabels = {
  development: "Razvoj",
  testing: "Testiranje",
  documentation: "Dokumentacija",
  other: "Ostalo",
};

function formatDate(value) {
  return value ? value.split("-").reverse().join(".") : "Nije određeno";
}

function Dashboard({ user, onInternshipStatusChange }) {
  const [entries, setEntries] = useState([]);
  const [internship, setInternship] = useState(null);
  const [setupForm, setSetupForm] = useState({
    facultyName: user.facultyName || "",
    companyName: "",
    companyCity: "",
    mentorEmail: "",
    startDate: "",
    endDate: "",
    requiredHours: "",
  });
  const [editForm, setEditForm] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const requestRef = useRef(null);
  const savingRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    requestRef.current = controller;
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

    Promise.all([
      fetch("/entries", { headers, signal: controller.signal }),
      fetch("/internships/current", { headers, signal: controller.signal }),
    ])
      .then(async (responses) => {
        const data = await Promise.all(responses.map((response) => response.json()));
        const failedIndex = responses.findIndex((response) => !response.ok);
        if (failedIndex !== -1) throw new Error(data[failedIndex].error);
        return data;
      })
      .then(([entriesData, internshipData]) => {
        setEntries(entriesData);
        setInternship(internshipData);
        onInternshipStatusChange(internshipData?.status || null);
        if (internshipData?.status === "active") {
          setEditForm({
            startDate: internshipData.start_date,
            endDate: internshipData.end_date || "",
            requiredHours: String(internshipData.required_hours),
          });
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => requestRef.current?.abort();
  }, [onInternshipStatusChange]);

  function updateForm(setter) {
    return (event) => {
      const { name, value } = event.target;
      setter((current) => ({ ...current, [name]: value }));
      setMessage({ type: "", text: "" });
    };
  }

  async function saveRequest(path, method, body) {
    if (savingRef.current) return null;

    const controller = new AbortController();
    requestRef.current = controller;
    savingRef.current = true;
    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (error) {
      if (error.name !== "AbortError") setMessage({ type: "error", text: error.message });
      return null;
    } finally {
      if (!controller.signal.aborted) {
        savingRef.current = false;
        setIsSaving(false);
      }
    }
  }

  async function handleSetup(event) {
    event.preventDefault();
    const data = await saveRequest("/internships", "POST", setupForm);
    if (data) {
      setInternship(data);
      onInternshipStatusChange(data.status);
      setMessage({ type: "success", text: "Poziv je poslan mentoru na potvrdu." });
    }
  }

  async function handleEdit(event) {
    event.preventDefault();
    const data = await saveRequest("/internships/active", "PATCH", {
      ...editForm,
      updatedAt: internship.updated_at,
    });
    if (data) {
      setInternship(data);
      setEditForm({
        startDate: data.start_date,
        endDate: data.end_date || "",
        requiredHours: String(data.required_hours),
      });
      setIsEditing(false);
      setMessage({ type: "success", text: "Podaci o praksi uspješno su spremljeni." });
    }
  }

  function cancelEdit() {
    setEditForm({
      startDate: internship.start_date,
      endDate: internship.end_date || "",
      requiredHours: String(internship.required_hours),
    });
    setIsEditing(false);
    setMessage({ type: "", text: "" });
  }

  function retrySetup() {
    setSetupForm((current) => ({
      ...current,
      companyName: internship.company_name,
      companyCity: internship.company_city,
      mentorEmail: internship.mentor_email,
      startDate: internship.start_date,
      endDate: internship.end_date || "",
      requiredHours: String(internship.required_hours),
    }));
    setInternship(null);
    setMessage({ type: "", text: "" });
  }

  if (isLoading) return <p className="dashboard-loading">Učitavanje dashboarda…</p>;

  if (loadError) {
    return <p className="dashboard-message dashboard-message--error" role="alert">{loadError}</p>;
  }

  if (!internship) {
    return (
      <section className="practice-setup">
        <div className="mentor-heading">
          <p className="mentor-eyebrow">Prvi korak</p>
          <h1>Postavite stručnu praksu</h1>
          <p>Mentor će emailom računa dobiti poziv za povezivanje.</p>
        </div>

        {message.text && <p className={`dashboard-message dashboard-message--${message.type}`} role="alert">{message.text}</p>}

        <form className="practice-setup-form" onSubmit={handleSetup}>
          <label>
            Fakultet / visoko učilište <span>nije obavezno</span>
            <input name="facultyName" value={setupForm.facultyName} onChange={updateForm(setSetupForm)} placeholder="Npr. FERIT" />
          </label>
          <label>
            Tvrtka / ustanova
            <input name="companyName" value={setupForm.companyName} onChange={updateForm(setSetupForm)} required />
          </label>
          <label>
            Grad
            <input name="companyCity" value={setupForm.companyCity} onChange={updateForm(setSetupForm)} required />
          </label>
          <label>
            Email mentora
            <input type="email" name="mentorEmail" value={setupForm.mentorEmail} onChange={updateForm(setSetupForm)} required />
          </label>
          <label>
            Početak prakse
            <input type="date" name="startDate" value={setupForm.startDate} onChange={updateForm(setSetupForm)} required />
          </label>
          <label>
            Završetak prakse <span>nije obavezno</span>
            <input type="date" name="endDate" min={setupForm.startDate} value={setupForm.endDate} onChange={updateForm(setSetupForm)} />
          </label>
          <label>
            Ukupan broj sati
            <input type="number" name="requiredHours" min="1" step="0.5" value={setupForm.requiredHours} onChange={updateForm(setSetupForm)} required />
          </label>
          <button type="submit" disabled={isSaving}>{isSaving ? "Slanje…" : "Pošalji poziv mentoru"}</button>
        </form>
      </section>
    );
  }

  if (internship.status === "planned") {
    return (
      <section className="practice-pending">
        <span className="practice-pending-icon">✓</span>
        <p className="mentor-eyebrow">Poziv poslan</p>
        <h1>Čeka se potvrda mentora</h1>
        <p>
          Poziv za praksu u <strong>{internship.company_name}</strong> poslan je na{" "}
          <strong>{internship.mentor_email}</strong>.
        </p>
        <dl className="internship-details">
          <div><dt>Početak</dt><dd>{formatDate(internship.start_date)}</dd></div>
          <div><dt>Završetak</dt><dd>{formatDate(internship.end_date)}</dd></div>
          <div><dt>Potrebni sati</dt><dd>{internship.required_hours} h</dd></div>
        </dl>
        <button type="button" onClick={() => window.location.reload()}>Provjeri status</button>
      </section>
    );
  }

  if (internship.status === "cancelled") {
    return (
      <section className="practice-pending practice-pending--rejected">
        <p className="mentor-eyebrow">Poziv odbijen</p>
        <h1>Mentor nije prihvatio poziv</h1>
        <p>Provjerite email adresu mentora ili pošaljite poziv drugoj osobi.</p>
        <button type="button" onClick={retrySetup}>Uredi i pošalji novi poziv</button>
      </section>
    );
  }

  const completedHours = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
  const remainingHours = Math.max(internship.required_hours - completedHours, 0);
  const progress = Math.min(Math.round((completedHours / internship.required_hours) * 100), 100);
  const activityHours = Object.fromEntries(Object.keys(activityLabels).map((key) => [key, 0]));
  entries.forEach((entry) => { activityHours[entry.activity_type] += Number(entry.hours); });

  return (
    <section className="dashboard">
      <h1 className="dashboard-title">Dashboard</h1>
      {message.text && <p className={`dashboard-message dashboard-message--${message.type}`} role="status">{message.text}</p>}

      <section className="internship-card" aria-labelledby="internship-title">
        <div className="internship-card-heading">
          <div><p>Aktivna praksa</p><h2 id="internship-title">{internship.company_name}</h2></div>
          {!isEditing && <button type="button" onClick={() => setIsEditing(true)}>Uredi podatke</button>}
        </div>
        {isEditing ? (
          <form className="internship-form internship-form--compact" onSubmit={handleEdit}>
            <label>Početak prakse<input type="date" name="startDate" value={editForm.startDate} onChange={updateForm(setEditForm)} required /></label>
            <label>Završetak prakse <span>nije obavezno</span><input type="date" name="endDate" min={editForm.startDate} value={editForm.endDate} onChange={updateForm(setEditForm)} /></label>
            <label>Potrebni sati<input type="number" name="requiredHours" min="1" step="0.5" value={editForm.requiredHours} onChange={updateForm(setEditForm)} required /></label>
            <div className="internship-form-actions">
              <button type="button" onClick={cancelEdit} disabled={isSaving}>Odustani</button>
              <button type="submit" disabled={isSaving}>{isSaving ? "Spremanje…" : "Spremi"}</button>
            </div>
          </form>
        ) : (
          <dl className="internship-details">
            <div><dt>Mentor</dt><dd>{internship.mentor_name}</dd></div>
            <div><dt>Razdoblje</dt><dd>{formatDate(internship.start_date)} – {formatDate(internship.end_date)}</dd></div>
            <div><dt>Potrebni sati</dt><dd>{internship.required_hours} h</dd></div>
            <div><dt>Status</dt><dd>Aktivna</dd></div>
          </dl>
        )}
      </section>

      <div className="dash-cards">
        <div className="dash-card"><span className="dash-card-label">Ukupno sati</span><span className="dash-card-value">{internship.required_hours} h</span></div>
        <div className="dash-card"><span className="dash-card-label">Odrađeno sati</span><span className="dash-card-value">{completedHours} h</span><div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></div>
        <div className="dash-card"><span className="dash-card-label">Preostalo sati</span><span className="dash-card-value">{remainingHours} h</span></div>
        <div className="dash-card"><span className="dash-card-label">Status</span><span className="dash-card-value dash-card-status">{progress === 100 ? "Završeno" : "U tijeku"}</span></div>
      </div>

      <div className="dash-chart-card">
        <h3>Aktivnosti</h3>
        <div className="activity-summary">
          {Object.entries(activityHours).map(([type, hours]) => (
            <div key={type} className="activity-summary-item"><span>{activityLabels[type]}</span><strong>{hours} h</strong></div>
          ))}
        </div>
      </div>

      <div className="dash-recent">
        <div className="dash-recent-header"><h3>Zadnji unosi</h3><button className="btn-add" type="button" onClick={() => navigate("/diary")}>+ Dodaj zapis</button></div>
        {entries.length === 0 ? (
          <div className="dashboard-empty"><p>Još nema zapisa u dnevniku.</p><button type="button" onClick={() => navigate("/diary")}>Dodaj prvi zapis</button></div>
        ) : (
          <table className="dash-table">
            <thead><tr><th>Datum</th><th>Vrsta</th><th>Sati</th><th>Opis</th></tr></thead>
            <tbody>{entries.slice(0, 5).map((entry) => <tr key={entry.id}><td>{formatDate(entry.entry_date)}</td><td>{activityLabels[entry.activity_type]}</td><td>{entry.hours} h</td><td>{entry.description}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default Dashboard;
