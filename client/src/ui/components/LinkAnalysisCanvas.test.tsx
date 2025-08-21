import { render, screen } from '@testing-library/react';
import LinkAnalysisCanvas from './LinkAnalysisCanvas';

describe('LinkAnalysisCanvas', () => {
  it('renders timeline, map and graph panes', () => {
    render(<LinkAnalysisCanvas />);
    expect(screen.getByLabelText('timeline')).toBeInTheDocument();
    expect(screen.getByLabelText('map')).toBeInTheDocument();
    expect(screen.getByLabelText('graph')).toBeInTheDocument();
  });
});
