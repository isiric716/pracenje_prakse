const express = require("express");
const cors = require("cors");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = express();
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
process.loadEnvFile(path.join(__dirname, ".env"));

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET nije postavljen.");
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Nedostaje autentikacijski token.",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Token nije ispravno poslan.",
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Token nije važeći ili je istekao.",
    });
  }
}

app.use(cors());
app.use(express.json());

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email i lozinka su obavezni.",
      });
    }

    const user = db
      .prepare(`
        SELECT
          id,
          first_name,
          last_name,
          email,
          password_hash,
          role,
          is_active
        FROM users
        WHERE email = ?
      `)
      .get(email);

    if (!user) {
      return res.status(401).json({
        error: "Email ili lozinka nisu ispravni.",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: "Korisnički račun nije aktivan.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Email ili lozinka nisu ispravni.",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: "8h",
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        fullName: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role,
      },
    });
      } catch (error) {
        console.error("Greška pri prijavi:", error);

        res.status(500).json({
          error: "Prijava nije uspjela.",
        });
      }
    });

app.get("/faculties", (req, res) => {
  try {
    const faculties = db
      .prepare(`
        SELECT id, name, city
        FROM faculties
        ORDER BY name
      `)
      .all();

    res.json(faculties);
  } catch (error) {
    console.error("Greška pri dohvaćanju fakulteta:", error);

    res.status(500).json({
      error: "Nije moguće dohvatiti fakultete.",
    });
  }
});

app.get("/companies", (req, res) => {
  try {
    const companies = db
      .prepare(`
        SELECT id, name, city
        FROM companies
        ORDER BY name
      `)
      .all();

    res.json(companies);
  } catch (error) {
    console.error("Greška pri dohvaćanju kompanija:", error);

    res.status(500).json({
      error: "Nije moguće dohvatiti kompanije.",
    });
  }
});

app.get("/users/current", authenticateToken, (req, res) => {
  try {
    const studentId = req.user.userId;

    const user = db
      .prepare(`
        SELECT
          id,
          first_name,
          last_name,
          email,
          role
        FROM users
        WHERE id = ?
      `)
      .get(studentId);

    if (!user) {
      return res.status(404).json({
        error: "Korisnik nije pronađen.",
      });
    }

    res.json({
      id: user.id,
      fullName: `${user.first_name} ${user.last_name}`,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("Greška pri dohvaćanju korisnika:", error);

    res.status(500).json({
      error: "Nije moguće dohvatiti korisnika.",
    });
  }
});

app.get("/internships/active", authenticateToken, (req, res) => {
  try {
    const studentId = req.user.userId;

    const internship = db
      .prepare(`
        SELECT
          i.id,
          c.name AS company_name,
          u.first_name || ' ' || u.last_name AS mentor_name,
          i.start_date,
          i.end_date,
          i.required_hours,
          i.status
        FROM internships AS i
        INNER JOIN companies AS c
          ON i.company_id = c.id
        INNER JOIN users AS u
          ON i.mentor_id = u.id
        WHERE i.student_id = ?
          AND i.status = 'active'
      `)
      .get(studentId);

    if (!internship) {
      return res.status(404).json({
        error: "Aktivna praksa nije pronađena.",
      });
    }

    res.json(internship);
  } catch (error) {
    console.error("Greška pri dohvaćanju aktivne prakse:", error);

    res.status(500).json({
      error: "Nije moguće dohvatiti aktivnu praksu.",
    });
  }
});

app.get("/entries", authenticateToken, (req, res) => {
  try {
    const studentId = req.user.userId;

    const entries = db
      .prepare(`
        SELECT
          e.id,
          e.internship_id,
          e.entry_date,
          e.activity_type,
          e.hours,
          e.description
        FROM entries AS e
        INNER JOIN internships AS i
          ON e.internship_id = i.id
        WHERE i.student_id = ?
        ORDER BY e.entry_date DESC
      `)
      .all(studentId);

    res.json(entries);
  } catch (error) {
    console.error("Greška pri dohvaćanju zapisa:", error);

    res.status(500).json({
      error: "Nije moguće dohvatiti zapise.",
    });
  }
});

app.post("/entries", authenticateToken, (req, res) => {
  try {
    const studentId = req.user.userId;

    const { entry_date, activity_type, hours, description } = req.body;

    if (!entry_date || !activity_type || !hours || !description) {
      return res.status(400).json({
        error: "Datum, tip aktivnosti, broj sati i opis su obavezni.",
      });
    }

    const activeInternship = db
      .prepare(`
        SELECT id
        FROM internships
        WHERE student_id = ?
          AND status = 'active'
      `)
      .get(studentId);

    if (!activeInternship) {
      return res.status(400).json({
        error: "Student nema aktivnu stručnu praksu.",
      });
    }

    const result = db
      .prepare(`
        INSERT INTO entries (
          internship_id,
          entry_date,
          activity_type,
          hours,
          description
        )
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        activeInternship.id,
        entry_date,
        activity_type,
        hours,
        description
      );

    const newEntry = db
      .prepare(`
        SELECT
          id,
          internship_id,
          entry_date,
          activity_type,
          hours,
          description
        FROM entries
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    res.status(201).json(newEntry);
  } catch (error) {
    console.error("Greška pri spremanju zapisa:", error);

    res.status(500).json({
      error: "Nije moguće spremiti zapis.",
    });
  }
});

app.put("/entries/:id", authenticateToken, (req, res) => {
  try {
    const studentId = req.user.userId;
    const entryId = Number(req.params.id);

    const { entry_date, activity_type, hours, description } = req.body;

    if (!Number.isInteger(entryId)) {
      return res.status(400).json({
        error: "ID zapisa nije ispravan.",
      });
    }

    if (!entry_date || !activity_type || !hours || !description) {
      return res.status(400).json({
        error: "Datum, vrsta aktivnosti, broj sati i opis su obavezni.",
      });
    }

    const existingEntry = db
      .prepare(`
        SELECT
          e.id
        FROM entries AS e
        INNER JOIN internships AS i
          ON e.internship_id = i.id
        WHERE e.id = ?
          AND i.student_id = ?
      `)
      .get(entryId, studentId);

    if (!existingEntry) {
      return res.status(404).json({
        error: "Zapis nije pronađen.",
      });
    }

    db.prepare(`
      UPDATE entries
      SET
        entry_date = ?,
        activity_type = ?,
        hours = ?,
        description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      entry_date,
      activity_type,
      hours,
      description,
      entryId
    );

    const updatedEntry = db
      .prepare(`
        SELECT
          id,
          internship_id,
          entry_date,
          activity_type,
          hours,
          description
        FROM entries
        WHERE id = ?
      `)
      .get(entryId);

    res.json(updatedEntry);
  } catch (error) {
    console.error("Greška pri uređivanju zapisa:", error);

    res.status(500).json({
      error: "Nije moguće urediti zapis.",
    });
  }
});

app.delete("/entries/:id", authenticateToken, (req, res) => {
  try {
    const studentId = req.user.userId;
    const entryId = Number(req.params.id);

    if (!Number.isInteger(entryId)) {
      return res.status(400).json({
        error: "ID zapisa nije ispravan.",
      });
    }

    const existingEntry = db
      .prepare(`
        SELECT
          e.id
        FROM entries AS e
        INNER JOIN internships AS i
          ON e.internship_id = i.id
        WHERE e.id = ?
          AND i.student_id = ?
      `)
      .get(entryId, studentId);

    if (!existingEntry) {
      return res.status(404).json({
        error: "Zapis nije pronađen.",
      });
    }


    db.prepare(`
      DELETE FROM entries
      WHERE id = ?
    `).run(entryId);

    res.json({
      message: "Zapis je uspješno obrisan.",
    });
  } catch (error) {
    console.error("Greška pri brisanju zapisa:", error);

    res.status(500).json({
      error: "Nije moguće obrisati zapis.",
    });
  }
});

app.post("/documents/generate", authenticateToken, (req, res) => {
  const studentId = req.user.userId;
  const { docInfo } = req.body;

  if (!docInfo) {
    return res.status(400).json({
      error: "Nedostaju podaci za dokument.",
    });
  }

  const requestId = require("crypto").randomUUID();

  const tempDataPath = path.join(
    __dirname,
    `temp_data_${requestId}.json`
  );

  const tempDocumentPath = path.join(
    __dirname,
    `temp_document_${requestId}.docx`
  );

  try {
    const internship = db
      .prepare(`
        SELECT
          i.id,
          i.start_date,
          i.end_date,
          c.name AS company_name,
          c.city AS company_city,
          student.first_name AS student_first_name,
          student.last_name AS student_last_name,
          mentor.first_name AS mentor_first_name,
          mentor.last_name AS mentor_last_name,
          mentor.email AS mentor_email
        FROM internships AS i
        INNER JOIN companies AS c
          ON i.company_id = c.id
        INNER JOIN users AS student
          ON i.student_id = student.id
        INNER JOIN users AS mentor
          ON i.mentor_id = mentor.id
        WHERE i.student_id = ?
          AND i.status = 'active'
      `)
      .get(studentId);

    if (!internship) {
      return res.status(404).json({
        error: "Aktivna praksa nije pronađena.",
      });
    }

    const studentEntries = db
      .prepare(`
        SELECT
          entry_date,
          hours,
          description
        FROM entries
        WHERE internship_id = ?
        ORDER BY entry_date
      `)
      .all(internship.id);

    const data = {
      student: {
        fullName: `${internship.student_first_name} ${internship.student_last_name}`,
      },
      docInfo: {
        ...docInfo,
        companyName: `${internship.company_name}, ${internship.company_city}`,
        mentor: `${internship.mentor_first_name} ${internship.mentor_last_name}`,
        mentorEmail: internship.mentor_email,
        startDate: internship.start_date,
        endDate: internship.end_date,
      },
      entries: studentEntries,
    };

    const scriptPath = path.join(__dirname, "generateDoc.js");

    fs.writeFileSync(
      tempDataPath,
      JSON.stringify(data)
    );

    execSync(
      `node "${scriptPath}" "${tempDataPath}" "${tempDocumentPath}"`
    );

    fs.unlinkSync(tempDataPath);

    res.download(
      tempDocumentPath,
      "dnevnik_strucne_prakse.docx",
      (error) => {
        if (fs.existsSync(tempDocumentPath)) {
          fs.unlinkSync(tempDocumentPath);
        }

        if (error) {
          console.error(
            "Greška pri preuzimanju dokumenta:",
            error
          );
        }
      }
    );
  } catch (error) {
    if (fs.existsSync(tempDataPath)) {
      fs.unlinkSync(tempDataPath);
    }

    if (fs.existsSync(tempDocumentPath)) {
      fs.unlinkSync(tempDocumentPath);
    }

    console.error("Greška pri generiranju dokumenta:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Dokument nije moguće generirati.",
      });
    }
  }
});



app.post("/documents/submit", authenticateToken, (req, res) => {
  const studentId = req.user.userId;
  const { docInfo } = req.body;

  if (!docInfo) {
    return res.status(400).json({
      error: "Nedostaju podaci za dokument.",
    });
  }

  const requestId = require("crypto").randomUUID();
  let tempPath;
  let newFilePath;

  try {
    db.exec("BEGIN IMMEDIATE");

    const internship = db
      .prepare(`
        SELECT
          i.id,
          i.start_date,
          i.end_date,
          c.name AS company_name,
          c.city AS company_city,
          student.first_name AS student_first_name,
          student.last_name AS student_last_name,
          mentor.first_name AS mentor_first_name,
          mentor.last_name AS mentor_last_name,
          mentor.email AS mentor_email
        FROM internships AS i
        INNER JOIN companies AS c
          ON i.company_id = c.id
        INNER JOIN users AS student
          ON i.student_id = student.id
        INNER JOIN users AS mentor
          ON i.mentor_id = mentor.id
        WHERE i.student_id = ?
          AND i.status = 'active'
      `)
      .get(studentId);

    if (!internship) {
      db.exec("ROLLBACK");

      return res.status(404).json({
        error: "Aktivna praksa nije pronađena.",
      });
    }

    const existingDocument = db
      .prepare(`
        SELECT
          id,
          status,
          version_number,
          file_path
        FROM documents
        WHERE internship_id = ?
      `)
      .get(internship.id);

    if (
      existingDocument &&
      !["draft", "rejected"].includes(existingDocument.status)
    ) {
      db.exec("ROLLBACK");

      return res.status(409).json({
        error:
          existingDocument.status === "pending"
            ? "Dokument je već poslan mentoru."
            : "Odobreni dokument više nije moguće mijenjati.",
      });
    }

    const versionNumber = existingDocument
      ? existingDocument.version_number + 1
      : 1;

    const studentEntries = db
      .prepare(`
        SELECT
          entry_date,
          hours,
          description
        FROM entries
        WHERE internship_id = ?
        ORDER BY entry_date
      `)
      .all(internship.id);

    const data = {
      student: {
        fullName: `${internship.student_first_name} ${internship.student_last_name}`,
      },
      docInfo: {
        ...docInfo,
        companyName: `${internship.company_name}, ${internship.company_city}`,
        mentor: `${internship.mentor_first_name} ${internship.mentor_last_name}`,
        mentorEmail: internship.mentor_email,
        startDate: internship.start_date,
        endDate: internship.end_date,
      },
      entries: studentEntries,
    };

    const documentsDirectory = path.join(__dirname, "documents");

    if (!fs.existsSync(documentsDirectory)) {
      fs.mkdirSync(documentsDirectory);
    }

    tempPath = path.join(
      __dirname,
      `temp_data_${requestId}.json`
    );

    newFilePath = path.join(
      documentsDirectory,
      `internship_${internship.id}_v${versionNumber}_${requestId}.docx`
    );

    const scriptPath = path.join(__dirname, "generateDoc.js");

    fs.writeFileSync(tempPath, JSON.stringify(data));

    execSync(
      `node "${scriptPath}" "${tempPath}" "${newFilePath}"`
    );

    fs.unlinkSync(tempPath);
    tempPath = null;

    if (existingDocument) {
      db.prepare(`
        UPDATE documents
        SET
          status = 'pending',
          version_number = ?,
          file_name = ?,
          file_path = ?,
          submitted_at = CURRENT_TIMESTAMP,
          approved_at = NULL,
          approved_by = NULL,
          mentor_comment = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        versionNumber,
        path.basename(newFilePath),
        newFilePath,
        existingDocument.id
      );
    } else {
      db.prepare(`
        INSERT INTO documents (
          internship_id,
          status,
          version_number,
          file_name,
          file_path,
          submitted_at
        )
        VALUES (?, 'pending', ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        internship.id,
        versionNumber,
        path.basename(newFilePath),
        newFilePath
      );
    }

    db.exec("COMMIT");

    if (
      existingDocument?.file_path &&
      fs.existsSync(existingDocument.file_path)
    ) {
      fs.unlinkSync(existingDocument.file_path);
    }

    res.status(201).json({
      message: "Dokument je uspješno poslan mentoru.",
      status: "pending",
      version_number: versionNumber,
    });
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Transakcija je možda već završena.
    }

    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    if (newFilePath && fs.existsSync(newFilePath)) {
      fs.unlinkSync(newFilePath);
    }

    console.error("Greška pri slanju dokumenta:", error);

    res.status(500).json({
      error: "Dokument nije moguće poslati mentoru.",
    });
  }
});

app.get("/mentor/documents", authenticateToken, (req, res) => {
  try {
    const mentorId = req.user.userId;

    if (req.user.role !== "mentor") {
      return res.status(403).json({
        error: "Pristup je dopušten samo mentorima.",
      });
    }

    const documents = db
      .prepare(`
        SELECT
          d.id,
          d.status,
          d.version_number,
          d.file_name,
          d.submitted_at,
          d.mentor_comment,
          i.id AS internship_id,
          student.first_name || ' ' || student.last_name AS student_name,
          student.email AS student_email
        FROM documents AS d
        INNER JOIN internships AS i
          ON d.internship_id = i.id
        INNER JOIN users AS student
          ON i.student_id = student.id
        WHERE i.mentor_id = ?
        ORDER BY d.submitted_at DESC
      `)
      .all(mentorId);

    res.json(documents);
  } catch (error) {
    console.error(
      "Greška pri dohvaćanju dokumenata mentora:",
      error
    );

    res.status(500).json({
      error: "Nije moguće dohvatiti dokumente.",
    });
  }
});

app.get("/mentor/documents/:id/download", authenticateToken, (req, res) => {
  try {
    const mentorId = req.user.userId;
    const documentId = Number(req.params.id);

    if (req.user.role !== "mentor") {
      return res.status(403).json({
        error: "Pristup je dopušten samo mentorima.",
      });
    }

    if (!Number.isInteger(documentId)) {
      return res.status(400).json({
        error: "ID dokumenta nije ispravan.",
      });
    }

    const document = db
      .prepare(`
        SELECT
          d.file_path,
          d.file_name
        FROM documents AS d
        INNER JOIN internships AS i
          ON d.internship_id = i.id
        WHERE d.id = ?
          AND i.mentor_id = ?
      `)
      .get(documentId, mentorId);

    if (!document) {
      return res.status(404).json({
        error: "Dokument nije pronađen.",
      });
    }

    if (!document.file_path || !fs.existsSync(document.file_path)) {
      return res.status(404).json({
        error: "Datoteka dokumenta nije pronađena.",
      });
    }

    res.download(
      document.file_path,
      document.file_name || "dokument.docx"
    );
  } catch (error) {
    console.error("Greška pri preuzimanju dokumenta:", error);

    res.status(500).json({
      error: "Dokument nije moguće preuzeti.",
    });
  }
});

app.patch("/mentor/documents/:id/approve", authenticateToken, (req, res) => {
  try {
    const mentorId = req.user.userId;
    const documentId = Number(req.params.id);

    if (req.user.role !== "mentor") {
      return res.status(403).json({
        error: "Pristup je dopušten samo mentorima.",
      });
    }

    if (!Number.isInteger(documentId)) {
      return res.status(400).json({
        error: "ID dokumenta nije ispravan.",
      });
    }

    const document = db
      .prepare(`
        SELECT d.id
        FROM documents AS d
        INNER JOIN internships AS i
          ON d.internship_id = i.id
        WHERE d.id = ?
          AND i.mentor_id = ?
      `)
      .get(documentId, mentorId);

    if (!document) {
      return res.status(404).json({
        error: "Dokument nije pronađen.",
      });
    }

    db.prepare(`
      UPDATE documents
      SET
        status = 'approved',
        approved_at = CURRENT_TIMESTAMP,
        approved_by = ?,
        mentor_comment = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(mentorId, documentId);

    const updatedDocument = db
      .prepare(`
        SELECT
          id,
          status,
          version_number,
          file_name,
          submitted_at,
          mentor_comment,
          approved_at
        FROM documents
        WHERE id = ?
      `)
      .get(documentId);

    res.json(updatedDocument);
  } catch (error) {
    console.error("Greška pri odobravanju dokumenta:", error);

    res.status(500).json({
      error: "Dokument nije moguće odobriti.",
    });
  }
});

app.patch("/mentor/documents/:id/reject", authenticateToken, (req, res) => {
  try {
    const mentorId = req.user.userId;
    const documentId = Number(req.params.id);
    const { comment } = req.body;

    if (req.user.role !== "mentor") {
      return res.status(403).json({
        error: "Pristup je dopušten samo mentorima.",
      });
    }

    if (!Number.isInteger(documentId)) {
      return res.status(400).json({
        error: "ID dokumenta nije ispravan.",
      });
    }

    if (!comment?.trim()) {
      return res.status(400).json({
        error: "Komentar je obavezan kod odbijanja dokumenta.",
      });
    }

    const document = db
      .prepare(`
        SELECT d.id
        FROM documents AS d
        INNER JOIN internships AS i
          ON d.internship_id = i.id
        WHERE d.id = ?
          AND i.mentor_id = ?
      `)
      .get(documentId, mentorId);

    if (!document) {
      return res.status(404).json({
        error: "Dokument nije pronađen.",
      });
    }

    db.prepare(`
      UPDATE documents
      SET
        status = 'rejected',
        approved_at = NULL,
        approved_by = NULL,
        mentor_comment = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(comment.trim(), documentId);

    const updatedDocument = db
      .prepare(`
        SELECT
          id,
          status,
          version_number,
          file_name,
          submitted_at,
          mentor_comment
        FROM documents
        WHERE id = ?
      `)
      .get(documentId);

    res.json(updatedDocument);
  } catch (error) {
    console.error("Greška pri odbijanju dokumenta:", error);

    res.status(500).json({
      error: "Dokument nije moguće odbiti.",
    });
  }
});


app.listen(3001, () => {
  console.log("Backend radi na http://localhost:3001");
});