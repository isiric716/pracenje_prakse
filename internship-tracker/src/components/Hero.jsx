import "./Hero.css";

function Hero({ onStartClick, onLoginClick }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-content">
        <p className="eyebrow">Jednostavno. Pregledno. Uvijek uz tebe.</p>
        <h1 id="hero-title">Evidencija stručne prakse</h1>
        <p className="hero-description">
          Digitalna platforma za vođenje dnevnika stručne prakse, praćenje
          napretka i pripremu dokumentacije.
        </p>

        <div className="hero-actions">
          <button className="btn btn-primary" type="button" onClick={onStartClick}>
            Započni
          </button>
          <button className="btn btn-secondary" type="button" onClick={onLoginClick}>
            Prijava
          </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;
