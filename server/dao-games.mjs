// server/dao-games.mjs

import { getCardById } from './dao-cards.mjs'; // Needed to get full card details for game history
import dayjs from 'dayjs'; // For easy date/time formatting

/**
 * Starts a new game for a given user, inserting initial cards.
 * @param {object} db - The database instance.
 * @param {number} userId - The ID of the user starting the game.
 * @param {Array<object>} initialCards - An array of the 3 initial card objects (full details).
 * @returns {Promise<number>} A promise that resolves to the new game's ID.
 */
export async function startGame(db, userId, initialCards) {
    let gameId;
    try {
        // Start a transaction for atomicity
        await db.run('BEGIN TRANSACTION;');

        const startTime = dayjs().toISOString(); // Current time in ISO 8601 format

        // 1. Insert new game record (placeholder end_time and outcome)
        const result = await db.run(
            `INSERT INTO games (user_id, start_time, end_time, outcome, cards_collected) VALUES (?, ?, ?, ?, ?)`,
            [userId, startTime, '', '', 0] // Placeholder for outcome and collected cards
        );
        gameId = result.lastID;

        // 2. Insert initial cards into game_cards table
        const insertCardStmt = await db.prepare(
            `INSERT INTO game_cards (game_id, card_id, status) VALUES (?, ?, 'initial')`
        );
        for (const card of initialCards) {
            await insertCardStmt.run(gameId, card.id);
        }
        await insertCardStmt.finalize();

        await db.run('COMMIT;'); // Commit the transaction
        console.log(`Game ${gameId} started for user ${userId}.`);
        return gameId;
    } catch (err) {
        await db.run('ROLLBACK;'); // Rollback on error
        console.error('Error in startGame:', err);
        throw err;
    }
}

/**
 * Records the outcome of a round (card won or lost).
 * @param {object} db - The database instance.
 * @param {number} gameId - The ID of the current game.
 * @param {number} cardId - The ID of the card involved in the round.
 * @param {string} status - 'won' or 'lost' or 'discarded'.
 * @param {number} roundNumber - The current round number.
 * @param {boolean} [isCorrectGuess=null] - True if guessed correctly, false if not. Null for 'discarded' or initial.
 * @returns {Promise<void>}
 */
export async function recordRoundOutcome(db, gameId, cardId, status, roundNumber, isCorrectGuess = null) {
    try {
        const guessTime = dayjs().toISOString();
        await db.run(
            `INSERT INTO game_cards (game_id, card_id, status, round, guess_time, is_correct_guess) VALUES (?, ?, ?, ?, ?, ?)`,
            [gameId, cardId, status, roundNumber, guessTime, isCorrectGuess === true ? 1 : (isCorrectGuess === false ? 0 : null)]
        );
        console.log(`Game ${gameId}: Card ${cardId} status updated to ${status} in round ${roundNumber}.`);
    } catch (err) {
        console.error('Error in recordRoundOutcome:', err);
        throw err;
    }
}

/**
 * Ends a game, updating its outcome and collected cards count.
 * @param {object} db - The database instance.
 * @param {number} gameId - The ID of the game to end.
 * @param {string} outcome - 'Won' or 'Lost'.
 * @param {number} cardsCollected - The total number of cards collected by the player.
 * @returns {Promise<void>}
 */
export async function endGame(db, gameId, outcome, cardsCollected) {
    try {
        const endTime = dayjs().toISOString();
        await db.run(
            `UPDATE games SET end_time = ?, outcome = ?, cards_collected = ? WHERE id = ?`,
            [endTime, outcome, cardsCollected, gameId]
        );
        console.log(`Game ${gameId} ended with outcome: ${outcome}, collected: ${cardsCollected} cards.`);
    } catch (err) {
        console.error('Error in endGame:', err);
        throw err;
    }
}

/**
 * Retrieves all cards currently associated with a game, with their full details.
 * This includes initial cards and any cards won in subsequent rounds.
 * @param {object} db - The database instance.
 * @param {number} gameId - The ID of the game.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of card objects.
 */
export async function getGameCards(db, gameId) {
    try {
        const sql = `
            SELECT
                c.id,
                c.name,
                c.image,
                c.bad_luck_index,
                gc.status,
                gc.round,
                gc.guess_time,
                gc.is_correct_guess
            FROM game_cards gc
            JOIN cards c ON gc.card_id = c.id
            WHERE gc.game_id = ?
            ORDER BY c.bad_luck_index ASC;
        `;
        const cards = await db.all(sql, [gameId]);
        return cards;
    } catch (err) {
        console.error('Error in getGameCards:', err);
        throw err;
    }
}

/**
 * Retrieves the history of all completed games for a specific user.
 * @param {object} db - The database instance.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of game history objects.
 */
export async function getGameHistory(db, userId) {
    try {
        const games = await db.all(
            `SELECT id, start_time, end_time, outcome, cards_collected FROM games WHERE user_id = ? ORDER BY start_time DESC`,
            [userId]
        );

        // For each game, fetch its associated cards
        const gamesWithCards = await Promise.all(games.map(async (game) => {
            const gameCards = await getGameCards(db, game.id); // Re-use getGameCards
            return { ...game, gameCards }; // Attach cards to the game object
        }));

        return gamesWithCards;
    } catch (err) {
        console.error('Error in getGameHistory:', err);
        throw err;
    }
}

/**
 * Gets the current number of cards a player has won in a game.
 * @param {object} db - The database instance.
 * @param {number} gameId - The ID of the game.
 * @returns {Promise<number>} Number of cards won.
 */
export async function getWonCardsCount(db, gameId) {
    try {
        const result = await db.get(
            `SELECT COUNT(*) as count FROM game_cards WHERE game_id = ? AND status = 'won'`,
            [gameId]
        );
        return result.count;
    } catch (err) {
        console.error('Error in getWonCardsCount:', err);
        throw err;
    }
}

/**
 * Gets the number of rounds a player has lost in a game (where they didn't guess correctly).
 * @param {object} db - The database instance.
 * @param {number} gameId - The ID of the game.
 * @returns {Promise<number>} Number of rounds lost.
 */
export async function getLostRoundsCount(db, gameId) {
    try {
        const result = await db.get(
            `SELECT COUNT(*) as count FROM game_cards WHERE game_id = ? AND (status = 'lost' OR (status = 'proposed' AND is_correct_guess = 0))`,
            [gameId]
        );
        return result.count;
    } catch (err) {
        console.error('Error in getLostRoundsCount:', err);
        throw err;
    }
}

/**
 * Gets all card IDs that have been involved in a specific game (initial, won, lost, discarded).
 * Used to prevent presenting the same card twice in a game.
 * @param {object} db - The database instance.
 * @param {number} gameId - The ID of the game.
 * @returns {Promise<Array<number>>} An array of card IDs.
 */
export async function getInvolvedCardIds(db, gameId) {
    try {
        const result = await db.all(
            `SELECT card_id FROM game_cards WHERE game_id = ?`,
            [gameId]
        );
        return result.map(row => row.card_id);
    } catch (err) {
        console.error('Error in getInvolvedCardIds:', err);
        throw err;
    }
}