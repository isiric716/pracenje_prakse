PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS faculties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    oib TEXT UNIQUE,
    address TEXT,
    city TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    website TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_id INTEGER,
    company_id INTEGER,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    role TEXT NOT NULL
        CHECK (
            role IN (
                'student',
                'mentor',
                'super_admin'
            )
        ),

    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (faculty_id)
        REFERENCES faculties(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CHECK (
        (
            role = 'student'
            AND faculty_id IS NOT NULL
            AND company_id IS NULL
        )
        OR
        (
            role = 'mentor'
            AND faculty_id IS NULL
            AND company_id IS NOT NULL
        )
        OR
        (
            role = 'super_admin'
            AND faculty_id IS NULL
            AND company_id IS NULL
        )
    )
);

CREATE TABLE IF NOT EXISTS internships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    mentor_id INTEGER,
    company_id INTEGER NOT NULL,

    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,

    required_hours REAL NOT NULL
        CHECK (required_hours > 0),

    status TEXT NOT NULL DEFAULT 'planned'
        CHECK (
            status IN (
                'planned',
                'active',
                'completed',
                'cancelled'
            )
        ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (mentor_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CHECK (end_date >= start_date),

    CHECK (
        status IN ('planned', 'cancelled')
        OR mentor_id IS NOT NULL
    )
);


/* Student može imati više praksi kroz vrijeme,
   ali samo jednu aktivnu praksu. */

CREATE UNIQUE INDEX IF NOT EXISTS
    one_active_internship_per_student
ON internships(student_id)
WHERE status = 'active';



CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    internship_id INTEGER NOT NULL,
    entry_date TEXT NOT NULL,
    mentor_comment TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
        status IN (
            'pending',
            'approved',
            'rejected'
        )
    ),

    hours REAL NOT NULL
        CHECK (hours > 0 AND hours <= 24),

    description TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (internship_id)
        REFERENCES internships(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);



CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    internship_id INTEGER NOT NULL UNIQUE,

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (
            status IN (
                'draft',
                'pending',
                'rejected',
                'approved'
            )
        ),

    version_number INTEGER NOT NULL DEFAULT 1
        CHECK (version_number > 0),

    file_name TEXT,
    file_path TEXT,

    submitted_at TEXT,
    approved_at TEXT,
    approved_by INTEGER,

    mentor_comment TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (internship_id)
        REFERENCES internships(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    FOREIGN KEY (approved_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CHECK (
        status <> 'approved'
        OR (
            approved_by IS NOT NULL
            AND approved_at IS NOT NULL
        )
    )
);