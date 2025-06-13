// client/src/API.js
// --- FINAL CORRECTED VERSION ---

const BASE_URL = 'http://localhost:3001/api';

// This function does NOT need credentials.
async function logIn(credentials) {
    let response = await fetch(BASE_URL + '/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });
    if (response.ok) {
        const user = await response.json();
        return user;
    } else {
        const errDetails = await response.json();
        throw errDetails;
    }
}

// All functions below this point that talk to a protected route need credentials.

async function logOut() {
    await fetch(BASE_URL + '/logout', { method: 'GET', credentials: 'include' });
}

async function getCurrentUser() {
    let response = await fetch(BASE_URL + '/current-user', { method: 'GET', credentials: 'include' });
    if (response.ok) {
        const user = await response.json();
        return user;
    } else {
        throw new Error('Not Authenticated');
    }
}

// --- Game API Calls ---

async function startGame() {
    // This is the function that was failing. It now includes credentials.
    const response = await fetch(BASE_URL + '/games/start', { 
        method: 'POST', 
        credentials: 'include' 
    });
    if (response.ok) {
        return response.json();
    } else {
        const errDetails = await response.json();
        throw errDetails;
    }
}

async function getNextRoundCard(gameId) {
    const response = await fetch(`${BASE_URL}/games/${gameId}/next-round`, { credentials: 'include' });
    if (response.ok) {
        return response.json();
    } else {
        const errDetails = await response.json();
        throw errDetails;
    }
}

async function submitGuess(gameId, cardId, playerHand, placementIndex, roundNumber) {
    const response = await fetch(`${BASE_URL}/games/${gameId}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, playerHand, placementIndex, roundNumber }),
        credentials: 'include'
    });
    if (response.ok) {
        return response.json();
    } else {
        const errDetails = await response.json();
        throw errDetails;
    }
}

async function loseRound(gameId, cardId, roundNumber) {
    const response = await fetch(`${BASE_URL}/games/${gameId}/lose-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, roundNumber }),
        credentials: 'include'
    });
    if (response.ok) {
        return response.json();
    } else {
        const errDetails = await response.json();
        throw errDetails;
    }
}

async function getGameHistory() {
    const response = await fetch(BASE_URL + '/history', { credentials: 'include' });
    if (response.ok) {
        return response.json();
    } else {
        const errDetails = await response.json();
        throw errDetails;
    }
}

// --- Demo Game API Calls (do not need credentials) ---

async function startDemoGame() {
    const response = await fetch(BASE_URL + '/demo-game/start', { method: 'POST' });
    if (response.ok) {
        return response.json();
    } else {
        const errDetails = await response.json();
        throw errDetails;
    }
}

async function submitDemoGuess(initialCards, newCardId, placementIndex) {
    const response = await fetch(BASE_URL + '/demo-game/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialCards, newCardId, placementIndex }),
    });
    if (response.ok) {
        return response.json();
    } else {
        const errDetails = await response.json();
        throw errDetails;
    }
}

const API = {
    logIn,
    logOut,
    getCurrentUser,
    startGame,
    getNextRoundCard,
    submitGuess,
    loseRound,
    getGameHistory,
    startDemoGame,
    submitDemoGuess
};

export default API;