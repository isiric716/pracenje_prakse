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
          e.mentor_comment,
          e.status,
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

    const { entry_date, hours, description } = req.body;

    if (!entry_date || !hours || !description) {
      return res.status(400).json({
        error: "Datum, broj sati i opis su obavezni.",
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
          hours,
          description
        )
        VALUES (?, ?, ?, ?)
      `)
      .run(
        activeInternship.id,
        entry_date,
        hours,
        description
      );

    const newEntry = db
      .prepare(`
        SELECT
          id,
          internship_id,
          entry_date,
          hours,
          description,
          status,
          mentor_comment
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

    const { entry_date, hours, description } = req.body;

    if (!Number.isInteger(entryId)) {
      return res.status(400).json({
        error: "ID zapisa nije ispravan.",
      });
    }

    if (!entry_date || !hours || !description) {
      return res.status(400).json({
        error: "Datum, broj sati i opis su obavezni.",
      });
    }

    const existingEntry = db
      .prepare(`
        SELECT
          e.id,
          e.status
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

    if (existingEntry.status !== "pending") {
      return res.status(409).json({
        error: "Zaključani zapis nije moguće uređivati.",
      });
    }

    db.prepare(`
      UPDATE entries
      SET
        entry_date = ?,
        hours = ?,
        description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      entry_date,
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
          hours,
          description,
          status,
          mentor_comment
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
          e.id,
          e.status
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

    if (existingEntry.status !== "pending") {
      return res.status(409).json({
        error: "Zaključani zapis nije moguće obrisati.",
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


app.listen(3001, () => {
  console.log("Backend radi na http://localhost:3001");
});