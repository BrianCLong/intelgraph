import React, { useRef, useEffect } from 'react';
import cytoscape from 'cytoscape';

interface GraphProps {
  elements: any[]; // Replace 'any' with proper element type if available
}

const Graph = ({ elements }: GraphProps) => {
  const cyRef = useRef(null);
  const cyInstance = useRef(null);
  const workerRef = useRef(null);

  useEffect(() => {
    if (!cyRef.current) return;

    cyInstance.current = cytoscape({
      container: cyRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'width': 20,
            'height': 20
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'curve-style': 'bezier'
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: false
      }
    });

    return () => {
      if (cyInstance.current) {
        cyInstance.current.destroy();
      }
    };
  }, [elements]);

  return <div ref={cyRef} style={{ width: '100%', height: '100%' }} />;
