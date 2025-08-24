import { render, screen } from '@testing-library/react';
import PresenceAvatars from './PresenceAvatars';

describe('PresenceAvatars', () => {
  it('renders user initials', () => {
    render(<PresenceAvatars users={[{ id: '1', name: 'Alice' }]} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
