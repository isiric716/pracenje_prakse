import { useEffect, useState } from "react";

function Diary({ user }) {
  const token = localStorage.getItem("token");
  const [entries, setEntries] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [docData, setDocData] = useState({
    companyName: "",
    mentor: "",
    study: "",
    indexNumber: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
  fetch("http://localhost:3001/entries", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Nije moguće dohvatiti zapise.");
      }

      return res.json();
    })
    .then((data) => setEntries(data))
    .catch((error) => {
      console.error("Greška pri dohvaćanju zapisa:", error);
    });

  fetch("http://localhost:3001/internships/active", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Nije moguće dohvatiti aktivnu praksu.");
      }

      return res.json();
    })
    .then((data) => {
      setDocData({
        companyName: data.company_name,
        mentor: data.mentor_name,
        study: "",
        indexNumber: "",
        startDate: data.start_date,
        endDate: data.end_date,
      });
    })
    .catch((error) => {
      console.error("Greška pri dohvaćanju prakse:", error);
    });
}, [token]);

  const handleSaveEntry = (entry) => {
    if (editingEntry) {
      fetch(`http://localhost:3001/entries/${editingEntry.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(entry),
      })
        .then((res) => res.json())
        .then((updated) => {
          setEntries(entries.map((e) => (e.id === updated.id ? updated : e)));
          setEditingEntry(null);
          setIsOpen(false);
        });
    } else {
      fetch("http://localhost:3001/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(entry),
      })
        .then((res) => res.json())
        .then((newEntry) => {
          setEntries([...entries, newEntry]);
          setIsOpen(false);
        });
    }
  };

  const handleDelete = (id) => {
    fetch(`http://localhost:3001/entries/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then(() => {
      setEntries(entries.filter((e) => e.id !== id));
    });
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setEditingEntry(null);
  };

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.entry_date) - new Date(a.entry_date)
  );

  return (
    <div className="diary-layout">
      {/* Lijeva strana - tablica */}
      <div className="diary-main">
        <div className="diary-header">
          <h1 className="dashboard-title">Dnevnik</h1>
          <button className="btn-add" onClick={() => setIsOpen(true)}>
            + Dodaj zapis
          </button>
        </div>

        <div className="diary-table-wrap">
          <table className="dash-table diary-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Sati</th>
                <th>Opis aktivnosti</th>
                <th>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px" }}>
                    Nema unosa. Dodaj prvi zapis!
                  </td>
                </tr>
              ) : (
                sortedEntries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.entry_date}</td>
                    <td>{e.hours} h</td>
                    <td>{e.description}</td>
                    <td>
                      <div className="diary-actions">
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEdit(e)}
                        >
                          <svg
                            width="15"
                            height="15"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(e.id)}
                        >
                          <svg
                            width="15"
                            height="15"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desna strana - podaci za dokument */}
      <div className="diary-sidebar">
        <div className="doc-panel">
          <h3 className="doc-panel-title">Podaci za dokument</h3>

          <div className="doc-form">
            <div className="doc-field">
              <label>Naziv tvrtke / ustanove</label>
              <input
                type="text"
                placeholder="MathOS d.o.o."
                value={docData.companyName}
                onChange={(e) => setDocData({ ...docData, companyName: e.target.value })}
              />
            </div>
            <div className="doc-field">
              <label>Mentor (ime i prezime)</label>
              <input
                type="text"
                placeholder="Marko Horvat"
                value={docData.mentor}
                onChange={(e) => setDocData({ ...docData, mentor: e.target.value })}
              />
            </div>
            <div className="doc-field">
              <label>Studij</label>
              <input
                type="text"
                placeholder="Primijenjena matematika i informatika"
                value={docData.study}
                onChange={(e) => setDocData({ ...docData, study: e.target.value })}
              />
            </div>
            <div className="doc-field">
              <label>Broj indeksa</label>
              <input
                type="text"
                placeholder="123456"
                value={docData.indexNumber}
                onChange={(e) => setDocData({ ...docData, indexNumber: e.target.value })}
              />
            </div>
            <div className="doc-field">
              <label>Datum početka prakse</label>
              <input
                type="date"
                value={docData.startDate}
                onChange={(e) => setDocData({ ...docData, startDate: e.target.value })}
              />
            </div>
            <div className="doc-field">
              <label>Datum završetka prakse</label>
              <input
                type="date"
                value={docData.endDate}
                onChange={(e) => setDocData({ ...docData, endDate: e.target.value })}
              />
            </div>
            <button className="btn-save-doc">Spremi podatke</button>
          </div>
        </div>
      </div>

      {/* Modal za dodavanje/uređivanje */}
      {isOpen && (
        <EntryModal
          onClose={handleCloseModal}
          onSave={handleSaveEntry}
          editingEntry={editingEntry}
        />
      )}
    </div>
  );
}

function EntryModal({ onClose, onSave, editingEntry }) {
  const [form, setForm] = useState({
    entry_date: editingEntry?.entry_date || "",
    activity_type: editingEntry?.activity_type || "development",
    hours: editingEntry?.hours || "",
    description: editingEntry?.description || "",
  });   

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
  if (
    !form.entry_date ||
    !form.activity_type ||
    !form.hours ||
    !form.description
  ) {
    alert("Popuni sva polja!");
    return;
  }

  onSave(form);
};

  return (
    <div className="modal-overlay">
      <div className="entry-modal">
        <div className="entry-modal-header">
          <h2>{editingEntry ? "Uredi zapis" : "Novi zapis"}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="entry-modal-body">
          <div className="doc-field">
            <label>Datum</label>
            <input type="date" name="entry_date" value={form.entry_date} onChange={handleChange} />
          </div>
        <div className="doc-field">
          <label>Vrsta aktivnosti</label>
          <select
            name="activity_type"
            value={form.activity_type}
            onChange={handleChange}
          >
            <option value="development">Razvoj</option>
            <option value="testing">Testiranje</option>
            <option value="documentation">Dokumentacija</option>
            <option value="other">Ostalo</option>
          </select>
        </div>
          <div className="doc-field">
            <label>Broj sati</label>
            <input type="number" name="hours" placeholder="4" value={form.hours} onChange={handleChange} />
          </div>
          <div className="doc-field">
            <label>Opis aktivnosti</label>
            <textarea
              name="description"
              placeholder="Što si radio/la danas..."
              value={form.description}
              onChange={handleChange}
              rows={4}
            />
          </div>
        </div>

        <div className="entry-modal-footer">
          <button className="btn-cancel" onClick={onClose}>Odustani</button>
          <button className="btn-add" onClick={handleSubmit}>Spremi</button>
        </div>
      </div>
    </div>
  );
}

export default Diary;