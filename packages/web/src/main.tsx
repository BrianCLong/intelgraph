import React from 'react';
import ReactDOM from 'react-dom/client';
import $ from 'jquery';

function App() {
  React.useEffect(() => {
    $(document).on('socket:finintel', (_e, msg) => alert(msg));
  }, []);
  return <div>FinIntel Console</div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
