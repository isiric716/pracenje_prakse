import "./Hero.css";

function Hero({ onStartClick, onLoginClick }) {
  return (
    <section className="hero">
      <div className="hero-content">
        <p className="eyebrow">Jednostavno. Pregledno. Uvijek uz tebe.</p>

        <h1>Evidencija stručne prakse</h1>

        <p className="hero-description">
          Digitalna platforma za vođenje dnevnika stručne prakse, praćenje
          napretka i generiranje dokumentacije.
        </p>

        <div className="hero-actions">
        <button className="btn btn-primary" onClick={onStartClick}>
          Započni
        </button>

        <button className="btn btn-secondary" onClick={onLoginClick}>
          Prijava
        </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;