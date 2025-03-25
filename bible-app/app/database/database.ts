import { openDatabaseSync } from 'expo-sqlite';
import { createVersesTable, createReferencesTable, initialVerses, insertReferences, Verse, VerseReference } from './schema';

const db = openDatabaseSync('wordle.db');

export const initDatabase = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        console.log('Starting database initialization...');

        // Enable WAL mode for better performance
        db.execAsync('PRAGMA journal_mode = WAL')
            .then(() => {
                // Create tables and insert data
                return db.execAsync(createVersesTable);
            })
            .then(() => {
                return db.execAsync(createReferencesTable);
            })
            .then(() => {
                console.log('Tables created successfully');
                return db.execAsync(initialVerses);
            })
            .then(() => {
                return db.execAsync(insertReferences);
            })
            .then(() => {
                console.log('Database initialized successfully');
                resolve(true);
            })
            .catch(error => {
                console.error('Error initializing database:', error);
                reject(error);
            });
    });
};

export const getRandomVerse = (): Promise<Verse> => {
    return new Promise((resolve, reject) => {
        db.getFirstAsync<Verse>('SELECT * FROM verses ORDER BY RANDOM() LIMIT 1')
            .then(verse => {
                if (verse) {
                    resolve(verse);
                } else {
                    reject(new Error('No verse found'));
                }
            })
            .catch(error => {
                console.error('Error getting random verse:', error);
                reject(error);
            });
    });
};

export const getRandomVerseReference = (): Promise<VerseReference> => {
    return new Promise((resolve, reject) => {
        db.getFirstAsync<VerseReference>('SELECT * FROM verse_references ORDER BY RANDOM() LIMIT 1')
            .then(reference => {
                if (reference) {
                    resolve(reference);
                } else {
                    reject(new Error('No verse reference found'));
                }
            })
            .catch(error => {
                console.error('Error getting random verse reference:', error);
                reject(error);
            });
    });
};

// Optional: Get a specific verse reference by ID
export const getVerseReferenceById = (id: number): Promise<VerseReference> => {
    return new Promise((resolve, reject) => {
        db.getFirstAsync<VerseReference>('SELECT * FROM verse_references WHERE id = ?', [id])
            .then(reference => {
                if (reference) {
                    resolve(reference);
                } else {
                    reject(new Error('No verse reference found with that ID'));
                }
            })
            .catch(error => {
                console.error('Error getting verse reference:', error);
                reject(error);
            });
    });
};

