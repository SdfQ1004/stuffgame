// client/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css'; // Already added

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode> {/* <-- THIS IS IT! */}
    <App />
  </React.StrictMode>,
);