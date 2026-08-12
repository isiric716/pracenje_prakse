import { useEffect, useRef, useState } from "react";

const API_URL = "http://localhost:3001";

function Settings({ user, onUserUpdate }) {
  const [formData, setFormData] = useState({
    fullName: user.fullName,
    email: user.email,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const requestRef = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => () => requestRef.current?.abort(), []);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setMessage({ type: "", text: "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submittingRef.current) return;

    const changesPassword = Boolean(
      formData.currentPassword ||
      formData.newPassword ||
      formData.confirmPassword
    );

    if (formData.fullName.trim().split(/\s+/).length < 2) {
      setMessage({ type: "error", text: "Unesite ime i prezime." });
      return;
    }

    if (changesPassword) {
      if (!formData.currentPassword || formData.newPassword.length < 8) {
        setMessage({
          type: "error",
          text: "Unesite trenutnu lozinku i novu lozinku od najmanje 8 znakova.",
        });
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: "error", text: "Nove lozinke se ne podudaraju." });
        return;
      }
    }

    const profileChanged =
      formData.fullName.trim() !== user.fullName ||
      formData.email.trim().toLowerCase() !== user.email.toLowerCase();

    if (!profileChanged && !changesPassword) {
      setMessage({ type: "error", text: "Nema promjena za spremanje." });
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    submittingRef.current = true;
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch(`${API_URL}/users/current`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      onUserUpdate(data.user);
      setFormData((current) => ({
        ...current,
        fullName: data.user.fullName,
        email: data.user.email,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setMessage({ type: "success", text: data.message });
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessage({ type: "error", text: error.message });
      }
    } finally {
      if (!controller.signal.aborted) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  }

  return (
    <section className="settings-page">
      <div className="settings-heading">
        <p className="settings-eyebrow">Račun</p>
        <h1>Postavke profila</h1>
        <p>Ažurirajte osobne podatke ili promijenite lozinku.</p>
      </div>

      <form className="settings-card" onSubmit={handleSubmit}>
        <div className="settings-section">
          <div>
            <h2>Osobni podaci</h2>
            <p>Ovi podaci prikazuju se na vašem profilu.</p>
          </div>
          <div className="settings-fields">
            <label>
              Ime i prezime
              <input name="fullName" value={formData.fullName} onChange={handleChange} autoComplete="name" required />
            </label>
            <label>
              Email
              <input type="email" name="email" value={formData.email} onChange={handleChange} autoComplete="email" required />
            </label>
            <label>
              Uloga
              <input value={user.role === "mentor" ? "Mentor" : "Student"} disabled />
            </label>
          </div>
        </div>

        <div className="settings-divider" />

        <div className="settings-section">
          <div>
            <h2>Promjena lozinke</h2>
            <p>Ostavite prazno ako ne želite promijeniti lozinku.</p>
          </div>
          <div className="settings-fields">
            <label>
              Trenutna lozinka
              <input type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} autoComplete="current-password" />
            </label>
            <label>
              Nova lozinka
              <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} autoComplete="new-password" minLength="8" />
            </label>
            <label>
              Ponovite novu lozinku
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" minLength="8" />
            </label>
          </div>
        </div>

        {message.text && (
          <p className={`settings-message settings-message--${message.type}`} role="status">
            {message.text}
          </p>
        )}

        <div className="settings-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Spremanje…" : "Spremi promjene"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default Settings;
