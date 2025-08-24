import { render } from '@testing-library/react';
import React from 'react';
import App from '../components/App';

test('renders header', () => {
  const { getByText } = render(<App />);
  expect(getByText('Analyst Workbench')).toBeTruthy();
});
