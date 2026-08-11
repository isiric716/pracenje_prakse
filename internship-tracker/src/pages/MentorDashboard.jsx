import { useEffect, useState } from "react";

function MentorDashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:3001/mentor/documents", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Nije moguće dohvatiti dokumente.");
        }

        return response.json();
      })
      .then((data) => {
        setDocuments(data);
      })
      .catch((error) => {
        alert(error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Učitavanje dokumenata...</p>;
  }

  const handleDownload = async (id, fileName) => {
  try {
    const response = await fetch(
      `http://localhost:3001/mentor/documents/${id}/download`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = fileName || "dokument.docx";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message);
  }
};

const handleApprove = async (id) => {
  try {
    const response = await fetch(
      `http://localhost:3001/mentor/documents/${id}/approve`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    setDocuments((current) =>
      current.map((document) =>
        document.id === id
          ? { ...document, ...data }
          : document
      )
    );
  } catch (error) {
    alert(error.message);
  }
};

const handleReject = async (id) => {
  const comment = window.prompt("Unesi razlog odbijanja dokumenta:");

  if (!comment?.trim()) {
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3001/mentor/documents/${id}/reject`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          comment,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    setDocuments((current) =>
      current.map((document) =>
        document.id === id
          ? { ...document, ...data }
          : document
      )
    );
  } catch (error) {
    alert(error.message);
  }
};

  return (
    <div style={{ padding: "20px" }}>
      <h1>Mentor dashboard</h1>

      {documents.length === 0 ? (
        <p>Nema predanih dokumenata.</p>
      ) : (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Student</th>
              <th>Email</th>
              <th>Verzija</th>
              <th>Status</th>
              <th>Datum predaje</th>
              <th>Komentar mentora</th>
              <th>Akcije</th>
            </tr>
          </thead>

          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <td>{document.student_name}</td>
                <td>{document.student_email}</td>
                <td>{document.version_number}</td>
                <td>{document.status}</td>
                <td>{document.submitted_at || "—"}</td>
                <td>{document.mentor_comment || "—"}</td>
                <td>
                  <button
                    onClick={() =>
                      handleDownload(document.id, document.file_name)
                    }
                  >
                    Preuzmi
                  </button>

                  {document.status === "pending" && (
                    <>
                      <button onClick={() => handleApprove(document.id)}>
                        Odobri
                      </button>

                      <button onClick={() => handleReject(document.id)}>
                        Odbij
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MentorDashboard;