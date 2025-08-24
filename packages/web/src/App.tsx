import React, { useEffect } from 'react';
import $ from 'jquery';

export const App: React.FC = () => {
  useEffect(() => {
    $(document).on('socket:searchAlert', (_e, msg) => {
      console.log(msg);
    });
  }, []);

  return <div role="main">IntelGraph Web</div>;
};
