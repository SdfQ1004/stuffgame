// server/routes.mjs

import passport from 'passport';
import { isLoggedIn } from './auth.mjs'; // Our custom authentication middleware
import { getUserByUsername } from './dao-users.mjs'; // For login validation
import { getRandomCards, getCardById } from './dao-cards.mjs'; // For game logic
import {
    startGame, recordRoundOutcome, endGame,
    getGameHistory, getGameCards, getWonCardsCount, getLostRoundsCount, getInvolvedCardIds
} from './dao-games.mjs'; // For game logic and history

/**
 * Configures all API routes for the Express application.
 * @param {object} app - The Express application instance.
 * @param {function} getDb - Function to get the database instance.
 */
function configureRoutes(app, getDb) {
    // --- Middleware to get DB instance in route handlers ---
    // This makes `req.db` available in all routes below this middleware.
    app.use(async (req, res, next) => {
        try {
            req.db = await getDb();
            next();
        } catch (err) {
            console.error("Failed to get database instance in middleware:", err);
            res.status(500).json({ error: 'Database connection error.' });
        }
    });


    // --- User Authentication Routes ---

    /**
     * POST /api/login
     * Logs in a user using Passport's local strategy.
     */
    app.post('/api/login', (req, res, next) => {
        passport.authenticate('local', (err, user, info) => {
            if (err) {
                return next(err); // Server error
            }
            if (!user) {
                // Authentication failed (incorrect username/password)
                return res.status(401).json({ error: info.message });
            }
            // Authentication successful, log in the user
            req.login(user, (err) => {
                if (err) {
                     console.error('req.login error:', err); return next(err); 
                }
                console.log('User successfully logged in via req.login:', user.username);
                // Do not send password or salt to the client
                return res.json({ id: user.id, username: user.username });
            });
        })(req, res, next);
    });

    /**
     * GET /api/logout
     * Logs out the current user.
     */
    app.get('/api/logout', isLoggedIn, (req, res) => {
        req.logout((err) => {
            if (err) {
                return res.status(500).json({ error: 'Logout failed.' });
            }
            req.session.destroy(() => { // Destroy the session on logout
                res.status(200).json({ message: 'Logged out successfully.' });
            });
        });
    });

    /**
     * GET /api/current-user
     * Retrieves the currently logged-in user's information.
     * Protected by isLoggedIn middleware.
     */
    app.get('/api/current-user', isLoggedIn, (req, res) => {
        // req.user is populated by passport.deserializeUser
        res.json({ id: req.user.id, username: req.user.username });
    });


    // --- Game Management Routes (Registered Users) ---

    /**
     * POST /api/games/start
     * Starts a new game for the logged-in user.
     * Requires authentication.
     */
    app.post('/api/games/start', isLoggedIn, async (req, res) => {
        try {
            const initialCards = await getRandomCards(req.db, 3);
            if (initialCards.length < 3) {
                return res.status(500).json({ error: "Not enough cards to start a game." });
            }

            // Sort initial cards by bad_luck_index for the client
            initialCards.sort((a, b) => a.bad_luck_index - b.bad_luck_index);

            const gameId = await startGame(req.db, req.user.id, initialCards);

            // For the initial response, we send full card details for the 3 initial cards
            // but the bad_luck_index is only visible client-side for these initial cards.
            res.status(201).json({ gameId, initialCards });
        } catch (err) {
            console.error("Error starting new game:", err);
            res.status(500).json({ error: 'Failed to start game.' });
        }
    });

    /**
     * GET /api/games/:gameId/next-round
     * Provides a new random card for the current round, excluding cards already in play.
     * Requires authentication.
     */
    app.get('/api/games/:gameId/next-round', isLoggedIn, async (req, res) => {
        const gameId = parseInt(req.params.gameId);
        if (isNaN(gameId)) {
            return res.status(400).json({ error: 'Invalid game ID.' });
        }

        try {
            // Get all card IDs already involved in this game (initial, won, lost, discarded)
            const involvedCardIds = await getInvolvedCardIds(req.db, gameId);

            // Get a new random card, excluding the ones already involved
            const newCards = await getRandomCards(req.db, 1, involvedCardIds);

            if (newCards.length === 0) {
                // This could happen if almost all cards have been used in many rounds
                return res.status(404).json({ error: 'No more unique cards available for this game.' });
            }

            const newCard = newCards[0];
            // IMPORTANT: Do NOT send bad_luck_index for the new card!
            res.json({ id: newCard.id, name: newCard.name, image: newCard.image });
        } catch (err) {
            console.error(`Error getting next round card for game ${gameId}:`, err);
            res.status(500).json({ error: 'Failed to get next round card.' });
        }
    });

    /**
     * POST /api/games/:gameId/guess
     * Handles the player's guess for card placement.
     * Requires authentication.
     *
     * Expected body: { cardId: number, playerHand: Array<{ id: number, bad_luck_index: number }>, placementIndex: number, roundNumber: number }
     * playerHand: The player's current cards, ordered by bad_luck_index, including the initial ones and previously won ones.
     * placementIndex: The index where the new card was placed in the client-side sorted hand.
     */
    app.post('/api/games/:gameId/guess', isLoggedIn, async (req, res) => {
        const gameId = parseInt(req.params.gameId);
        const { cardId, playerHand, placementIndex, roundNumber } = req.body;

        if (isNaN(gameId) || isNaN(cardId) || !Array.isArray(playerHand) || isNaN(placementIndex) || isNaN(roundNumber)) {
            return res.status(400).json({ error: 'Invalid input for guess.' });
        }

        try {
            const newCardDetails = await getCardById(req.db, cardId);
            if (!newCardDetails) {
                return res.status(404).json({ error: 'New card not found.' });
            }

            let isCorrect = false;
            // Create a temporary array to simulate the placement
            const tempHand = [...playerHand]; // playerHand comes already sorted from client

            // Insert the new card's bad_luck_index at the proposed placementIndex
            tempHand.splice(placementIndex, 0, { id: newCardDetails.id, bad_luck_index: newCardDetails.bad_luck_index });

            // Check if the temporary hand is still sorted correctly
            // A hand is sorted if each element is less than or equal to the next
            isCorrect = true;
            for (let i = 0; i < tempHand.length - 1; i++) {
                if (tempHand[i].bad_luck_index > tempHand[i+1].bad_luck_index) {
                    isCorrect = false;
                    break;
                }
            }

            let status = isCorrect ? 'won' : 'lost';
            await recordRoundOutcome(req.db, gameId, cardId, status, roundNumber, isCorrect);

            let currentCards = await getGameCards(req.db, gameId); // Get updated cards in hand (includes newly won)
            // Filter out 'discarded' or 'lost' cards to only return cards in possession
            currentCards = currentCards.filter(c => ['initial', 'won'].includes(c.status));

            const cardsWonCount = await getWonCardsCount(req.db, gameId);
            const cardsLostCount = await getLostRoundsCount(req.db, gameId);

            let gameOutcome = null;
            if (cardsWonCount >= 3) { // 3 initial + 3 won = 6
                gameOutcome = 'Won';
                await endGame(req.db, gameId, gameOutcome, currentCards.length);
            } else if (cardsLostCount >= 3) {
                gameOutcome = 'Lost';
                await endGame(req.db, gameId, gameOutcome, currentCards.length);
            }

            res.json({
                isCorrect,
                badLuckIndex: newCardDetails.bad_luck_index,
                wonCard: isCorrect ? newCardDetails : null,
                currentCards, // Updated hand including the new card if won
                gameOutcome, // 'Won' or 'Lost' if game ended, otherwise null
                cardsWonCount,
                cardsLostCount
            });

        } catch (err) {
            console.error(`Error processing guess for game ${gameId}, card ${cardId}:`, err);
            res.status(500).json({ error: 'Failed to process guess.' });
        }
    });

    /**
     * POST /api/games/:gameId/lose-round
     * Marks a card as lost/discarded if the timer expires or player forfeits.
     * Requires authentication.
     * Expected body: { cardId: number, roundNumber: number }
     */
    app.post('/api/games/:gameId/lose-round', isLoggedIn, async (req, res) => {
        const gameId = parseInt(req.params.gameId);
        const { cardId, roundNumber } = req.body;

        if (isNaN(gameId) || isNaN(cardId) || isNaN(roundNumber)) {
            return res.status(400).json({ error: 'Invalid input for losing round.' });
        }

        try {
            // Record status as 'discarded' (or 'lost' if that distinction is preferred)
            await recordRoundOutcome(req.db, gameId, cardId, 'discarded', roundNumber, false); // Not a correct guess

            const cardsLostCount = await getLostRoundsCount(req.db, gameId);
            let gameOutcome = null;

            if (cardsLostCount >= 3) {
                gameOutcome = 'Lost';
                const currentCardsCount = (await getGameCards(req.db, gameId)).filter(c => ['initial', 'won'].includes(c.status)).length;
                await endGame(req.db, gameId, gameOutcome, currentCardsCount);
            }

            res.status(200).json({ message: 'Round lost/card discarded.', gameOutcome, cardsLostCount });
        } catch (err) {
            console.error(`Error losing round for game ${gameId}, card ${cardId}:`, err);
            res.status(500).json({ error: 'Failed to record lost round.' });
        }
    });

    /**
     * GET /api/history
     * Retrieves the game history for the logged-in user.
     * Requires authentication.
     */
    app.get('/api/history', isLoggedIn, async (req, res) => {
        try {
            const history = await getGameHistory(req.db, req.user.id);
            res.json(history);
        } catch (err) {
            console.error("Error fetching game history:", err);
            res.status(500).json({ error: 'Failed to retrieve game history.' });
        }
    });


    // --- Demo Game Routes (Anonymous Users) ---

    /**
     * POST /api/demo-game/start
     * Starts a single-round demo game for anonymous users.
     * Does not require authentication, and no game state is saved.
     */
    app.post('/api/demo-game/start', async (req, res) => {
        try {
            const initialCards = await getRandomCards(req.db, 3);
            if (initialCards.length < 3) {
                return res.status(500).json({ error: "Not enough cards for demo game." });
            }
            initialCards.sort((a, b) => a.bad_luck_index - b.bad_luck_index);

            // Get one new card for the demo round, excluding the initial 3
            const initialCardIds = initialCards.map(c => c.id);
            const newCards = await getRandomCards(req.db, 1, initialCardIds);
            if (newCards.length === 0) {
                 return res.status(500).json({ error: "Not enough unique cards for demo game." });
            }
            const newCard = newCards[0];

            // IMPORTANT: Do NOT send bad_luck_index for the new card!
            res.status(200).json({
                initialCards: initialCards, // Full details for initial cards
                newCard: { id: newCard.id, name: newCard.name, image: newCard.image } // Limited details for the card to guess
            });
        } catch (err) {
            console.error("Error starting demo game:", err);
            res.status(500).json({ error: 'Failed to start demo game.' });
        }
    });

    /**
     * POST /api/demo-game/guess
     * Handles the guess for a demo game. No state is saved to DB.
     * Does not require authentication.
     *
     * Expected body: { initialCards: Array<{ id, name, image, bad_luck_index }>, newCardId: number, placementIndex: number }
     */
    app.post('/api/demo-game/guess', async (req, res) => {
        const { initialCards, newCardId, placementIndex } = req.body;

        if (!Array.isArray(initialCards) || isNaN(newCardId) || isNaN(placementIndex)) {
            return res.status(400).json({ error: 'Invalid input for demo guess.' });
        }

        try {
            const newCardDetails = await getCardById(req.db, newCardId);
            if (!newCardDetails) {
                return res.status(404).json({ error: 'New card not found for demo game.' });
            }

            // Combine initial cards with the new card for evaluation, sort by bad_luck_index
            const tempHand = [...initialCards];
            // Ensure initialCards are sorted on client side before sending,
            // here we just insert the new card and check if the order is maintained.
            tempHand.splice(placementIndex, 0, { id: newCardDetails.id, bad_luck_index: newCardDetails.bad_luck_index });

            // Check if the temporary hand is sorted correctly
            let isCorrect = true;
            for (let i = 0; i < tempHand.length - 1; i++) {
                if (tempHand[i].bad_luck_index > tempHand[i+1].bad_luck_index) {
                    isCorrect = false;
                    break;
                }
            }

            res.json({
                isCorrect,
                badLuckIndex: newCardDetails.bad_luck_index,
                wonCard: isCorrect ? newCardDetails : null // Full details if won
            });

        } catch (err) {
            console.error("Error processing demo game guess:", err);
            res.status(500).json({ error: 'Failed to process demo guess.' });
        }
    });
}

export default configureRoutes;