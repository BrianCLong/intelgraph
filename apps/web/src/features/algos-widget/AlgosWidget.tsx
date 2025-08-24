import React from 'react';
import { Box, Button } from '@mui/material';
import $ from 'jquery';
import { pagerank } from '@intelgraph/graph-algos-js';

interface Props {
  cy: any; // Cytoscape instance
  serviceUrl: string;
}

const AlgosWidget: React.FC<Props> = ({ cy, serviceUrl }) => {
  React.useEffect(() => {
    const handler = (evt: any) => console.log('cy event', evt.type);
    $(cy.container()).on('tap', handler);
    return () => {
      $(cy.container()).off('tap', handler);
    };
  }, [cy]);

  const runPagerank = async () => {
    const nodes = cy.nodes().map((n: any) => n.id());
    const edges = cy.edges().map((e: any) => [e.source().id(), e.target().id()]);
    await pagerank(serviceUrl, { nodes, edges });
  };

  return (
    <Box>
      <Button variant="contained" onClick={runPagerank}>
        Run PageRank
      </Button>
    </Box>
  );
};

export default AlgosWidget;
