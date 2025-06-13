import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { initializeDatabase, getDb } from './db.mjs'; // Import the db functions
import { configurePassport } from './auth.mjs'; // Will create this next
import configureRoutes from './routes.mjs'; // Will create this next

const app = express();
const port = 3001; // React runs on 5173 by default, so we'll use 3001 for the backend.

// Initialize Database and get DB instance
// This will run once when the server starts
initializeDatabase().then(() => {
    console.log("Database initialized and ready.");
    // Now that DB is ready, we can get the instance for the app.
    // We'll pass `getDb` to our DAOs and routes.
}).catch(err => {
    console.error("Failed to initialize database:", err);
    process.exit(1); // Exit if DB fails to initialize
});

// CORS Configuration
const corsOptions = {
    origin: 'http://localhost:5173', // Allow requests from your React app
    credentials: true // Allow cookies to be sent
};
app.use(cors(corsOptions));

// Middleware to parse JSON bodies
app.use(express.json());

// Session Configuration
app.use(session({
    secret: 'a super secret key for sessions, change this in production!',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, 
        httpOnly: true,
        sameSite: 'lax', // Add this line
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport strategies (needs to be done after session middleware)
configurePassport(passport, getDb); // Pass passport instance and getDb function

// Configure Routes (needs to be done after passport and session)
// We'll pass the getDb function to the routes so they can access the database
configureRoutes(app, getDb);

// Basic test route
app.get('/', (req, res) => {
    res.send('Stuff Happens API is running!');
});

// Error handling middleware (optional but good practice)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});