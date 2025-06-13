// server/dao-cards.mjs

/**
 * Retrieves a random set of cards.
 * @param {object} db - The database instance.
 * @param {number} limit - The number of random cards to retrieve.
 * @param {string[]} [excludeCardIds=[]] - An optional array of card IDs to exclude from the random selection.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of card objects.
 */
export async function getRandomCards(db, limit, excludeCardIds = []) {
    try {
        let sql = `SELECT id, name, image, bad_luck_index FROM cards ORDER BY RANDOM() LIMIT ?`;
        let params = [limit];

        if (excludeCardIds.length > 0) {
            // Create placeholders for the IN clause (e.g., ?, ?, ?)
            const placeholders = excludeCardIds.map(() => '?').join(',');
            sql = `SELECT id, name, image, bad_luck_index FROM cards WHERE id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT ?`;
            params = [...excludeCardIds, limit];
        }

        const cards = await db.all(sql, params);
        return cards;
    } catch (err) {
        console.error('Error in getRandomCards:', err);
        throw err;
    }
}

/**
 * Retrieves a single card by its ID.
 * @param {object} db - The database instance.
 * @param {number} cardId - The ID of the card to retrieve.
 * @returns {Promise<object|undefined>} A promise that resolves to the card object or undefined if not found.
 */
export async function getCardById(db, cardId) {
    try {
        const sql = `SELECT id, name, image, bad_luck_index FROM cards WHERE id = ?`;
        const card = await db.get(sql, [cardId]);
        return card;
    } catch (err) {
        console.error('Error in getCardById:', err);
        throw err;
    }
}