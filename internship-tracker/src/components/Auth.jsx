import "./Auth.css";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3001";

function Auth({ mode, onClose, onSwitchMode, onLogin }) {
  const isRegister = mode === "register";
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;

    if (isRegister && form.fullName.trim().split(/\s+/).length < 2) {
      setError("Unesite ime i prezime.");
      return;
    }

    if (isRegister && form.password.length < 8) {
      setError("Lozinka mora imati najmanje 8 znakova.");
      return;
    }

    if (isRegister && form.password !== form.confirmPassword) {
      setError("Lozinke se ne podudaraju.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister
            ? {
                fullName: form.fullName,
                email: form.email,
                password: form.password,
                role: form.role,
              }
            : { email: form.email, password: form.password }
        ),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      localStorage.setItem("token", data.token);
      onLogin(data.user);
      navigate(data.user.role === "mentor" ? "/mentor" : "/dashboard");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Zatvori">×</button>

        <div className="auth-header">
          <div className="auth-icon" aria-hidden="true">🎓</div>
          <h2 id="auth-title">{isRegister ? "Registracija" : "Prijava"}</h2>
          <p>{isRegister ? "Kreirajte račun. Podatke o praksi unosite nakon prijave." : "Prijavite se za nastavak rada."}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="fullName">Ime i prezime</label>
              <input id="fullName" name="fullName" autoComplete="name" value={form.fullName} onChange={handleChange} required />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email" autoComplete="email" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Lozinka</label>
            <input id="password" type="password" name="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 8 : undefined} value={form.password} onChange={handleChange} required />
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label htmlFor="confirmPassword">Ponovite lozinku</label>
                <input id="confirmPassword" type="password" name="confirmPassword" autoComplete="new-password" minLength="8" value={form.confirmPassword} onChange={handleChange} required />
              </div>

              <fieldset className="form-group role-fieldset">
                <legend>Uloga</legend>
                <div className="role-options">
                  <label><input type="radio" name="role" value="student" checked={form.role === "student"} onChange={handleChange} />Student</label>
                  <label><input type="radio" name="role" value="mentor" checked={form.role === "mentor"} onChange={handleChange} />Mentor</label>
                </div>
              </fieldset>
            </>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Spremanje…" : isRegister ? "Registriraj se" : "Prijavi se"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Već imate račun?" : "Nemate račun?"}{" "}
          <button type="button" onClick={() => onSwitchMode(isRegister ? "login" : "register")}>
            {isRegister ? "Prijavite se" : "Registrirajte se"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;
