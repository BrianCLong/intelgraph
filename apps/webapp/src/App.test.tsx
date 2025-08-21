import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { App } from './App';
import { store, selectNode } from './store';

jest.mock('cytoscape', () => () => ({
  on: () => {},
  container: () => document.createElement('div'),
}));

jest.mock('vis-timeline/standalone', () => ({
  DataSet: class {
    add() {}
  },
  Timeline: class {
    on() {}
    getWindow() {
      return { start: new Date(), end: new Date() };
    }
    setSelection() {}
    dom = { center: document.createElement('div') };
  },
}));

jest.mock('mapbox-gl', () => ({
  Map: class {
    flyTo() {}
  },
  Marker: class {
    setLngLat() {
      return this;
    }
    addTo() {
      return this;
    }
  },
  accessToken: '',
}));

test('renders panes', () => {
  render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  expect(screen.getByLabelText('toggle theme')).toBeInTheDocument();
});

test('selection updates store', () => {
  store.dispatch(selectNode('a'));
  expect(store.getState().selection.selectedNodeId).toBe('a');
});
