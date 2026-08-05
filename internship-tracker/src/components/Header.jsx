import "./Header.css";

function Header({ onLoginClick }) {
  return (
    <header className="header">
      <div className="logo">
        <span>Evidencija stručne prakse</span>
      </div>

      <nav className="nav">
        <a href="#about">O aplikaciji</a>
        <a href="#features">Prednosti</a>
        <a href="#how">Kako funkcionira</a>
      <button className="btn-outline" onClick={onLoginClick}>
        Prijava
      </button>
      </nav>
    </header>
  );
}

export default Header;