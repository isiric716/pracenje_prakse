import "./TopBar.css";

function TopBar({ onLoginClick }) {
  return (
    <header className="header">
      <div className="header-main">
        <a className="logo" href="#top" aria-label="Povratak na vrh stranice">
          Evidencija stručne prakse
        </a>
        <button className="btn-outline" type="button" onClick={onLoginClick}>
          Prijava
        </button>
      </div>

      <nav className="nav" aria-label="Navigacija početne stranice">
        <a href="#about">O aplikaciji</a>
        <a href="#features">Prednosti</a>
        <a href="#how">Kako funkcionira</a>
      </nav>
    </header>
  );
}

export default TopBar;
