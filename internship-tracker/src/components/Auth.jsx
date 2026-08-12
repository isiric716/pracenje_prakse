import "./Auth.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3001";

const initialFormData = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  facultyId: "",
  companyId: "",
  mentorId: "",
  requiredHours: "",
  startDate: "",
  endDate: "",
};

function Auth({ mode, onClose, onSwitchMode, onLogin }) {
  const isRegister = mode === "register";
  const [role, setRole] = useState("student");
  const [formData, setFormData] = useState(initialFormData);
  const [options, setOptions] = useState({ faculties: [], companies: [], mentors: [] });
  const [isLoadingOptions, setIsLoadingOptions] = useState(isRegister);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!isRegister) return;

    const controller = new AbortController();
    fetch(`${API_URL}/registration-options`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Podaci za registraciju nisu dostupni.");

        setOptions(data);
        setFormData((current) => ({
          ...current,
          facultyId: current.facultyId || String(data.faculties[0]?.id || ""),
          companyId: current.companyId || String(data.companies[0]?.id || ""),
          mentorId: current.mentorId || String(data.mentors[0]?.id || ""),
        }));
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") setError(fetchError.message);
      })
      .finally(() => setIsLoadingOptions(false));

    return () => controller.abort();
  }, [isRegister]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function finishAuthentication(data) {
    localStorage.setItem("token", data.token);
    onLogin(data.user);
    navigate(data.user.role === "mentor" ? "/mentor" : "/dashboard");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!formData.email.trim() || !formData.password) {
      setError("Email i lozinka su obavezni.");
      return;
    }

    if (isRegister) {
      if (!formData.fullName.trim()) {
        setError("Ime i prezime su obavezni.");
        return;
      }
      if (formData.password.length < 8) {
        setError("Lozinka mora imati najmanje 8 znakova.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Lozinke se ne podudaraju.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const registrationData = {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role,
        facultyId: formData.facultyId,
        companyId: formData.companyId,
        mentorId: formData.mentorId,
        requiredHours: formData.requiredHours,
        startDate: formData.startDate,
        endDate: formData.endDate,
      };
      const response = await fetch(`${API_URL}/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? registrationData : {
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Zahtjev nije uspio.");
      finishAuthentication(data);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Zatvori">×</button>

        <div className="auth-header">
          <div className="auth-icon" aria-hidden="true">🎓</div>
          <h2 id="auth-title">{isRegister ? "Registracija" : "Prijava"}</h2>
          <p>{isRegister ? "Kreiraj račun za praćenje stručne prakse." : "Prijavi se za nastavak rada."}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="fullName">Ime i prezime</label>
              <input id="fullName" type="text" name="fullName" autoComplete="name" placeholder="Ivona Širić" value={formData.fullName} onChange={handleChange} required />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email" autoComplete="email" placeholder="ime.prezime@fakultet.hr" value={formData.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Lozinka</label>
            <input id="password" type="password" name="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 8 : undefined} placeholder={isRegister ? "Najmanje 8 znakova" : "Unesite lozinku"} value={formData.password} onChange={handleChange} required />
          </div>

          {isRegister && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Ponovi lozinku</label>
              <input id="confirmPassword" type="password" name="confirmPassword" autoComplete="new-password" placeholder="Ponovite lozinku" value={formData.confirmPassword} onChange={handleChange} required />
            </div>
          )}

          {isRegister && (
            <>
              <fieldset className="form-group role-fieldset">
                <legend>Uloga</legend>
                <div className="role-options">
                  <label><input type="radio" name="role" value="student" checked={role === "student"} onChange={(event) => { setRole(event.target.value); setError(""); }} />Student</label>
                  <label><input type="radio" name="role" value="mentor" checked={role === "mentor"} onChange={(event) => { setRole(event.target.value); setError(""); }} />Mentor</label>
                </div>
              </fieldset>

              {isLoadingOptions ? (
                <p className="auth-options-status">Učitavanje podataka…</p>
              ) : role === "student" ? (
                <>
                  <div className="form-group">
                    <label htmlFor="facultyId">Fakultet</label>
                    <select id="facultyId" name="facultyId" value={formData.facultyId} onChange={handleChange} required>
                      <option value="" disabled>Odaberite fakultet</option>
                      {options.faculties.map((faculty) => <option key={faculty.id} value={faculty.id}>{faculty.name} — {faculty.city}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="mentorId">Mentor</label>
                    <select id="mentorId" name="mentorId" value={formData.mentorId} onChange={handleChange} required>
                      <option value="" disabled>Odaberite mentora</option>
                      {options.mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.full_name} — {mentor.company_name}</option>)}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="startDate">Početak prakse</label>
                      <input id="startDate" type="date" name="startDate" value={formData.startDate} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="endDate">Završetak prakse</label>
                      <input id="endDate" type="date" name="endDate" min={formData.startDate || undefined} value={formData.endDate} onChange={handleChange} required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="requiredHours">Ukupan broj sati prakse</label>
                    <input id="requiredHours" type="number" name="requiredHours" min="1" step="0.5" placeholder="300" value={formData.requiredHours} onChange={handleChange} required />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label htmlFor="companyId">Kompanija</label>
                  <select id="companyId" name="companyId" value={formData.companyId} onChange={handleChange} required>
                    <option value="" disabled>Odaberite kompaniju</option>
                    {options.companies.map((company) => <option key={company.id} value={company.id}>{company.name} — {company.city}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="auth-submit" disabled={isSubmitting || (isRegister && isLoadingOptions)}>
            {isSubmitting ? "Spremanje…" : isRegister ? "Registriraj se" : "Prijavi se"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Već imaš račun?" : "Nemaš račun?"}{" "}
          <button type="button" onClick={() => onSwitchMode(isRegister ? "login" : "register")}>
            {isRegister ? "Prijavi se" : "Registriraj se"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;
