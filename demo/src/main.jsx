import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Router } from 'wouter';
import App from './App';
import './main.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router base="/wizard-charts">
      <App />
    </Router>
  </StrictMode>,
);
