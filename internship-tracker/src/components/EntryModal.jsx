import { useState } from "react";

function EntryModal({ onClose, onSave, editingEntry }) {
  const [form, setForm] = useState({
    date: editingEntry?.date || "",
    hours: editingEntry?.hours || "",
    description: editingEntry?.description || "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = () => {
    if (!form.date || !form.hours || !form.description) {
      alert("Popuni sva polja");
      return;
    }

    onSave(form);
  };

  return (
    <div>
      <h2>{editingEntry ? "Uredi zapis" : "Novi zapis"}</h2>

      <input
        type="date"
        name="date"
        value={form.date}
        onChange={handleChange}
      />

      <input
        type="number"
        name="hours"
        placeholder="Sati"
        value={form.hours}
        onChange={handleChange}
      />

      <textarea
        name="description"
        placeholder="Opis"
        value={form.description}
        onChange={handleChange}
      />

      <button onClick={handleSubmit}>Spremi</button>
      <button onClick={onClose}>Zatvori</button>
    </div>
  );
}

export default EntryModal;