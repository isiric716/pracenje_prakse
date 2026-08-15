const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
process.loadEnvFile(path.join(__dirname, ".env"));
const db = require("./db");

const jwtSecret = process.env.JWT_SECRET;
const storagePath = process.env.STORAGE_PATH || __dirname;

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
  } catch {
    return res.status(401).json({
      error: "Token nije važeći ili je istekao.",
    });
  }
}

app.use(express.json());

const currentInternshipStatus = db.prepare(`
  SELECT status
  FROM internships
  WHERE student_id = ?
    AND status IN ('planned', 'active', 'cancelled')
  ORDER BY created_at DESC, id DESC
  LIMIT 1
`);

function getInternshipStatus(user) {
  return user.role === "student"
    ? currentInternshipStatus.get(user.id)?.status || null
    : null;
}

function normalizeDocumentInfo(docInfo) {
  if (typeof docInfo?.institutionName !== "string" || !docInfo.institutionName.trim()) {
    return null;
  }

  return {
    ...docInfo,
    institutionName: docInfo.institutionName.trim(),
    universityName: typeof docInfo.universityName === "string"
      ? docInfo.universityName.trim()
      : "",
  };
}

function createAuthResponse(user) {
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

  return {
    token,
    user: {
      id: user.id,
      fullName: `${user.first_name} ${user.last_name}`,
      email: user.email,
      role: user.role,
      facultyName: user.faculty_name || "",
      updatedAt: user.updated_at,
      internshipStatus: getInternshipStatus(user),
    },
  };
}

app.post("/register", async (req, res) => {
  const { fullName, email, password, role } = req.body;

  const normalizedName = typeof fullName === "string"
    ? fullName.trim().replace(/\s+/g, " ")
    : "";
  const nameParts = normalizedName.split(" ").filter(Boolean);
  const normalizedEmail = typeof email === "string"
    ? email.trim().toLowerCase()
    : "";

  if (nameParts.length < 2) {
    return res.status(400).json({
      error: "Unesite ime i prezime.",
    });
  }

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return res.status(400).json({
      error: "Unesite ispravnu email adresu.",
    });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({
      error: "Lozinka mora imati najmanje 8 znakova.",
    });
  }

  if (!["student", "mentor"].includes(role)) {
    return res.status(400).json({
      error: "Odaberite ispravnu ulogu.",
    });
  }

  try {
    const existingUser = db
      .prepare("SELECT id FROM users WHERE LOWER(email) = ?")
      .get(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({
        error: "Korisnik s tom email adresom već postoji.",
      });
    }

    const firstName = nameParts.shift();
    const lastName = nameParts.join(" ");
    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = db
      .prepare(`
        INSERT INTO users (
          first_name,
          last_name,
          email,
          password_hash,
          role
        )
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        firstName,
        lastName,
        normalizedEmail,
        passwordHash,
        role
      );

    const userId = Number(userResult.lastInsertRowid);

    const newUser = db
      .prepare(`
        SELECT id, first_name, last_name, email, role, faculty_name, updated_at
        FROM users
        WHERE id = ?
      `)
      .get(userId);

    res.status(201).json(createAuthResponse(newUser));
  } catch (error) {
    console.error("Greška pri registraciji:", error);

    if (String(error.message).includes("UNIQUE constraint failed: users.email")) {
      return res.status(409).json({
        error: "Korisnik s tom email adresom već postoji.",
      });
    }

    res.status(500).json({
      error: "Registracija nije uspjela.",
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        error: "Email i lozinka su obavezni.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = db
      .prepare(`
        SELECT
          id,
          first_name,
          last_name,
          email,
          password_hash,
          role,
          faculty_name,
          updated_at,
          is_active
        FROM users
        WHERE LOWER(email) = ?
      `)
      .get(normalizedEmail);

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

    res.json(createAuthResponse(user));
      } catch (error) {
        console.error("Greška pri prijavi:", error);

        res.status(500).json({
          error: "Prijava nije uspjela.",
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
          role,
          faculty_name,
          updated_at
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
      facultyName: user.faculty_name || "",
      updatedAt: user.updated_at,
      internshipStatus: getInternshipStatus(user),
    });
  } catch (error) {
    console.error("Greška pri dohvaćanju korisnika:", error);

    res.status(500).json({
      error: "Nije moguće dohvatiti korisnika.",
    });
  }
});

app.get("/internships/current", authenticateToken, (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ error: "Pristup je dopušten samo studentima." });
  }

  try {
    const internship = db
      .prepare(`
        SELECT
          i.id,
          i.mentor_id,
          i.mentor_email,
          c.name AS company_name,
          c.city AS company_city,
          CASE
            WHEN mentor.id IS NULL THEN NULL
            ELSE mentor.first_name || ' ' || mentor.last_name
          END AS mentor_name,
          i.start_date,
          i.end_date,
          i.required_hours,
          i.status,
          i.updated_at
        FROM internships AS i
        INNER JOIN companies AS c ON i.company_id = c.id
        LEFT JOIN users AS mentor ON i.mentor_id = mentor.id
        WHERE i.student_id = ?
          AND i.status IN ('planned', 'active', 'cancelled')
        ORDER BY i.created_at DESC, i.id DESC
        LIMIT 1
      `)
      .get(req.user.userId);

    res.json(internship || null);
  } catch (error) {
    console.error("Greška pri dohvaćanju prakse:", error);
    res.status(500).json({ error: "Nije moguće dohvatiti praksu." });
  }
});

app.post("/internships", authenticateToken, (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ error: "Pristup je dopušten samo studentima." });
  }

  const studentId = req.user.userId;
  const {
    facultyName,
    companyName,
    companyCity,
    mentorEmail,
    startDate,
    endDate,
    requiredHours,
  } = req.body;
  const normalizedFaculty = typeof facultyName === "string" ? facultyName.trim() : "";
  const normalizedCompany = typeof companyName === "string" ? companyName.trim() : "";
  const normalizedCity = typeof companyCity === "string" ? companyCity.trim() : "";
  const normalizedMentorEmail = typeof mentorEmail === "string"
    ? mentorEmail.trim().toLowerCase()
    : "";
  const parsedHours = Number(requiredHours);

  if (
    !normalizedCompany ||
    !normalizedCity ||
    !/^\S+@\S+\.\S+$/.test(normalizedMentorEmail) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate || "") ||
    (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) ||
    (endDate && endDate < startDate) ||
    !Number.isFinite(parsedHours) ||
    parsedHours <= 0
  ) {
    return res.status(400).json({ error: "Unesite ispravne podatke o praksi." });
  }

  let transactionStarted = false;

  try {
    db.exec("BEGIN IMMEDIATE;");
    transactionStarted = true;

    const existingInternship = db
      .prepare(`
        SELECT id FROM internships
        WHERE student_id = ? AND status IN ('planned', 'active')
      `)
      .get(studentId);

    if (existingInternship) {
      db.exec("ROLLBACK;");
      transactionStarted = false;
      return res.status(409).json({ error: "Već imate praksu u tijeku ili na čekanju." });
    }

    const mentorAccount = db
      .prepare("SELECT id, role FROM users WHERE LOWER(email) = ? AND is_active = 1")
      .get(normalizedMentorEmail);

    if (mentorAccount?.id === studentId) {
      db.exec("ROLLBACK;");
      transactionStarted = false;
      return res.status(400).json({ error: "Ne možete navesti vlastitu email adresu kao adresu mentora." });
    }

    if (mentorAccount && mentorAccount.role !== "mentor") {
      db.exec("ROLLBACK;");
      transactionStarted = false;
      return res.status(400).json({ error: "Navedena email adresa ne pripada mentorskom računu." });
    }

    let company = db
      .prepare("SELECT id FROM companies WHERE LOWER(name) = LOWER(?) AND LOWER(city) = LOWER(?)")
      .get(normalizedCompany, normalizedCity);

    if (!company) {
      const result = db
        .prepare("INSERT INTO companies (name, city) VALUES (?, ?)")
        .run(normalizedCompany, normalizedCity);
      company = { id: Number(result.lastInsertRowid) };
    }

    db.prepare(`
      UPDATE users
      SET faculty_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(normalizedFaculty || null, studentId);

    const result = db
      .prepare(`
        INSERT INTO internships (
          student_id, mentor_id, mentor_email, company_id, start_date,
          end_date, required_hours, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'planned')
      `)
      .run(
        studentId,
        mentorAccount?.id || null,
        normalizedMentorEmail,
        company.id,
        startDate,
        endDate || null,
        parsedHours
      );

    db.exec("COMMIT;");
    transactionStarted = false;

    res.status(201).json({
      id: Number(result.lastInsertRowid),
      mentor_id: mentorAccount?.id || null,
      mentor_email: normalizedMentorEmail,
      mentor_name: null,
      company_name: normalizedCompany,
      company_city: normalizedCity,
      start_date: startDate,
      end_date: endDate || null,
      required_hours: parsedHours,
      status: "planned",
    });
  } catch (error) {
    if (transactionStarted) {
      db.exec("ROLLBACK;");
    }
    console.error("Greška pri stvaranju prakse:", error);
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Već imate praksu u tijeku ili na čekanju." });
    }
    res.status(500).json({ error: "Praksu nije moguće spremiti." });
  }
});

app.patch("/users/current", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { fullName, email, facultyName, currentPassword, newPassword, updatedAt } = req.body;
  const normalizedName = typeof fullName === "string"
    ? fullName.trim().replace(/\s+/g, " ")
    : "";
  const nameParts = normalizedName.split(" ").filter(Boolean);
  const normalizedEmail = typeof email === "string"
    ? email.trim().toLowerCase()
    : "";
  const changesPassword = Boolean(currentPassword || newPassword);

  if (nameParts.length < 2) {
    return res.status(400).json({ error: "Unesite ime i prezime." });
  }

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: "Unesite ispravnu email adresu." });
  }

  if (typeof updatedAt !== "string" || !updatedAt) {
    return res.status(400).json({ error: "Nedostaje verzija korisničkog profila." });
  }

  if (
    changesPassword &&
    (
      typeof currentPassword !== "string" ||
      !currentPassword ||
      typeof newPassword !== "string" ||
      newPassword.length < 8
    )
  ) {
    return res.status(400).json({
      error: "Za promjenu lozinke unesite trenutnu lozinku i novu lozinku od najmanje 8 znakova.",
    });
  }

  try {
    const user = db
      .prepare(`
        SELECT id, password_hash
        FROM users
        WHERE id = ?
          AND is_active = 1
      `)
      .get(userId);

    if (!user) {
      return res.status(404).json({ error: "Korisnik nije pronađen." });
    }

    let passwordHash = user.password_hash;

    if (changesPassword) {
      const passwordMatches = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );

      if (!passwordMatches) {
        return res.status(400).json({
          error: "Trenutna lozinka nije ispravna.",
        });
      }

      passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const firstName = nameParts.shift();
    const lastName = nameParts.join(" ");

    const result = db
      .prepare(`
        UPDATE users
        SET
          first_name = ?,
          last_name = ?,
          email = ?,
          faculty_name = ?,
          password_hash = ?,
          updated_at = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
        WHERE id = ?
          AND updated_at = ?
      `)
      .run(
        firstName,
        lastName,
        normalizedEmail,
        req.user.role === "student" && typeof facultyName === "string"
          ? facultyName.trim() || null
          : null,
        passwordHash,
        userId,
        updatedAt
      );

    if (result.changes !== 1) {
      return res.status(409).json({
        error: "Račun je promijenjen drugim zahtjevom. Osvježite stranicu i pokušajte ponovno.",
      });
    }

    const updatedUser = db
      .prepare(`
        SELECT id, first_name, last_name, email, role, faculty_name, updated_at
        FROM users
        WHERE id = ?
      `)
      .get(userId);

    res.json({
      message: changesPassword
        ? "Profil i lozinka uspješno su spremljeni."
        : "Profil je uspješno spremljen.",
      user: {
        id: updatedUser.id,
        fullName: `${updatedUser.first_name} ${updatedUser.last_name}`,
        email: updatedUser.email,
        role: updatedUser.role,
        facultyName: updatedUser.faculty_name || "",
        updatedAt: updatedUser.updated_at,
        internshipStatus: getInternshipStatus(updatedUser),
      },
    });
  } catch (error) {
    console.error("Greška pri spremanju profila:", error);

    if (String(error.message).includes("UNIQUE constraint failed: users.email")) {
      return res.status(409).json({
        error: "Korisnik s tom email adresom već postoji.",
      });
    }

    res.status(500).json({ error: "Profil nije moguće spremiti." });
  }
});

app.get("/internships/active", authenticateToken, (req, res) => {
  try {
    const studentId = req.user.userId;

    const internship = db
      .prepare(`
        SELECT
          i.id,
          i.mentor_id,
          c.name AS company_name,
          u.first_name || ' ' || u.last_name AS mentor_name,
          i.start_date,
          i.end_date,
          i.required_hours,
          i.status,
          i.updated_at
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

app.patch("/internships/active", authenticateToken, (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({
      error: "Pristup je dopušten samo studentima.",
    });
  }

  const studentId = req.user.userId;
  const { startDate, endDate, requiredHours, updatedAt } = req.body;
  const parsedHours = Number(requiredHours);

  if (
    !Number.isFinite(parsedHours) ||
    parsedHours <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate || "") ||
    (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) ||
    (endDate && endDate < startDate) ||
    typeof updatedAt !== "string" ||
    !updatedAt
  ) {
    return res.status(400).json({
      error: "Unesite ispravne podatke o stručnoj praksi.",
    });
  }

  try {
    const currentInternship = db
      .prepare(`
        SELECT
          i.id,
          COALESCE(SUM(e.hours), 0) AS completed_hours,
          MIN(e.entry_date) AS first_entry_date,
          MAX(e.entry_date) AS last_entry_date
        FROM internships AS i
        LEFT JOIN entries AS e ON e.internship_id = i.id
        WHERE i.student_id = ? AND i.status = 'active'
        GROUP BY i.id
      `)
      .get(studentId);

    if (!currentInternship) {
      return res.status(404).json({ error: "Aktivna praksa nije pronađena." });
    }

    if (parsedHours < currentInternship.completed_hours) {
      return res.status(400).json({
        error: `Potrebni sati ne mogu biti manji od već evidentiranih ${currentInternship.completed_hours} sati.`,
      });
    }

    if (
      (currentInternship.first_entry_date && startDate > currentInternship.first_entry_date) ||
      (endDate && currentInternship.last_entry_date && endDate < currentInternship.last_entry_date)
    ) {
      return res.status(400).json({
        error: "Razdoblje prakse mora obuhvatiti sve postojeće zapise u dnevniku.",
      });
    }

    const result = db
      .prepare(`
        UPDATE internships
        SET
          start_date = ?,
          end_date = ?,
          required_hours = ?,
          updated_at = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
        WHERE student_id = ?
          AND status = 'active'
          AND updated_at = ?
      `)
      .run(
        startDate,
        endDate || null,
        parsedHours,
        studentId,
        updatedAt
      );

    if (result.changes !== 1) {
      return res.status(409).json({
        error: "Praksa je promijenjena drugim zahtjevom. Osvježite stranicu i pokušajte ponovno.",
      });
    }

    const internship = db
      .prepare(`
        SELECT
          i.id,
          i.mentor_id,
          c.name AS company_name,
          u.first_name || ' ' || u.last_name AS mentor_name,
          i.start_date,
          i.end_date,
          i.required_hours,
          i.status,
          i.updated_at
        FROM internships AS i
        INNER JOIN companies AS c ON i.company_id = c.id
        INNER JOIN users AS u ON i.mentor_id = u.id
        WHERE i.student_id = ? AND i.status = 'active'
      `)
      .get(studentId);

    res.json(internship);
  } catch (error) {
    console.error("Greška pri uređivanju prakse:", error);
    res.status(500).json({ error: "Praksu nije moguće spremiti." });
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
  const docInfo = normalizeDocumentInfo(req.body.docInfo);

  if (!docInfo) {
    return res.status(400).json({
      error: "Unesite naziv fakulteta ili visokog učilišta.",
    });
  }

  const requestId = require("crypto").randomUUID();

  const tempDataPath = path.join(
    storagePath,
    `temp_data_${requestId}.json`
  );

  const tempDocumentPath = path.join(
    storagePath,
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
  const docInfo = normalizeDocumentInfo(req.body.docInfo);

  if (!docInfo) {
    return res.status(400).json({
      error: "Unesite naziv fakulteta ili visokog učilišta.",
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

    const documentsDirectory = path.join(storagePath, "documents");

    if (!fs.existsSync(documentsDirectory)) {
      fs.mkdirSync(documentsDirectory);
    }

    tempPath = path.join(
      storagePath,
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

app.get("/admin/dashboard", authenticateToken, (req, res) => {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ error: "Pristup je dopušten samo superadminu." });
  }

  try {
    const summary = {
      users: db.prepare("SELECT COUNT(*) AS count FROM users").get().count,
      internships: db.prepare("SELECT COUNT(*) AS count FROM internships").get().count,
      entries: db.prepare("SELECT COUNT(*) AS count FROM entries").get().count,
      documents: db.prepare("SELECT COUNT(*) AS count FROM documents").get().count,
    };

    const users = db.prepare(`
      SELECT
        id,
        first_name || ' ' || last_name AS full_name,
        email,
        role,
        faculty_name,
        is_active,
        created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    const internships = db.prepare(`
      SELECT
        i.id,
        student.first_name || ' ' || student.last_name AS student_name,
        COALESCE(mentor.first_name || ' ' || mentor.last_name, i.mentor_email) AS mentor_name,
        c.name AS company_name,
        i.start_date,
        i.end_date,
        i.required_hours,
        i.status
      FROM internships AS i
      INNER JOIN users AS student ON i.student_id = student.id
      LEFT JOIN users AS mentor ON i.mentor_id = mentor.id
      INNER JOIN companies AS c ON i.company_id = c.id
      ORDER BY i.created_at DESC
    `).all();

    const entries = db.prepare(`
      SELECT
        e.id,
        student.first_name || ' ' || student.last_name AS student_name,
        e.entry_date,
        e.activity_type,
        e.hours,
        e.description
      FROM entries AS e
      INNER JOIN internships AS i ON e.internship_id = i.id
      INNER JOIN users AS student ON i.student_id = student.id
      ORDER BY e.entry_date DESC, e.id DESC
    `).all();

    const documents = db.prepare(`
      SELECT
        d.id,
        student.first_name || ' ' || student.last_name AS student_name,
        d.status,
        d.version_number,
        d.file_name,
        d.submitted_at
      FROM documents AS d
      INNER JOIN internships AS i ON d.internship_id = i.id
      INNER JOIN users AS student ON i.student_id = student.id
      ORDER BY d.updated_at DESC
    `).all();

    res.json({ summary, users, internships, entries, documents });
  } catch (error) {
    console.error("Greška pri dohvaćanju superadmin podataka:", error);
    res.status(500).json({ error: "Nije moguće dohvatiti superadmin podatke." });
  }
});

app.get("/mentor/dashboard", authenticateToken, (req, res) => {
  try {
    const mentorId = req.user.userId;

    if (req.user.role !== "mentor") {
      return res.status(403).json({
        error: "Pristup je dopušten samo mentorima.",
      });
    }

    const mentor = db
      .prepare("SELECT email FROM users WHERE id = ?")
      .get(mentorId);

    const invitations = db
      .prepare(`
        SELECT
          i.id,
          student.id AS student_id,
          student.first_name || ' ' || student.last_name AS student_name,
          student.email AS student_email,
          c.name AS company_name,
          c.city AS company_city,
          i.start_date,
          i.end_date,
          i.required_hours
        FROM internships AS i
        INNER JOIN users AS student ON i.student_id = student.id
        INNER JOIN companies AS c ON i.company_id = c.id
        WHERE (i.mentor_id = ? OR LOWER(i.mentor_email) = LOWER(?))
          AND i.status = 'planned'
        ORDER BY i.created_at DESC
      `)
      .all(mentorId, mentor.email);

    const students = db
      .prepare(`
        SELECT
          student.id,
          student.first_name || ' ' || student.last_name AS full_name,
          student.email,
          c.name AS company_name,
          i.start_date,
          i.end_date,
          i.required_hours,
          i.status,
          COALESCE(SUM(e.hours), 0) AS completed_hours
        FROM internships AS i
        INNER JOIN users AS student
          ON i.student_id = student.id
        INNER JOIN companies AS c
          ON i.company_id = c.id
        LEFT JOIN entries AS e
          ON e.internship_id = i.id
        WHERE i.mentor_id = ?
          AND i.status IN ('active', 'completed')
        GROUP BY i.id
        ORDER BY
          CASE i.status
            WHEN 'active' THEN 1
            WHEN 'planned' THEN 2
            WHEN 'completed' THEN 3
            ELSE 4
          END,
          student.first_name,
          student.last_name
      `)
      .all(mentorId);

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
          AND d.status <> 'draft'
        ORDER BY d.submitted_at DESC
      `)
      .all(mentorId);

    res.json({ invitations, students, documents });
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

app.patch("/mentor/invitations/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "mentor") {
    return res.status(403).json({ error: "Pristup je dopušten samo mentorima." });
  }

  const invitationId = Number(req.params.id);
  const { decision } = req.body;

  if (!Number.isInteger(invitationId) || !["accept", "reject"].includes(decision)) {
    return res.status(400).json({ error: "Odluka nije ispravna." });
  }

  try {
    const mentor = db
      .prepare("SELECT email FROM users WHERE id = ? AND is_active = 1")
      .get(req.user.userId);

    const result = db
      .prepare(`
        UPDATE internships
        SET
          mentor_id = ?,
          status = ?,
          updated_at = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
        WHERE id = ?
          AND (mentor_id = ? OR LOWER(mentor_email) = LOWER(?))
          AND status = 'planned'
      `)
      .run(
        decision === "accept" ? req.user.userId : null,
        decision === "accept" ? "active" : "cancelled",
        invitationId,
        req.user.userId,
        mentor.email
      );

    if (result.changes !== 1) {
      return res.status(409).json({
        error: "Poziv je već obrađen ili više nije dostupan.",
      });
    }

    res.json({
      id: invitationId,
      status: decision === "accept" ? "active" : "cancelled",
    });
  } catch (error) {
    console.error("Greška pri obradi poziva:", error);
    res.status(500).json({ error: "Poziv nije moguće obraditi." });
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

    const result = db.prepare(`
      UPDATE documents
      SET
        status = 'approved',
        approved_at = CURRENT_TIMESTAMP,
        approved_by = ?,
        mentor_comment = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND status = 'pending'
    `).run(mentorId, documentId);

    if (result.changes !== 1) {
      return res.status(409).json({
        error: "Dokument je već obrađen drugim zahtjevom.",
      });
    }

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

    const result = db.prepare(`
      UPDATE documents
      SET
        status = 'rejected',
        approved_at = NULL,
        approved_by = NULL,
        mentor_comment = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND status = 'pending'
    `).run(comment.trim(), documentId);

    if (result.changes !== 1) {
      return res.status(409).json({
        error: "Dokument je već obrađen drugim zahtjevom.",
      });
    }

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


const frontendPath = path.join(__dirname, "..", "dist");

app.use(express.static(frontendPath));
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Backend radi na http://localhost:${PORT}`);
});
