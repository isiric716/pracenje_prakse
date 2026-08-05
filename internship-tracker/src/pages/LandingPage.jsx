import { useState } from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Prednosti from "../components/Prednosti";
import Auth from "../components/Auth";

function LandingPage({ onLogin }) {
  const [authMode, setAuthMode] = useState(null);

  function openLogin() {
    setAuthMode("login");
  }

  function openRegister() {
    setAuthMode("register");
  }

  function closeModal() {
    setAuthMode(null);
  }

  return (
    <main className="landing-page">
      <Header onLoginClick={openLogin} />
      <Hero onStartClick={openRegister} onLoginClick={openLogin} />
      <Prednosti />

      {authMode && (
        <Auth
          mode={authMode}
          onClose={closeModal}
          onSwitchMode={setAuthMode}
          onLogin={onLogin}
        />
      )}
    </main>
  );
}

export default LandingPage;