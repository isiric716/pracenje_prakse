INSERT OR IGNORE INTO faculties (id, name, city)
VALUES
    (1, 'FERIT', 'Osijek'),
    (2, 'FOI', 'Varaždin'),
    (3, 'FER', 'Zagreb');

INSERT OR IGNORE INTO companies (
    id,
    name,
    oib,
    address,
    city,
    email,
    phone,
    website
)
VALUES
    (
        1,
        'BE-terna d.o.o.',
        '12345678901',
        'Primjer adrese 1',
        'Zagreb',
        'info@be-terna.com',
        '+385 1 0000 000',
        'https://www.be-terna.com'
    ),
    (
        2,
        'Infobip d.o.o.',
        '10964060453',
        'Utinjska 29',
        'Vodnjan',
        'info@infobip.com',
        NULL,
        'https://www.infobip.com'
    );

INSERT OR IGNORE INTO users (
    id,
    faculty_id,
    company_id,
    first_name,
    last_name,
    email,
    password_hash,
    role
)
VALUES
    (
        1,
        NULL,
        NULL,
        'Super',
        'Administrator',
        'admin@practice-app.hr',
        'TEMP_HASH_ADMIN',
        'super_admin'
    ),
    (
        2,
        1,
        NULL,
        'Ivona',
        'Student',
        'ivona@student.hr',
        'TEMP_HASH_STUDENT',
        'student'
    ),
    (
        3,
        NULL,
        1,
        'Marko',
        'Mentor',
        'marko@be-terna.com',
        'TEMP_HASH_MENTOR',
        'mentor'
    );

INSERT OR IGNORE INTO internships (
    id,
    student_id,
    mentor_id,
    company_id,
    start_date,
    end_date,
    required_hours,
    status
)
VALUES
    (
        1,
        2,
        3,
        1,
        '2026-05-01',
        '2026-07-31',
        300,
        'active'
    );

INSERT OR IGNORE INTO documents (
    id,
    internship_id,
    status,
    version_number
)
VALUES
    (
        1,
        1,
        'draft',
        1
    );