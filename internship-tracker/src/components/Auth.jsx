import "./Auth.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Auth({ mode, onClose, onSwitchMode, onLogin }) {
  const isRegister = mode === "register";
  const [role, setRole] = useState("student");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    hours: "",
    mentorId: "1",
  });

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit() {
  if (isRegister) {
    alert("Registraciju još nismo povezali s bazom.");
    return;
    }

    if (!formData.email || !formData.password) {
      alert("Email i lozinka su obavezni!");
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      localStorage.setItem("token", data.token);

      onLogin(data.user);

      if (data.user.role === "student") {
        navigate("/dashboard");
        return;
      }

      if (data.user.role === "mentor") {
        navigate("/mentor");
        return;
      }

      throw new Error("Za ovu korisničku ulogu još ne postoji sučelje.");
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="auth-modal">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="auth-header">
          <div className="auth-icon">🎓</div>
          <h2>{isRegister ? "Registracija" : "Prijava"}</h2>
          <p>
            {isRegister
              ? "Kreiraj račun za praćenje stručne prakse."
              : "Prijavi se za nastavak rada."}
          </p>
        </div>

        <form className="auth-form">
          {isRegister && (
            <div className="form-group">
              <label>Ime i prezime</label>
              <input
                type="text"
                name="fullName"
                placeholder="Ivona Širić"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="ime.prezime@fakultet.hr"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Lozinka</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label>Uloga</label>

                <div className="role-options">
                  <label>
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={role === "student"}
                      onChange={() => setRole("student")}
                    />
                    Student
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="role"
                      value="mentor"
                      checked={role === "mentor"}
                      onChange={() => setRole("mentor")}
                    />
                    Mentor
                  </label>
                </div>
              </div>

              {role === "student" && (
                <>
                  <div className="form-group">
                    <label>Mentor</label>
                    <select
                      name="mentorId"
                      value={formData.mentorId}
                      onChange={handleChange}
                    >
                      <option value="1">Mentor 1</option>
                      <option value="2">Mentor 2</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Ukupan broj sati prakse</label>
                    <input
                      type="number"
                      name="hours"
                      placeholder="80"
                      value={formData.hours}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}
            </>
          )}

          <button type="button" className="auth-submit" onClick={handleSubmit}>
            {isRegister ? "Registriraj se" : "Prijavi se"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Već imaš račun?" : "Nemaš račun?"}{" "}
          <span onClick={() => onSwitchMode(isRegister ? "login" : "register")}>
            {isRegister ? "Prijavi se" : "Registriraj se"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Auth;