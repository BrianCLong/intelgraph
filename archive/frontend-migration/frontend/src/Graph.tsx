import React, { useEffect, useRef } from 'react';
import cytoscape, { ElementsDefinition, Position } from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

const LOD_ZOOM = 1;

const debounce = <T extends (...args: any[]) => void>(
  fn: T,
  delay = 50,
): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

interface GraphProps {
  elements: ElementsDefinition;
  neighborhoodMode: boolean;
}

const Graph: React.FC<GraphProps> = ({ elements, neighborhoodMode }) => {
  const cyRef = useRef<HTMLDivElement | null>(null);
  const cyInstance = useRef<cytoscape.Core | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!cyRef.current) return;

    cyInstance.current = cytoscape({
      container: cyRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'mapData(deception_score, 0, 1, orange, red)',
            label: 'data(label)',
            color: '#fff',
            'text-valign': 'center',
            'font-size': '10px',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#9dbaea',
            'target-arrow-color': '#9dbaea',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
        { selector: '.hidden', style: { display: 'none' } },
      ],
      layout: { name: 'grid', fit: true },
    });

    const cy = cyInstance.current;

    const updateLod = () => {
      const zoom = cy.zoom();
      cy.startBatch();
      if (zoom < LOD_ZOOM) {
        cy.nodes().style('label', '');
        cy.edges().style('target-arrow-shape', 'none');
      } else {
        cy.nodes().style('label', 'data(label)');
        cy.edges().style('target-arrow-shape', 'triangle');
      }
      cy.endBatch();
    };

    cy.on('zoom', debounce(updateLod, 50));
    updateLod();

    const runAsyncLayout = () => {
      workerRef.current = new Worker(new URL('./layoutWorker.ts', import.meta.url));
      workerRef.current.onmessage = (e: MessageEvent<{ positions: Record<string, Position> }>) => {
        const { positions } = e.data;
        cy.startBatch();
        Object.keys(positions).forEach((id) => {
          cy.getElementById(id).position(positions[id]);
        });
        cy.endBatch();
        workerRef.current?.terminate();
      };
      workerRef.current.postMessage({ elements: cy.json().elements });
    };

    runAsyncLayout();

    const handleResize = debounce(() => cy.resize(), 100);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      workerRef.current?.terminate();
      cy.destroy();
    };
  }, [elements]);

  useEffect(() => {
    const cy = cyInstance.current;
    if (!cy) return;

    const showNeighborhood = (node: cytoscape.NodeSingular, hops = 2) => {
      cy.startBatch();
      cy.elements().addClass('hidden');
      let neighborhood: cytoscape.CollectionReturnValue = node;
      for (let i = 0; i < hops; i++) {
        neighborhood = neighborhood.union(neighborhood.neighborhood());
      }
      neighborhood.removeClass('hidden');
      cy.endBatch();
    };

    const reset = () => {
      cy.startBatch();
      cy.elements().removeClass('hidden');
      cy.endBatch();
    };

    const handler = (e: cytoscape.EventObject) => showNeighborhood(e.target);

    if (neighborhoodMode) {
      cy.on('tap', 'node', handler);
    } else {
      cy.removeListener('tap', 'node', handler);
      reset();
    }
  }, [neighborhoodMode]);

  return <div id="cy" ref={cyRef} style={{ height: '80vh', width: '100%' }} />;
};

export default Graph;
