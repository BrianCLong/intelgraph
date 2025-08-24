import React from 'react';
import { createRoot } from 'react-dom/client';
import { Chat } from './components/Chat';

createRoot(document.getElementById('root') as HTMLElement).render(<Chat />);
