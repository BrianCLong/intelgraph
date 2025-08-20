import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Graph from '../Graph';
import cytoscape from 'cytoscape';

vi.mock('cytoscape');
const mockedCytoscape = cytoscape as unknown as vi.Mock;

describe('Graph', () => {
  it('uses deception heatmap style', () => {
    mockedCytoscape.mockReturnValue({
      on: vi.fn(),
      startBatch: vi.fn(),
      endBatch: vi.fn(),
      zoom: vi.fn().mockReturnValue(1),
      nodes: vi.fn().mockReturnValue({ style: vi.fn() }),
      edges: vi.fn().mockReturnValue({ style: vi.fn() }),
      destroy: vi.fn(),
    });

    render(<Graph elements={{ nodes: [], edges: [] }} neighborhoodMode={false} />);
    const style = mockedCytoscape.mock.calls[0][0].style.find((s: any) => s.selector === 'node');
    expect(style.style['background-color']).toContain('deception_score');
  });
});
