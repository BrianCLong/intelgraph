import { emit } from '../src/components/Chat';
import $ from 'jquery';

jest.mock('jquery', () => {
  const fn: any = () => fn;
  fn.trigger = jest.fn();
  return { __esModule: true, default: fn };
});

test('emit triggers event', () => {
  (global as any).document = {};
  emit('hi');
  expect(($ as any).trigger).toHaveBeenCalledWith('chat:send', 'hi');
});
