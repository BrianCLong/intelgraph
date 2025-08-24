import React from 'react';
import ReactDOM from 'react-dom/client';
import $ from 'jquery';

function App() {
  React.useEffect(() => {
    $(document).on('socket:investigator', (_e, data) => console.log(data));
  }, []);
  return <div>GA-Investigator Console</div>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />);
