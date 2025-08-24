import React, { useEffect } from 'react';
import $ from 'jquery';

export const App: React.FC = () => {
  useEffect(() => {
    $(document).on('demo:event', (_e, detail) => {
      console.log('event', detail);
    });
  }, []);
  return <div role="main">Resolution Console</div>;
};
