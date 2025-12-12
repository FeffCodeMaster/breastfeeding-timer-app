import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('shows log button and empty prompt', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /log now/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /clear list/i })).toBeDisabled();
  expect(screen.getByText(/add your first timestamp/i)).toBeInTheDocument();
});
