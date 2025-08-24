import { render, screen } from '@testing-library/react';
import React from 'react';
import OpsConsole from '../src/components/OpsConsole';

describe('OpsConsole', () => {
  it('renders heading', () => {
    render(<OpsConsole />);
    expect(screen.getByRole('heading')).toHaveTextContent('Ops Console');
  });
});
