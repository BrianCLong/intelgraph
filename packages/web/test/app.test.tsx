import React from 'react';
import { render } from '@testing-library/react';
import { App } from '../src';

describe('App', () => {
  it('renders heading', () => {
    const { getByRole } = render(<App />);
    expect(getByRole('main').textContent).toBe('Resolution Console');
  });
});
