// client/src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';

// Import components (will create these files shortly)
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage'; // Corrected path to LoginPage
import PlayGamePage from './components/PlayGamePage';
import UserHistoryPage from './components/UserHistoryPage';
import InstructionsPage from './components/InstructionsPage';
import Header from './components/Header'; // Our custom Header component

// Context for authentication (will create this)
import { AuthContext } from './contexts/AuthContext';

// API Service (will create this)
import API from './API';


function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true); // To indicate if user info is still loading

  // Used by login/logout functions that are passed down
  const navigate = useNavigate(); // Must be inside BrowserRouter

  // Effect to check current user on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await API.getCurrentUser();
        setLoggedInUser(user);
        setLoggedIn(true);
      } catch (err) {
        // Not logged in or session expired, which is expected
        setLoggedInUser(null);
        setLoggedIn(false);
      } finally {
        setLoadingUser(false);
      }
    };
    checkAuth();
  }, []);

  const doLogin = async (credentials) => {
    try {
      const user = await API.logIn(credentials);
      setLoggedInUser(user);
      setLoggedIn(true);
      navigate('/'); 
    } catch (err) {
      throw err; // Re-throw to allow component to handle login errors
    }
  };

  const doLogout = async () => {
    try {
      await API.logOut();
      setLoggedInUser(null);
      setLoggedIn(false);
      navigate('/'); // Redirect to home page after logout
    } catch (err) {
      console.error("Logout failed:", err);
      // Handle logout error if necessary
    }
  };

  const authContextValue = {
    loggedInUser,
    loggedIn,
    loadingUser,
    doLogin,
    doLogout
  };


  return (
    <AuthContext.Provider value={authContextValue}>
      <Header /> {/* Our Header will use AuthContext */}
      <Container fluid className="my-3">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/play" element={<PlayGamePage />} />
          <Route path="/history" element={<UserHistoryPage />} />
          <Route path="/instructions" element={<InstructionsPage />} />
          <Route path="*" element={<h1>404 Not Found</h1>} /> {/* Catch-all route */}
        </Routes>
      </Container>
    </AuthContext.Provider>
  );
}

// Export App wrapped in BrowserRouter for routing to work
export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}