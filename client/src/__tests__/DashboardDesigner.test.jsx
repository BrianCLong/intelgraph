import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardDesigner from '../components/dashboard/DashboardDesigner';

describe('DashboardDesigner', () => {
  it('adds widgets when button is clicked', () => {
    render(<DashboardDesigner />);
    expect(screen.getAllByText(/Widget/).length).toBe(2);
    fireEvent.click(screen.getByText('Add Widget'));
    expect(screen.getAllByText(/Widget/).length).toBe(3);
  });
});
