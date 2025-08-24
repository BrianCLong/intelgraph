import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NlqModal } from './NlqModal.js';

describe('NlqModal', () => {
  it('shows generated cypher after preview', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        cypher: 'MATCH (n) RETURN n LIMIT $limit',
        costEstimate: { nodes: 1, edges: 0, rows: 1, safe: true },
      }),
    }) as any;

    render(<NlqModal />);
    fireEvent.change(screen.getByLabelText('nl-input'), {
      target: { value: 'anything' },
    });
    fireEvent.click(screen.getByText('Preview'));

    await waitFor(() => {
      expect(screen.getByLabelText('cypher-output')).toHaveTextContent(
        'MATCH (n) RETURN n LIMIT $limit',
      );
    });
  });
});
