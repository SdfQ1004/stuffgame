import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { getUserByUsername, getUserById } from './dao-users.mjs'; // Will create this DAO next

export function configurePassport(passport, getDb) {
    // Local Strategy for username/password authentication
    passport.use(new LocalStrategy(
    async function verify(username, password, cb) {
        try {
            const db = await getDb();
            const user = await getUserByUsername(db, username);

            if (!user) {
                // User not found.
                return cb(null, false, { message: 'Incorrect username or password.' });
            }

            // User was found, now compare password.
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                // Password does not match.
                return cb(null, false, { message: 'Incorrect username or password.' });
            }

            // Authentication successful.
            console.log('Login successful for:', username);
            return cb(null, user); // Pass the full user object to serializeUser

        } catch (err) {
            return cb(err);
        }
    }
    ));

    // Serialize user to session (store user ID in session)
    passport.serializeUser((user, cb) => {
        cb(null, user.id); // Store only the user ID in the session
    });

    // Deserialize user from session (retrieve full user object from ID)
    passport.deserializeUser(async (id, cb) => {
        try {
            const db = await getDb(); // Get the DB instance
            const user = await getUserById(db, id); // Call DAO function
            if (!user) {
                return cb(null, false);
            }
            cb(null, user); // Attach the full user object to req.user
        } catch (err) {
            cb(err);
        }
    });
}

// Middleware to check if user is authenticated for API routes

export function isLoggedIn(req, res, next) {
    console.log('isLoggedIn check. isAuthenticated:', req.isAuthenticated());
    if (req.isAuthenticated()) {
        console.log('User is authenticated:', req.user.username);
        return next();
    }
    console.log('User not authenticated for route.');
    return res.status(401).json({ error: 'Not authenticated' });
}