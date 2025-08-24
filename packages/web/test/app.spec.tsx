import { fireEvent } from '@testing-library/react';
import $ from 'jquery';
import React from 'react';
import { render } from '@testing-library/react';
import { App } from '../src/App';

test('jQuery event wiring', () => {
  const spy = jest.fn();
  $(document).on('socket:searchAlert', spy);
  render(<App />);
  const event = $.Event('socket:searchAlert');
  $(document).trigger(event, ['hello']);
  expect(spy).toHaveBeenCalled();
});
