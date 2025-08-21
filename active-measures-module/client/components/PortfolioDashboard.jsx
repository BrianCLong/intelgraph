import React from 'react';
import { useQuery } from '@apollo/client';
import CytoscapeComponent from 'react-cytoscapejs';
import { GET_PORTFOLIO } from '../queries';

const PortfolioDashboard = ({ tuners }) => {
  const { data, loading } = useQuery(GET_PORTFOLIO, { variables: { tuners } });
  if (loading) return <p>Loading...</p>;
  const elements = data.activeMeasuresPortfolio.map(m => ({ data: { id: m.id, label: m.description } }));

  return (
    <div>
      <h1>Active Measures Portfolio</h1>
      <CytoscapeComponent elements={elements} style={{ width: '100%', height: '600px' }} />
      <div>Tuners: Proportionality {tuners.proportionality}</div>
      {/* Sliders for tuners */}
    </div>
  );
};

export default PortfolioDashboard;