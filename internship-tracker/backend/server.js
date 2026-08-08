const express = require("express");
const cors = require("cors");
const db = require("./db");
const app = express();

app.use(cors());
app.use(express.json());

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

app.get("/entries", (req, res) => {
  try {
    const entries = db
      .prepare(`
        SELECT id, internship_id, entry_date, mentor_comment, status, hours, description
        FROM entries
        ORDER BY entry_date DESC
      `)
      .all();

    res.json(entries);
  } catch (error) {
    console.error("Greška pri dohvaćanju zapis:", error);

    res.status(500).json({
      error: "Nije moguće dohvatiti zapise.",
    });
  }
});

app.post("/entries", (req, res) => {
  try {
    const studentId = 2;

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

app.put("/entries/:id", (req, res) => {
  try {
    const studentId = 2;
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

app.delete("/entries/:id", (req, res) => {
  try {
    const studentId = 2;
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



const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

app.post("/generate-doc", (req, res) => {
  const { student, docInfo } = req.body;
  const studentId = req.body.studentId || 1;

  const studentEntries = entries.filter((e) => e.studentId === studentId);

  const data = { student, docInfo, entries: studentEntries };
  const outputPath = path.join(__dirname, "dnevnik_prakse.docx");
  const scriptPath = path.join(__dirname, "generateDoc.js");
  const tempPath = path.join(__dirname, "temp_data.json");

  try {
    fs.writeFileSync(tempPath, JSON.stringify(data));
    execSync(`node "${scriptPath}" "${tempPath}" "${outputPath}"`);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.download(outputPath, "Dnevnik_strucne_prakse.docx", () => {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Greška pri generiranju dokumenta" });
  }
});

app.listen(3001, () => {
  console.log("Backend radi na http://localhost:3001");
});