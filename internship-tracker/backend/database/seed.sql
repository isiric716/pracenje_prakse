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
    faculty_name,
    first_name,
    last_name,
    email,
    password_hash,
    role
)
VALUES
    (
        2,
        'FERIT',
        'Ivona',
        'Student',
        'ivona@student.hr',
        '$2b$10$8jBFcroH0AAXolJ7shpuiO9WEqxVdZbrS7LFJ9kTsehpcxuxyqrk2',
        'student'
    ),
    (
        3,
        NULL,
        'Marko',
        'Mentor',
        'marko@be-terna.com',
        '$2b$10$ReVEbhph9zO1ix4YPTElK.jbQR2W/66U4V1.OcuY7rLrRDicS5bzy',
        'mentor'
    );

INSERT OR IGNORE INTO internships (
    id,
    student_id,
    mentor_id,
    mentor_email,
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
        'marko@be-terna.com',
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
