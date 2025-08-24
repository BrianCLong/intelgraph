import { useState } from 'react';
import $ from 'jquery';

export function emit(text: string) {
  $(document).trigger('chat:send', text);
}

export function Chat() {
  const [text, setText] = useState('');
  function send() {
    emit(text);
    setText('');
  }
  return (
    <div>
      <input aria-label="chat" value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
}
