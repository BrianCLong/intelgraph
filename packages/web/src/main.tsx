import React from 'react';
import ReactDOM from 'react-dom/client';
import $ from 'jquery';

function App() {
  React.useEffect(() => {
    $(document).on('custom:event', (_e, data) => {
      console.log('jquery event', data);
    });
  }, []);
  return <div>IntelGraph Web</div>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
);
