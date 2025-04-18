export interface Speaker {
    id: number;
    hint: string;
    answer: string;
    category?: string;
}

export interface VerseReference {
    id: number;      /* Sequential ID (1 for Genesis 1:1, 2 for Genesis 1:2, etc.) */
    book: string;
    chapter: string;
    verse: string;
    text: string;    /* The actual verse text */
    verse_id: number;
}

export const createSpeakerTable = `
    CREATE TABLE IF NOT EXISTS speakers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hint TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT
    );
    DELETE FROM speakers;
`;

export const createReferencesTable = `
    CREATE TABLE IF NOT EXISTS verse_references (
        id INTEGER PRIMARY KEY,
        book TEXT NOT NULL,
        chapter TEXT NOT NULL,
        verse TEXT NOT NULL,
        text TEXT NOT NULL,
        verse_id INTEGER,
        FOREIGN KEY (verse_id) REFERENCES speakers (id)
    );
    DELETE FROM verse_references;
`;

export const insertReferences = `
    INSERT INTO verse_references (id, book, chapter, verse, text, verse_id) VALUES
    (1, 'Genesis', '01', '01', 'In the beginning God created the heavens and the earth.', NULL),
    (2, 'Genesis', '01', '02', 'Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.', NULL),
    (3, 'Genesis', '01', '03', 'And God said, "Let there be light," and there was light.', NULL),
    (4, 'Genesis', '01', '04', 'God saw that the light was good, and he separated the light from the darkness.', NULL),
    (5, 'Genesis', '01', '05', 'God called the light "day," and the darkness he called "night." And there was evening, and there was morning—the first day.', NULL)
`;

export const initialSpeakers = `
    INSERT INTO speakers (id, hint, answer, category) VALUES
    (1, 'I am the way, and the truth, and the life. No one comes to the Father except through me.', 'Jesus', 'New Testament'),
    (2, 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.', 'John', 'New Testament'),
    (3, 'The Lord is my shepherd, I lack nothing.', 'David', 'Old Testament'),
    (4, 'In the beginning God created the heavens and the earth.', 'Moses', 'Old Testament'),
    (5, 'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.', 'Joshua', 'Old Testament')
`; 