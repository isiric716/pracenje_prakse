import { useState } from "react";
import TopBar from "../components/TopBar";
import Hero from "../components/Hero";
import LandingSections from "../components/LandingSections";
import Auth from "../components/Auth";

function LandingPage({ onLogin }) {
  const [authMode, setAuthMode] = useState(null);

  return (
    <main id="top" className="landing-page">
      <TopBar onLoginClick={() => setAuthMode("login")} />
      <Hero
        onStartClick={() => setAuthMode("register")}
        onLoginClick={() => setAuthMode("login")}
      />
      <LandingSections />

      {authMode && (
        <Auth
          key={authMode}
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSwitchMode={setAuthMode}
          onLogin={onLogin}
        />
      )}
    </main>
  );
}

export default LandingPage;
