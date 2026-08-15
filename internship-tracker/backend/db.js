const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const databasePath = process.env.DATABASE_PATH || path.join(
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

function migrateDatabase() {
  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  const internshipColumns = db.prepare("PRAGMA table_info(internships)").all();
  const entryColumns = db.prepare("PRAGMA table_info(entries)").all();
  const hasFacultyName = userColumns.some((column) => column.name === "faculty_name");
  const usersNeedMigration =
    !hasFacultyName ||
    userColumns.some((column) => ["faculty_id", "company_id"].includes(column.name));
  const facultyNameSource = hasFacultyName
    ? "COALESCE(u.faculty_name, (SELECT f.name FROM faculties AS f WHERE f.id = u.faculty_id))"
    : "(SELECT f.name FROM faculties AS f WHERE f.id = u.faculty_id)";
  const endDateColumn = internshipColumns.find((column) => column.name === "end_date");
  const internshipsNeedMigration =
    !internshipColumns.some((column) => column.name === "mentor_email") ||
    endDateColumn?.notnull === 1;
  const entriesNeedMigration =
    !entryColumns.some((column) => column.name === "activity_type");

  if (!usersNeedMigration && !internshipsNeedMigration && !entriesNeedMigration) {
    return;
  }

  db.exec("PRAGMA foreign_keys = OFF;");

  try {
    db.exec("BEGIN IMMEDIATE;");

    if (usersNeedMigration) {
      db.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          faculty_name TEXT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('student', 'mentor', 'super_admin')),
          is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO users_new (
          id, faculty_name, first_name, last_name,
          email, password_hash, role, is_active, created_at, updated_at
        )
        SELECT
          u.id,
          ${facultyNameSource},
          u.first_name,
          u.last_name,
          u.email,
          u.password_hash,
          u.role,
          u.is_active,
          u.created_at,
          u.updated_at
        FROM users AS u;

        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
    }

    if (internshipsNeedMigration) {
      db.exec(`
        CREATE TABLE internships_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          mentor_id INTEGER,
          mentor_email TEXT,
          company_id INTEGER NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT,
          required_hours REAL NOT NULL CHECK (required_hours > 0),
          status TEXT NOT NULL DEFAULT 'planned'
            CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          FOREIGN KEY (mentor_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          CHECK (end_date IS NULL OR end_date >= start_date)
        );

        INSERT INTO internships_new (
          id, student_id, mentor_id, mentor_email, company_id, start_date,
          end_date, required_hours, status, created_at, updated_at
        )
        SELECT
          i.id,
          i.student_id,
          i.mentor_id,
          (SELECT u.email FROM users AS u WHERE u.id = i.mentor_id),
          i.company_id,
          i.start_date,
          i.end_date,
          i.required_hours,
          i.status,
          i.created_at,
          i.updated_at
        FROM internships AS i;

        DROP TABLE internships;
        ALTER TABLE internships_new RENAME TO internships;

        CREATE UNIQUE INDEX one_current_internship_per_student
        ON internships(student_id)
        WHERE status IN ('planned', 'active');
      `);
    }

    if (entriesNeedMigration) {
      db.exec(`
        CREATE TABLE entries_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          internship_id INTEGER NOT NULL,
          entry_date TEXT NOT NULL,
          activity_type TEXT NOT NULL
            CHECK (activity_type IN ('development', 'testing', 'documentation', 'other')),
          hours REAL NOT NULL CHECK (hours > 0 AND hours <= 24),
          description TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (internship_id) REFERENCES internships(id)
            ON UPDATE CASCADE ON DELETE CASCADE
        );

        INSERT INTO entries_new (
          id, internship_id, entry_date, activity_type, hours,
          description, created_at, updated_at
        )
        SELECT
          id, internship_id, entry_date, 'other', hours,
          description, created_at, updated_at
        FROM entries;

        DROP TABLE entries;
        ALTER TABLE entries_new RENAME TO entries;
      `);
    }

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  } finally {
    db.exec("PRAGMA foreign_keys = ON;");
  }
}

function syncSuperAdmin() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email && !password) {
    return;
  }

  if (!email || !password) {
    throw new Error("SUPERADMIN_EMAIL i SUPERADMIN_PASSWORD moraju biti zajedno postavljeni.");
  }

  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12) {
    throw new Error("Superadmin mora imati ispravan email i lozinku od najmanje 12 znakova.");
  }

  const existingUser = db
    .prepare("SELECT id, role, password_hash FROM users WHERE LOWER(email) = ?")
    .get(email);

  if (existingUser && existingUser.role !== "super_admin") {
    throw new Error("SUPERADMIN_EMAIL već pripada drugom korisniku.");
  }

  if (!existingUser) {
    db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, role)
      VALUES ('Super', 'Administrator', ?, ?, 'super_admin')
    `).run(email, bcrypt.hashSync(password, 12));
  } else if (!bcrypt.compareSync(password, existingUser.password_hash)) {
    db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(bcrypt.hashSync(password, 12), existingUser.id);
  }

  db.prepare(`
    DELETE FROM users
    WHERE role = 'super_admin'
      AND email = 'admin@practice-app.hr'
      AND LOWER(email) <> ?
  `).run(email);
}

try {
  db.exec(createTablesScript);
  migrateDatabase();

  db.exec(`
    DROP INDEX IF EXISTS one_active_internship_per_student;
    CREATE UNIQUE INDEX IF NOT EXISTS one_current_internship_per_student
    ON internships(student_id)
    WHERE status IN ('planned', 'active');
    DROP TABLE IF EXISTS faculties;
  `);
  db.exec(seedScript);
  syncSuperAdmin();

  console.log("SQLite baza uspješno inicijalizirana.");
} catch (error) {
  console.error("Greška pri inicijalizaciji SQLite baze:");
  console.error(error);

  throw error;
}

module.exports = db;
