import { openDatabaseSync } from 'expo-sqlite';
import { createVersesTable, initialVerses, Verse } from './schema';

const db = openDatabaseSync('wordle.db');

export const initDatabase = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        console.log('Starting database initialization...');

        // Enable WAL mode for better performance
        db.execAsync('PRAGMA journal_mode = WAL')
            .then(() => {
                // Create table and insert data
                return db.execAsync(createVersesTable);
            })
            .then(() => {
                console.log('Table created successfully');
                return db.execAsync(initialVerses);
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

