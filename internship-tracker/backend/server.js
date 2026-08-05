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
  res.json(entries);
});

app.get("/mentors/:mentorId/entries", (req, res) => {
  const mentorId = Number(req.params.mentorId);

  const mentorEntries = entries.filter(
    (entry) => entry.mentorId === mentorId
  );

  res.json(mentorEntries);
});

app.post("/entries", (req, res) => {
  const newEntry = {
    id: Date.now(),
    ...req.body,
    status: "pending",
  };

  entries.push(newEntry);
  res.json(newEntry);
});

app.put("/entries/:id", (req, res) => {
  const id = Number(req.params.id);

  entries = entries.map((entry) =>
    entry.id === id ? { ...entry, ...req.body } : entry
  );

  const updatedEntry = entries.find((entry) => entry.id === id);
  res.json(updatedEntry);
});

app.patch("/entries/:id/approve", (req, res) => {
  const id = Number(req.params.id);

  entries = entries.map((entry) =>
    entry.id === id ? { ...entry, status: "approved" } : entry
  );

  const approvedEntry = entries.find((entry) => entry.id === id);

  res.json(approvedEntry);
});

app.delete("/entries/:id", (req, res) => {
  const id = Number(req.params.id);
  entries = entries.filter((entry) => entry.id !== id);

  res.json({ message: "Zapis obrisan" });
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