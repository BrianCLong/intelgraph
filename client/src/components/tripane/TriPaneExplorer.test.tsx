import { render, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TriPaneExplorer } from './TriPaneExplorer';

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.HTMLElement.prototype.scrollIntoView = function () {};
});

expect.extend(toHaveNoViolations);

test('renders three panels', async () => {
  const { getByLabelText, findByLabelText } = render(<TriPaneExplorer />);
  expect(getByLabelText('Graph panel')).toBeInTheDocument();
  await findByLabelText('Timeline chart');
  await findByLabelText('Map mock');
});

test('opens command palette with keyboard', () => {
  const { queryByRole } = render(<TriPaneExplorer />);
  expect(queryByRole('dialog', { name: 'Command Palette' })).toBeNull();
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
  expect(queryByRole('dialog', { name: 'Command Palette' })).toBeInTheDocument();
});

test('is accessible', async () => {
  const { container } = render(<TriPaneExplorer />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
