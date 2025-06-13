// Function to get a user by username
export async function getUserByUsername(db, username) {
    try {
        const sql = 'SELECT * FROM users WHERE username = ?';
        const user = await db.get(sql, [username]);
        return user; // Returns user object or undefined if not found
    } catch (err) {
        console.error('Error in getUserByUsername:', err);
        throw err;
    }
}

// Function to get a user by ID
export async function getUserById(db, id) {
    try {
        const sql = 'SELECT * FROM users WHERE id = ?';
        const user = await db.get(sql, [id]);
        return user; // Returns user object or undefined if not found
    } catch (err) {
        console.error('Error in getUserById:', err);
        throw err;
    }
}