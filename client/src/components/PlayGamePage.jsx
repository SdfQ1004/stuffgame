// client/src/components/PlayGamePage.jsx
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import API from '../API';
import CardDisplay from './CardDisplay';
import GameEndSummary from './GameEndSummary';
import { Container, Row, Col, Button, Alert, ProgressBar, Card } from 'react-bootstrap';
import dayjs from 'dayjs'; // For date/time manipulation (needed for 30s timer visualization)

// Component for the game playing interface
function PlayGamePage() {
  const location = useLocation(); // To get state passed from HomePage
  const navigate = useNavigate(); // To navigate back to home/history
  const { loggedIn, loadingUser } = useContext(AuthContext);

  // Game State
  const [gameId, setGameId] = useState(null); // Null for demo games
  const [isDemo, setIsDemo] = useState(false); // True for demo games
  const [playerCards, setPlayerCards] = useState([]); // Cards currently in player's hand, sorted
  const [currentRoundCard, setCurrentRoundCard] = useState(null); // The card to guess for the current round
  const [roundOutcomeMessage, setRoundOutcomeMessage] = useState(''); // Message after each round
  const [gameOutcome, setGameOutcome] = useState(null); // 'Won', 'Lost', or null if game in progress
  const [roundNumber, setRoundNumber] = useState(1); // Current round number (starts at 1)
  const [wonCardsCount, setWonCardsCount] = useState(0); // Tracks cards won in current game
  const [lostRoundsCount, setLostRoundsCount] = useState(0); // Tracks rounds lost in current game
  const [loading, setLoading] = useState(true); // Initial loading state
  const [error, setError] = useState(''); // General error messages

  // Timer State
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds for each round
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null); // Ref to store the timer interval ID

  // User's proposed placement (index in playerCards array)
  const [proposedPlacementIndex, setProposedPlacementIndex] = useState(null);

  // --- Initial Game Setup Effect ---
  useEffect(() => {
    // If not logged in and not a demo game, redirect
    if (!loadingUser && !loggedIn && !location.state?.isDemo) {
      navigate('/login'); // Redirect unauthenticated users trying to access full game
      return;
    }

    // Get initial game data from navigation state (passed from HomePage)
    const { gameData, isDemo: demoFlag } = location.state || {};

    if (!gameData || !gameData.initialCards) {
      // If no game data, probably a direct URL access or refresh, redirect to home
      setError('No game data found. Please start a new game from the home page.');
      setLoading(false);
      // navigate('/'); // Could redirect immediately if preferred
      return;
    }

    // Initialize state based on received game data
    setPlayerCards(gameData.initialCards);
    setCurrentRoundCard(demoFlag ? gameData.newCard : null); // For demo, initial newCard is provided immediately
    setGameId(gameData.gameId || null);
    setIsDemo(demoFlag);
    setWonCardsCount(gameData.initialCards.length); // Start with 3 cards won

    // Start timer for demo game immediately if newCard is provided
    if (demoFlag && gameData.newCard) {
        setTimerActive(true);
        setTimeLeft(30);
    }
    setLoading(false); // Initial loading complete
  }, [location.state, loggedIn, loadingUser, navigate]);


  // --- Round Timer Effect ---
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timerActive && timeLeft === 0) {
      // Time's up!
      handleTimeout();
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timerActive, timeLeft]);


  // --- Game Logic Functions ---

  // Handles player's guess for card placement
  const handleGuess = async (index) => {
    if (!currentRoundCard || proposedPlacementIndex !== null) return; // Prevent multiple guesses or no card to guess

    setProposedPlacementIndex(index); // Temporarily mark the proposed index
    setTimerActive(false); // Stop the timer immediately

    try {
      let result;
      if (isDemo) {
        // For demo game, send initialCards to server for evaluation
        result = await API.submitDemoGuess(playerCards, currentRoundCard.id, index);
      } else {
        // For full game, server manages state
        result = await API.submitGuess(gameId, currentRoundCard.id, playerCards, index, roundNumber);
      }

      setRoundOutcomeMessage(
        result.isCorrect
          ? `Correct! The bad luck index was ${result.badLuckIndex}.`
          : `Incorrect. The bad luck index was ${result.badLuckIndex}.`
      );

      if (result.isCorrect) {
        // Add the won card to player's hand and re-sort
        const newCards = [...playerCards, result.wonCard].sort((a, b) => a.bad_luck_index - b.bad_luck_index);
        setPlayerCards(newCards);
        setWonCardsCount(prev => prev + 1);

        if (newCards.length >= 6 && !isDemo) { // Win condition for full game (3 initial + 3 won)
          setGameOutcome('Won');
        }
      } else {
        // Card is lost/discarded for the round
        setLostRoundsCount(prev => prev + 1);
        if (lostRoundsCount + 1 >= 3 && !isDemo) { // Lose condition for full game
          setGameOutcome('Lost');
        }
      }

      // If game outcome is determined by API (for full games), update state
      if (result.gameOutcome && !isDemo) {
          setGameOutcome(result.gameOutcome);
      }

    } catch (err) {
      console.error('Error submitting guess:', err);
      setError(err.error || 'Failed to submit guess.');
      // If guess submission fails, revert timer state or allow retry
      setTimerActive(true); // Re-activate timer if error
    } finally {
      setProposedPlacementIndex(null); // Clear proposed index after processing
    }
  };

  // Handles timer running out
  const handleTimeout = async () => {
    if (!currentRoundCard) return; // No card to lose

    setTimerActive(false); // Ensure timer is stopped
    setRoundOutcomeMessage('Time ran out! You did not get the card.');
    setLostRoundsCount(prev => prev + 1); // Increment lost rounds

    // If not a demo game, inform the server that the round was lost
    if (!isDemo) {
      try {
        const result = await API.loseRound(gameId, currentRoundCard.id, roundNumber);
        if (result.gameOutcome === 'Lost') {
            setGameOutcome('Lost');
        }
      } catch (err) {
        console.error('Error reporting lost round to server:', err);
        setError(err.error || 'Failed to record timeout loss.');
      }
    } else {
         // For demo, just check client-side
        if (lostRoundsCount + 1 >= 3) { // Although demo is 1 round, keeping consistent logic
            setGameOutcome('Lost');
        }
    }
    // Move to next round
    // setCurrentRoundCard(null); // Clear the current card to prompt next round
    // setTimeLeft(30);
    // setProposedPlacementIndex(null);
  };

  // Handles starting the next round
  const handleNextRound = async () => {
    if (isDemo) { // Demo game ends after 1 round, no "next round"
      navigate('/'); // Go back to home after demo
      return;
    }
    if (gameOutcome) { // If game has already ended, new round is not applicable
        navigate('/'); // Go back to home/start new game
        return;
    }

    setError('');
    setRoundOutcomeMessage('');
    setCurrentRoundCard(null); // Clear previous card
    setProposedPlacementIndex(null);

    try {
      const nextCard = await API.getNextRoundCard(gameId); // Get next card from server
      setCurrentRoundCard(nextCard);
      setRoundNumber(prev => prev + 1); // Increment round number
      setTimeLeft(30); // Reset timer
      setTimerActive(true); // Start timer for new round
    } catch (err) {
      console.error('Error getting next round card:', err);
      if (err.error === 'No more unique cards available for this game.') {
          // This means player won all possible cards or server exhausted them
          // Or the game should have ended by now but didn't, implies a bug
          setError('Game cannot continue: No more unique cards available. This game should have ended, please check game state.');
          setGameOutcome('Lost'); // Consider this a forced loss if no more cards
          // Forcing game end here, as it implies an unexpected state
          const currentCardsCount = playerCards.length;
          await API.endGame(gameId, 'Lost', currentCardsCount);
      } else {
          setError(err.error || 'Failed to start next round.');
          // Allow user to try again or go home
      }
    }
  };

  // Renders the buttons for where to place the card
  const renderPlacementButtons = () => {
    if (!currentRoundCard || proposedPlacementIndex !== null || gameOutcome) return null; // Only show if a card is to guess and no guess is pending/game not over

    const buttons = [];
    // Button before the first card
    buttons.push(
      <Button key="before-0" variant="outline-dark" size="sm" onClick={() => handleGuess(0)} className="mx-1">
        Place Here
      </Button>
    );
    // Buttons between existing cards
    for (let i = 0; i < playerCards.length; i++) {
      buttons.push(
        <Button key={`after-${i}`} variant="outline-dark" size="sm" onClick={() => handleGuess(i + 1)} className="mx-1">
          Place Here
        </Button>
      );
    }
    return (
      <Row className="justify-content-center my-3">
        <Col xs={12} className="text-center">
          {buttons}
        </Col>
      </Row>
    );
  };

  // --- Rendering ---

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <h2>Loading game...</h2>
        <p>Initializing your cards.</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="text-center mt-5">
        <Alert variant="danger">{error}</Alert>
        <Button variant="primary" onClick={() => navigate('/')}>Back to Home</Button>
      </Container>
    );
  }

  if (gameOutcome) {
      return (
          <Container className="text-center mt-5">
              <GameEndSummary wonCards={playerCards} outcome={gameOutcome} />
              <Button variant="primary" onClick={() => navigate('/')} className="mt-4">
                  Start New Game
              </Button>
              {loggedIn && <Button variant="secondary" onClick={() => navigate('/history')} className="mt-4 ms-2">
                  View History
              </Button>}
          </Container>
      );
  }

  return (
    <Container className="text-center mt-3">
      <h2>
        {isDemo ? 'Demo Game' : `Round ${roundNumber} - Cards Won: ${wonCardsCount} / Rounds Lost: ${lostRoundsCount}`}
      </h2>

      {currentRoundCard && !gameOutcome && ( // Show timer if a card is being guessed and game is not over
      <ProgressBar now={(timeLeft / 30) * 100} label={`${timeLeft}s`} variant="primary" className="my-3" />
      )}

      {roundOutcomeMessage && <Alert variant="info" className="my-3">{roundOutcomeMessage}</Alert>}

      {/* Player's Current Hand */}
      <h3>Your Cards (Sorted by Bad Luck Index):</h3>
      <Row className="justify-content-center mb-4">
        {playerCards.length > 0 ? (
          playerCards.map(card => (
            <Col key={card.id} xs="auto">
              <CardDisplay card={card} showIndex={true} /> {/* Show index for owned cards */}
            </Col>
          ))
        ) : (
          <p>You have no cards yet. This should not happen in a new game!</p>
        )}
      </Row>

      {/* Current Round's Card to Guess */}
      {currentRoundCard && (
        <Row className="justify-content-center my-4">
          <Col xs={12}>
            <h4>Place this card:</h4>
            <CardDisplay card={currentRoundCard} showIndex={false} /> {/* DO NOT show index for new card */}
          </Col>
        </Row>
      )}

      {/* Placement Buttons */}
      {renderPlacementButtons()}

      {/* Next Round Button (shown after round outcome or if no currentRoundCard for full game) */}
      {!currentRoundCard && !loading && !gameOutcome && roundOutcomeMessage && (
        <Button variant="success" size="lg" className="my-3" onClick={handleNextRound}>
          Ready for Next Round!
        </Button>
      )}

      {/* Special case: Start first round for full game after initial setup */}
      {!currentRoundCard && !isDemo && !loading && !roundOutcomeMessage && (
          <Button variant="success" size="lg" className="my-3" onClick={handleNextRound}>
              Start First Round!
          </Button>
      )}

    </Container>
  );
}

export default PlayGamePage;