import React from 'react';
import $ from 'jquery';

export const App: React.FC = () => {
  React.useEffect(() => {
    $('#upload').on('change', () => console.log('upload'));
  }, []);
  return (
    <div>
      <input id="upload" type="file" />
    </div>
  );
};
