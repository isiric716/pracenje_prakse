import "./Prednosti.css";

function Features() {
  return (
    <section className="features">
      <h2>Prednosti aplikacije</h2>

      <div className="features-grid">
        <div className="feature-card">
          <h3>Unos dnevnih aktivnosti</h3>
          <p>Jednostavno bilježi što si radio svaki dan.</p>
        </div>

        <div className="feature-card">
          <h3>Praćenje napretka</h3>
          <p>Uvijek vidi koliko sati si odradio i koliko ti je ostalo.</p>
        </div>

        <div className="feature-card">
          <h3>Izvoz dokumentacije</h3>
          <p>Automatski generiraj Word, PDF ili CSV dokument.</p>
        </div>
      </div>
    </section>
  );
}

export default Features;