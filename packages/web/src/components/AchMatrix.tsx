import React from 'react';
import $ from 'jquery';

export default function AchMatrix() {
  const handleClick = () => {
    $(document).trigger('cy:select', { id: 'e1' });
  };
  return <button onClick={handleClick}>Select Evidence</button>;
}
