function EntryList({ entries, onDelete, onEdit }) {
  return (
    <table border="1" cellPadding="10">
      <thead>
        <tr>
          <th>Datum</th>
          <th>Sati</th>
          <th>Opis</th>
          <th>Status</th>
          <th>Akcije</th>
        </tr>
      </thead>

      <tbody>
        {entries.map((e) => (
          <tr key={e.id}>
            <td>{e.date}</td>
            <td>{e.hours}</td>
            <td>{e.description}</td>
            <td>{e.status}</td>

            <td>
              {e.status === "pending" ? (
                <>
                  <button onClick={() => onEdit(e)}>Uredi</button>
                  <button onClick={() => onDelete(e.id)}>Obriši</button>
                </>
              ) : (
                <span>Zaključano</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default EntryList;