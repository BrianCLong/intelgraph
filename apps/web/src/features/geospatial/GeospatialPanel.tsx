/* eslint-disable */
import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import $ from 'jquery';

export default function GeospatialPanel() {
  useEffect(() => {
    $('#map').on('zoom pan', () => {});
  }, []);
  return (
    <Box p={2}>
      <Typography variant="h6">Geospatial Analytics</Typography>
      <div id="map" style={{ height: 200 }} />
    </Box>
  );
}
