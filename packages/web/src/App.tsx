import { useEffect, useState } from 'react';
import $ from 'jquery';

export default function App() {
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    fetch('/health')
      .then((r) => r.json())
      .then(() => setStatus('ok'));
    $(document).on('socket:graphai', (_e, msg) => console.log(msg));
  }, []);
  return <div>GraphAI Web {status}</div>;
}
