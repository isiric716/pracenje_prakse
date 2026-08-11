import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard({ user }) {
  const token = localStorage.getItem("token");
  const [entries, setEntries] = useState([]);
  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

 useEffect(() => {
  Promise.all([
    fetch("http://localhost:3001/entries", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

    fetch("http://localhost:3001/internships/active", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
  ])
    .then(async ([entriesResponse, internshipResponse]) => {
      if (!entriesResponse.ok) {
        throw new Error("Nije moguće dohvatiti zapise.");
      }

      if (!internshipResponse.ok) {
        throw new Error("Nije moguće dohvatiti aktivnu praksu.");
      }

      const entriesData = await entriesResponse.json();
      const internshipData = await internshipResponse.json();

      setEntries(entriesData);
      setInternship(internshipData);
    })
    .catch((error) => {
      console.error("Greška pri učitavanju Dashboarda:", error);
    })
    .finally(() => {
      setLoading(false);
    });
    },
    [token]); 

if (loading) {
  return (
    <div style={{ color: "var(--text-secondary)", padding: "40px" }}>
      Učitavanje...
    </div>
  );
}

if (!internship) {
  return (
    <div style={{ color: "var(--text-secondary)", padding: "40px" }}>
      Aktivna praksa nije pronađena.
    </div>
  );
}

 const totalHours = internship.required_hours;

 const completedHours = entries.reduce(
    (sum, entry) => sum + Number(entry.hours),
    0
  );

 const remainingHours = Math.max(totalHours - completedHours, 0);

 const progressPercent = Math.min(
    Math.round((completedHours / totalHours) * 100),
    100
  );

  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
    .slice(0, 5);

  // Podaci za tjedni graf (zadnjih 7 tjedana)
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const weekLabel = `T${i + 1}`;
    const weekEntries = entries.filter((e) => {
      const entryDate = new Date(e.entry_date);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (6 - i) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      return entryDate >= weekStart && entryDate < weekEnd;
    });
    const hours = weekEntries.reduce((sum, e) => sum + Number(e.hours), 0);
    return { label: weekLabel, hours };
  });

  const maxWeekHours = Math.max(...weeklyData.map((w) => w.hours), 1);

  // Podaci za donut graf aktivnosti
  const activityTypes = {
    Razvoj: 0,
    Testiranje: 0,
    Dokumentacija: 0,
    Ostalo: 0,
  };
  entries.forEach((e) => {
    const desc = e.description?.toLowerCase() || "";
    if (desc.includes("razvoj") || desc.includes("api") || desc.includes("implementa")) {
      activityTypes["Razvoj"] += Number(e.hours);
    } else if (desc.includes("test")) {
      activityTypes["Testiranje"] += Number(e.hours);
    } else if (desc.includes("dokument")) {
      activityTypes["Dokumentacija"] += Number(e.hours);
    } else {
      activityTypes["Ostalo"] += Number(e.hours);
    }
  });

  const activityColors = {
    Razvoj: "#3b82f6",
    Testiranje: "#8b5cf6",
    Dokumentacija: "#10b981",
    Ostalo: "#f59e0b",
  };

  const totalActivityHours = Object.values(activityTypes).reduce((a, b) => a + b, 0) || 1;

  // SVG donut
  const donutSegments = () => {
    let cumulative = 0;
    const r = 60;
    const cx = 80;
    const cy = 80;
    const circumference = 2 * Math.PI * r;

    return Object.entries(activityTypes).map(([key, val]) => {
      const percent = val / totalActivityHours;
      const strokeDasharray = `${percent * circumference} ${circumference}`;
      const strokeDashoffset = -cumulative * circumference;
      cumulative += percent;
      return (
        <circle
          key={key}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={activityColors[key]}
          strokeWidth="28"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
        />
      );
    });
  };


  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Dashboard</h1>

      {/* Stat kartice */}
      <div className="dash-cards">
        <div className="dash-card">
          <span className="dash-card-label">UKUPNO SATI</span>
          <span className="dash-card-value">{totalHours} h</span>
          <span className="dash-card-sub">zahtjeva se</span>
        </div>
        <div className="dash-card">
          <span className="dash-card-label">ODRAĐENO SATI</span>
          <span className="dash-card-value">{completedHours} h</span>
          <div className="dash-card-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="dash-card-sub">{progressPercent}% od ukupnog</span>
          </div>
        </div>
        <div className="dash-card">
          <span className="dash-card-label">PREOSTALO SATI</span>
          <span className="dash-card-value">{remainingHours} h</span>
          <span className="dash-card-sub">još za odraditi</span>
        </div>
        <div className="dash-card">
          <span className="dash-card-label">STATUS</span>
          <span className="dash-card-value dash-card-status">
            {progressPercent >= 100 ? "Završeno" : "U tijeku"}
          </span>
          <span className="dash-card-sub">praksa aktivna</span>
        </div>
      </div>

      {/* Grafovi */}
      <div className="dash-charts">
        {/* Tjedni bar chart */}
        <div className="dash-chart-card">
          <h3>Sati po tjednima</h3>
          <div className="bar-chart">
            {weeklyData.map((w) => (
              <div key={w.label} className="bar-col">
                <div className="bar-wrap">
                  <div
                    className="bar"
                    style={{ height: `${(w.hours / maxWeekHours) * 140}px` }}
                    title={`${w.hours}h`}
                  />
                </div>
                <span className="bar-label">{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut chart */}
        <div className="dash-chart-card">
          <h3>Aktivnosti</h3>
          <div className="donut-wrap">
            <svg width="160" height="160" viewBox="0 0 160 160">
              {donutSegments()}
            </svg>
            <div className="donut-legend">
              {Object.entries(activityTypes).map(([key, val]) => (
                <div key={key} className="legend-item">
                  <span className="legend-dot" style={{ background: activityColors[key] }} />
                  <span className="legend-label">{key}</span>
                  <span className="legend-val">
                    {totalActivityHours > 0
                      ? Math.round((val / totalActivityHours) * 100)
                      : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Zadnji unosi */}
      <div className="dash-recent">
        <div className="dash-recent-header">
          <h3>Zadnji unosi</h3>
          <button className="btn-add" onClick={() => navigate("/diary")}>
            + Dodaj zapis
          </button>
        </div>

        <table className="dash-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Sati</th>
              <th>Opis</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentEntries.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                  Nema unosa. <span style={{ color: "var(--accent-light)", cursor: "pointer" }} onClick={() => navigate("/diary")}>Dodaj prvi zapis →</span>
                </td>
              </tr>
            ) : (
              recentEntries.map((e) => {
                return (
                  <tr key={e.id}>
                    <td>{e.entry_date}</td>
                    <td>{e.hours} h</td>
                    <td>{e.description}</td>
                    <td>
                       <span className="status-badge">Zapisano</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;