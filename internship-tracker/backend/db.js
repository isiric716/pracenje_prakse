const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const databasePath = path.join(
  __dirname,
  "database",
  "internship.db"
);

const createTablesPath = path.join(
  __dirname,
  "database",
  "createTables.sql"
);

const seedPath = path.join(
  __dirname,
  "database",
  "seed.sql"
);

const db = new DatabaseSync(databasePath);

db.exec("PRAGMA foreign_keys = ON;");

const createTablesScript = fs.readFileSync(
  createTablesPath,
  "utf8"
);

const seedScript = fs.readFileSync(
  seedPath,
  "utf8"
);

try {
  db.exec(createTablesScript);
  db.exec(seedScript);

  console.log("SQLite baza uspješno inicijalizirana.");
} catch (error) {
  console.error("Greška pri inicijalizaciji SQLite baze:");
  console.error(error);

  throw error;
}

module.exports = db;