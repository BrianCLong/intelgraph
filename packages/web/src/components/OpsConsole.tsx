import React from 'react';
import Typography from '@mui/material/Typography';
import $ from 'jquery';

const OpsConsole: React.FC = () => {
  React.useEffect(() => {
    $(document).on('socket:ops', (_e, msg) => {
      // eslint-disable-next-line no-console
      console.log('event', msg);
    });
  }, []);

  return <Typography role="heading">Ops Console</Typography>;
};

export default OpsConsole;
