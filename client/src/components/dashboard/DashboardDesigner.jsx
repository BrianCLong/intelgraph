import React, { useState } from 'react';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import RGL, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const GridLayout = WidthProvider(RGL);

function DashboardDesigner() {
  const [layout, setLayout] = useState([
    { i: '0', x: 0, y: 0, w: 4, h: 2 },
    { i: '1', x: 4, y: 0, w: 4, h: 2 }
  ]);

  const addWidget = () => {
    const newId = layout.length.toString();
    setLayout([...layout, { i: newId, x: 0, y: Infinity, w: 4, h: 2 }]);
  };

  return (
    <Box>
      <Button variant="contained" onClick={addWidget} sx={{ mb: 2 }}>
        Add Widget
      </Button>
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={100}
        onLayoutChange={(l) => setLayout(l)}
      >
        {layout.map((item) => (
          <div key={item.i} data-testid={`widget-${item.i}`}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography>Widget {parseInt(item.i, 10) + 1}</Typography>
              </CardContent>
            </Card>
          </div>
        ))}
      </GridLayout>
    </Box>
  );
}

export default DashboardDesigner;
