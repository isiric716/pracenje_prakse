import "./LandingSections.css";

const features = [
  {
    number: "01",
    title: "Dnevnik aktivnosti",
    text: "Bilježi zadatke, sate i opis rada na jednom mjestu.",
  },
  {
    number: "02",
    title: "Praćenje napretka",
    text: "Odmah vidi koliko je sati odrađeno i koliko ih je preostalo.",
  },
  {
    number: "03",
    title: "Dokumentacija",
    text: "Generiraj dnevnik prakse i pošalji ga mentoru na pregled.",
  },
];

const steps = [
  ["1", "Kreiraj račun", "Odaberi ulogu i unesi podatke o svojoj praksi ili kompaniji."],
  ["2", "Vodi dnevnik", "Redovito evidentiraj aktivnosti i broj odrađenih sati."],
  ["3", "Pošalji dokument", "Pripremi dnevnik i pošalji ga mentoru na odobrenje."],
];

function LandingSections() {
  return (
    <div className="landing-sections">
      <section id="about" className="landing-section about-section" aria-labelledby="about-title">
        <div className="section-copy">
          <p className="section-label">O aplikaciji</p>
          <h2 id="about-title">Praksa bez izgubljenih bilješki i papirologije</h2>
        </div>
        <div className="about-text">
          <p>
            Aplikacija povezuje studenta i mentora kroz cijeli proces stručne
            prakse — od prvog unosa do odobrenog završnog dokumenta.
          </p>
          <p>
            Student ima jasan pregled rada i napretka, a mentor sve predane
            dokumente i povratne informacije na jednom mjestu.
          </p>
        </div>
      </section>

      <section id="features" className="landing-section features" aria-labelledby="features-title">
        <div className="section-heading">
          <p className="section-label">Prednosti</p>
          <h2 id="features-title">Sve potrebno za urednu evidenciju</h2>
          <p>Manje administracije, više fokusa na stvarno iskustvo i učenje.</p>
        </div>

        <div className="features-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <span>{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="landing-section how-section" aria-labelledby="how-title">
        <div className="section-heading">
          <p className="section-label">Kako funkcionira</p>
          <h2 id="how-title">Od registracije do odobrenog dnevnika</h2>
          <p>Tri jasna koraka vode cijeli proces stručne prakse.</p>
        </div>

        <ol className="steps-list">
          {steps.map(([number, title, text]) => (
            <li key={number}>
              <span className="step-number">{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default LandingSections;
