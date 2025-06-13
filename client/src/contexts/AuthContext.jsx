// client/src/contexts/AuthContext.jsx
import React from 'react';

// This is a NAMED export of the AuthContext constant
export const AuthContext = React.createContext({
  loggedInUser: null,
  loggedIn: false,
  loadingUser: true,
  doLogin: async () => {},
  doLogout: async () => {}
});