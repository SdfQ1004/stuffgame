// client/src/components/LoginPage.jsx
import React, { useState, useContext } from 'react';
import { Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext
import { Link } from 'react-router-dom'; // For the back to home link

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { doLogin } = useContext(AuthContext); // Get the doLogin function from AuthContext

  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default form submission
    setError(''); // Clear previous errors

    const credentials = { username, password };

    // Basic client-side validation
    if (username.trim() === '' || password.trim() === '') {
      setError('Username and password cannot be empty.');
      return;
    }

    try {
      await doLogin(credentials); // Call the doLogin function from context
    } catch (err) {
      setError(err.error || 'Login failed. Please check your credentials.'); // Display error from server
    }
  };

  return (
    <Row className="justify-content-center mt-5">
      <Col md={6} lg={4}>
        <h2 className="text-center mb-4">Login</h2>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formBasicUsername">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formBasicPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          <div className="d-grid gap-2 mt-4">
            <Button variant="primary" type="submit">
              Login
            </Button>
            <Link to="/" className="btn btn-secondary mt-2">
              Back to Home
            </Link>
          </div>
        </Form>
      </Col>
    </Row>
  );
}

export default LoginPage;