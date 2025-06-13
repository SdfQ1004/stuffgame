// client/src/components/HomePage.jsx
import React, { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Container, Button, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import API from '../API'; // Import the API service

function HomePage() {
  const { loggedIn, loggedInUser, loadingUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState('');

  // Function to start a new full game (for registered users)
  const handleStartGame = async () => {
    setError(''); // Clear previous errors
    try {
      const gameData = await API.startGame(); // Call the API to start a game
      // Store initial cards and gameId in session or context if needed later,
      // but for now, we just pass them via navigation state
      navigate('/play', { state: { gameData, isDemo: false } }); // Navigate to play page with game data
    } catch (err) {
      console.error("Failed to start full game:", err);
      setError(err.error || 'Failed to start game. Please try again.');
    }
  };

  // Function to start a demo game (for anonymous users)
  const handleStartDemoGame = async () => {
    setError(''); // Clear previous errors
    try {
      const demoGameData = await API.startDemoGame(); // Call the API to start a demo game
      navigate('/play', { state: { gameData: demoGameData, isDemo: true } }); // Navigate to play page with demo game data
    } catch (err) {
      console.error("Failed to start demo game:", err);
      setError(err.error || 'Failed to start demo game. Please try again.');
    }
  };

  if (loadingUser) {
    return (
      <Container className="text-center mt-5">
        <h2>Loading...</h2>
        <p>Checking login status...</p>
      </Container>
    );
  }

  return (
    <Container className="text-center mt-5">
      <h1>Welcome to Stuff Happens!</h1>
      <p className="lead">
        Test your bad luck intuition. Can you rank horrible situations correctly?
      </p>

      {error && <Alert variant="danger" className="my-3">{error}</Alert>}

      <Row className="justify-content-center mt-4">
        <Col xs={12} md={8} lg={6}>
          {!loggedIn ? (
            // Options for anonymous users
            <>
              <p>You are currently Browse as a guest.</p>
              <Button variant="primary" size="lg" className="m-2" onClick={handleStartDemoGame}>
                Play Demo Game (1 Round)
              </Button>
              <Button variant="outline-primary" size="lg" className="m-2" onClick={() => navigate('/login')}>
                Login to Play Full Game
              </Button>
            </>
          ) : (
            // Options for logged-in users
            <>
              <p>Welcome back, {loggedInUser.username}!</p>
              <Button variant="success" size="lg" className="m-2" onClick={handleStartGame}>
                Start New Full Game
              </Button>
              <Button variant="info" size="lg" className="m-2" onClick={() => navigate('/history')}>
                View Game History
              </Button>
            </>
          )}
          <div className="mt-4">
            <Button variant="secondary" size="lg" onClick={() => navigate('/instructions')}>
              How to Play (Instructions)
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default HomePage;