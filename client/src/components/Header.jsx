// client/src/components/Header.jsx
import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext

function Header() {
  const { loggedIn, loggedInUser, doLogout } = useContext(AuthContext);

  return (
    <Navbar bg="primary" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">Stuff Happens</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/play">Play Game</Nav.Link>
            <Nav.Link as={Link} to="/instructions">Instructions</Nav.Link>
            {loggedIn && <Nav.Link as={Link} to="/history">History</Nav.Link>}
          </Nav>
          <Nav>
            {!loggedIn ? (
              <Nav.Link as={Link} to="/login">Login</Nav.Link>
            ) : (
              <>
                <Navbar.Text className="me-2">
                  Welcome, {loggedInUser ? loggedInUser.username : 'Guest'}!
                </Navbar.Text>
                <Nav.Link onClick={doLogout}>Logout</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;