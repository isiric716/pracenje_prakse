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

app.get("/users/current", (req, res) => {
  try {
    const studentId = 2;

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

app.get("/internships/active", (req, res) => {
  try {
    const studentId = 2;

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
  try {
    const studentId = 2;
    const { docInfo } = req.body;

    if (!docInfo) {
      return res.status(400).json({
        error: "Nedostaju podaci za dokument.",
      });
    }

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

    const student = {
      fullName: `${internship.student_first_name} ${internship.student_last_name}`,
    };

    const documentInfo = {
      ...docInfo,
      companyName: `${internship.company_name}, ${internship.company_city}`,
      mentor: `${internship.mentor_first_name} ${internship.mentor_last_name}`,
      mentorEmail: internship.mentor_email,
      startDate: internship.start_date,
      endDate: internship.end_date,
    };

    const data = {
      student,
      docInfo: documentInfo,
      entries: studentEntries,
    };

    const requestId = require("crypto").randomUUID();

    const tempPath = path.join(
      __dirname,
      `temp_data_${requestId}.json`
    );

    const outputPath = path.join(
      __dirname,
      `dnevnik_prakse_${requestId}.docx`
    );

    const scriptPath = path.join(__dirname, "generateDoc.js");

    fs.writeFileSync(tempPath, JSON.stringify(data));

    execSync(
      `node "${scriptPath}" "${tempPath}" "${outputPath}"`
    );

    fs.unlinkSync(tempPath);

    res.download(
      outputPath,
      "Dnevnik_strucne_prakse.docx",
      (error) => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }

        if (error) {
          console.error("Greška pri preuzimanju dokumenta:", error);
        }
      }
    );
  } catch (error) {
    console.error("Greška pri generiranju dokumenta:", error);

    res.status(500).json({
      error: "Greška pri generiranju dokumenta.",
    });
  }
});


app.listen(3001, () => {
  console.log("Backend radi na http://localhost:3001");
});