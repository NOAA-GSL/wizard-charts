import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './main.css';
import TestingData from './components/TestingData';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <App /> */}
    <TestingData />
  </StrictMode>,
);
