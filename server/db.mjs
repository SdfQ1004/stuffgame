// server/db.mjs
// --- FINAL CORRECTED VERSION ---

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';
import cardData from './card-data.json' with { type: 'json' };

const DB_FILE = './stuffhappens.db';

// This promise is created once and represents the connection to the database.
// All parts of the app will share this single connection promise.
const dbPromise = open({
    filename: DB_FILE,
    driver: sqlite3.Database
});

/**
 * Initializes the database tables and preloads data if necessary.
 * This function should be called ONCE when the server starts.
 * It uses the shared dbPromise and does NOT close the connection.
 */
export async function initializeDatabase() {
    const db = await dbPromise; // Get the connection from the shared promise

    // Enable foreign key support
    await db.run('PRAGMA foreign_keys = ON;');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            salt TEXT NOT NULL
        );
    `);
    console.log('Table "users" ensured.');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            image TEXT NOT NULL,
            bad_luck_index REAL UNIQUE NOT NULL,
            theme TEXT NOT NULL
        );
    `);
    console.log('Table "cards" ensured.');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            outcome TEXT NOT NULL,
            cards_collected INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);
    console.log('Table "games" ensured.');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS game_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            card_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            round INTEGER,
            guess_time TEXT,
            is_correct_guess INTEGER,
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
            UNIQUE (game_id, card_id)
        );
    `);
    console.log('Table "game_cards" ensured.');

    // --- Preload Data ---

    const cardCount = await db.get('SELECT COUNT(*) as count FROM cards');
    if (cardCount.count === 0) {
        console.log('Preloading cards data...');
        const insertCardStmt = await db.prepare(
            'INSERT INTO cards (name, image, bad_luck_index, theme) VALUES (?, ?, ?, ?)'
        );
        for (const card of cardData) {
            await insertCardStmt.run(card.name, card.image, card.bad_luck_index, "University Life");
        }
        await insertCardStmt.finalize();
        console.log('Cards preloaded successfully.');
    } else {
        console.log('Cards already exist, skipping preload.');
    }

    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
        console.log('Preloading users data...');
        const usersToPreload = [
            { username: 'player1', password: 'password123' },
            { username: 'player2', password: 'securepass' }
        ];
        const insertUserStmt = await db.prepare(
            'INSERT INTO users (username, password, salt) VALUES (?, ?, ?)'
        );
        for (const user of usersToPreload) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(user.password, salt);
            await insertUserStmt.run(user.username, hashedPassword, salt);
        }
        await insertUserStmt.finalize();
        console.log('Users preloaded successfully.');
    } else {
        console.log('Users already exist, skipping preload.');
    }
    // There is NO db.close() here. The connection stays open.
}

/**
 * Returns a promise that resolves to the singleton database instance.
 * All DAO functions will use this to get the database connection.
 */
export async function getDb() {
    return dbPromise;
}