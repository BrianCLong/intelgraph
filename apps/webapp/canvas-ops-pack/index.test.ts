import { addAnnotation, createPinboard, expand, filterBySpace, filterByTime, pivot } from './index';

describe('canvas ops', () => {
  const graph = {
    nodes: [
      { id: 'a', time: 1, region: 'x' },
      { id: 'b', time: 2, region: 'y' },
      { id: 'c', time: 3, region: 'x' },
    ],
    edges: [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ],
  };

  it('pivots to connected nodes', () => {
    expect(pivot(graph, 'a').map((n) => n.id)).toEqual(['b']);
  });

  it('expands multiple nodes', () => {
    expect(expand(graph, ['a']).map((n) => n.id)).toEqual(['b']);
  });

  it('filters by time', () => {
    expect(filterByTime(graph.nodes, 2, 3).map((n) => n.id)).toEqual(['b', 'c']);
  });

  it('filters by space', () => {
    expect(filterBySpace(graph.nodes, 'x').map((n) => n.id)).toEqual(['a', 'c']);
  });

  it('manages pinboard annotations', () => {
    const board = createPinboard('test', [graph.nodes[0]]);
    addAnnotation(board, 'note');
    expect(board.annotations).toEqual(['note']);
  });
});
