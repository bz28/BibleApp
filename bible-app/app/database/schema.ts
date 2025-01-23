export interface Verse {
    id: number;
    hint: string;
    answer: string;
    category?: string;
}

export const createVersesTable = `
    CREATE TABLE IF NOT EXISTS verses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hint TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT
    );
    DELETE FROM verses;
`;

export const initialVerses = `
    INSERT INTO verses (hint, answer, category) VALUES
    ('I am the way, and the truth, and the life. No one comes to the Father except through me.', 'Jesus', 'New Testament'),
    ('For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.', 'John', 'New Testament'),
    ('Eye for eye, tooth for tooth, hand for hand, foot for foot, burn for burn, wound for wound, bruise for bruise', 'Moses', 'Old Testament'),
    ('I am the good shepherd. The good shepherd lays down his life for the sheep.', 'Jesus', 'New Testament'),
    ('I heard thy voice in the garden, and I was afraid, because I was naked; and I hid myself', 'Adam', 'Old Testament'),
    ('Behold the Lamb of God who takes away the sin of the world', 'John', 'New Testament'),
    ('From then on ___ watched for an opportunity to hand him over.', 'Judas', 'New Testament'),
    ('I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit: for without me ye can do nothing', 'John', 'New Testament'),
    ('I can do all things through Christ who strengthens me', 'Paul', 'New Testament'),
    ('Are You the King of the Jews?', 'Pilate', 'New Testament');
`; 