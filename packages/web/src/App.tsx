import { useState } from 'react';
import $ from 'jquery';

export default function App() {
  const [msg, setMsg] = useState('');

  function handleClick() {
    setMsg('Welcome to GA-Platform');
    $(document).trigger('socket:platform', ['demo']);
  }

  return (
    <div>
      <h1>Admin Console</h1>
      <button onClick={handleClick}>Init</button>
      <p>{msg}</p>
    </div>
  );
}
