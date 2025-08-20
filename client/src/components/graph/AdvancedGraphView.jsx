import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import { useDispatch, useSelector } from 'react-redux'; // Import useSelector
import { graphInteractionActions as g } from '../../store/slices/graphInteractionSlice';
import {
  Box,
  CircularProgress,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import GraphContextMenu from './GraphContextMenu';
import AIInsightsPanel from './AIInsightsPanel';
import EdgeInspectorDialog from './EdgeInspectorDialog';
import TTPCorrelationOverlay from './TTPCorrelationOverlay'; // Import the new overlay component
import TTPTriagePanel from './TTPTriagePanel'; // Import the new triage panel component
import SubgraphExplorerDialog from './SubgraphExplorerDialog';

cytoscape.use(dagre);
cytoscape.use(coseBilkent);

const LABEL_ZOOM_THRESHOLD = 1.2;

export default function AdvancedGraphView({
  elements = { nodes: [], edges: [] },
  layout = 'cose-bilkent',
}) {
  const dispatch = useDispatch();
  const params = useParams?.() || {};
  const selectedNode = useSelector((state) => state.graphInteraction.selectedNode); // Get selectedNode from Redux store
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(() =>
    localStorage.getItem('graph.aiPanelOpen') === '0' ? false : true,
  );
  const [lodLabels, setLodLabels] = useState(true);
  const [layoutName, setLayoutName] = useState(
    () => localStorage.getItem('graph.layoutName') || layout,
  );
  const tooltipRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const [spriteLabels, setSpriteLabels] = useState(() =>
    localStorage.getItem('graph.spriteLabels') === '1' ? true : false,
  );
  const [edgeInspectorOpen, setEdgeInspectorOpen] = useState(false);
  const [edgeDetail, setEdgeDetail] = useState(null);
  const [ttpOverlayOpen, setTtpOverlayOpen] = useState(false); // New state for TTP overlay
  const [triagePanelOpen, setTriagePanelOpen] = useState(false); // New state for TTP triage panel
  const [subgraphOpen, setSubgraphOpen] = useState(false);
  const [subgraphElements, setSubgraphElements] = useState([]);

  const addElementsChunked = useMemo(() => {
    const ric =
      window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 16 }), 0));
    return (cy, nodes = [], edges = [], chunk = 2000) => {
      let i = 0,
        j = 0;
      function step() {
        const nSlice = nodes.slice(i, i + chunk);
        const eSlice = edges.slice(j, j + chunk);
        cy.startBatch();
        nSlice.forEach((n) => {
          if (!cy.getElementById(n.id).nonempty()) cy.add({ group: 'nodes', data: n });
        });
        eSlice.forEach((e) => {
          if (!cy.getElementById(e.id).nonempty()) cy.add({ group: 'edges', data: e });
        });
        cy.endBatch();
        i += chunk;
        j += chunk;
        if (i < nodes.length || j < edges.length) ric(step);
      }
      ric(step);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: 'node',
          style: { 'background-color': '#888', label: 'data(label)', 'font-size': 10 },
        },
        {
          selector: 'edge',
          style: {
            width: 1,
            'line-color': '#bbb',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#bbb',
            label: 'data(label)',
            'font-size': 8,
          },
        },
      ],
      wheelSensitivity: 0.2,
      textureOnViewport: true,
      pixelRatio: 1,
      minZoom: 0.1,
      maxZoom: 5,
      boxSelectionEnabled: true,
    });

    cyRef.current = cy;
    if (import.meta && import.meta.env && import.meta.env.MODE !== 'production') {
      // Expose for E2E tests
      window.__cy = cy;
    }

    setLoading(true);
    addElementsChunked(cy, elements.nodes, elements.edges);
    if (import.meta?.env?.VITE_SEED_ADV_GRAPH === '1' && (elements.nodes?.length || 0) === 0) {
      const seedNodes = [
        { id: 'n1', label: 'Alice', type: 'PERSON' },
        { id: 'n2', label: 'Bob', type: 'PERSON' },
        { id: 'n3', label: 'Acme Corp', type: 'ORGANIZATION' },
      ];
      const seedEdges = [
        { id: 'e1', source: 'n1', target: 'n2', type: 'KNOWS', label: 'KNOWS' },
        { id: 'e2', source: 'n2', target: 'n3', type: 'WORKS_FOR', label: 'WORKS_FOR' },
      ];
      addElementsChunked(cy, seedNodes, seedEdges, 1000);
    }

    const runLayout = () => {
      const cfg =
        layoutName === 'dagre'
          ? { name: 'dagre', rankDir: 'LR' }
          : layoutName === 'grid'
            ? { name: 'grid', fit: true }
            : layoutName === 'concentric'
              ? { name: 'concentric', minNodeSpacing: 15 }
              : { name: 'cose-bilkent', randomize: true, animate: false };
      cy.layout(cfg).run();
    };
    runLayout();

    // Restore camera if saved
    try {
      const cameraKey = params?.id ? `graph.camera.${params.id}` : 'graph.camera';
      const cam = JSON.parse(localStorage.getItem(cameraKey) || 'null');
      if (cam && typeof cam.zoom === 'number' && cam.pan) {
        cy.zoom(cam.zoom);
        cy.pan(cam.pan);
      }
    } catch (_) {}

    const updateLabelsForLOD = () => {
      const show = lodLabels && !spriteLabels && cy.zoom() >= LABEL_ZOOM_THRESHOLD;
      cy.batch(() => {
        const nodeLabel = show ? (ele) => ele.data('label') : () => '';
        const edgeLabel = show ? (ele) => ele.data('label') : () => '';
        cy.nodes().forEach((n) => n.style('label', nodeLabel(n)));
        cy.edges().forEach((e) => e.style('label', edgeLabel(e)));
      });
    };
    cy.on('zoom', updateLabelsForLOD);
    updateLabelsForLOD();

    // Persist camera
    const persistCamera = () => {
      const cam = { zoom: cy.zoom(), pan: cy.pan() };
      const cameraKey = params?.id ? `graph.camera.${params.id}` : 'graph.camera';
      localStorage.setItem(cameraKey, JSON.stringify(cam));
    };
    cy.on('zoom pan', persistCamera);

    cy.on('tap', 'node', (evt) => dispatch(g.selectNode(evt.target.id())));
    cy.on('tap', 'edge', (evt) => {
      dispatch(g.selectEdge(evt.target.id()));
      const e = evt.target;
      setEdgeDetail({
        id: e.id(),
        type: e.data('type'),
        label: e.data('label'),
        properties: e.data('properties'),
        source: e.source().data(),
        target: e.target().data(),
      });
      setEdgeInspectorOpen(true);
    });
    cy.on('tap', (evt) => {
      if (evt.target === cy) dispatch(g.clearSelection());
    });
    cy.on('cxttap', 'node, edge', (evt) => {
      const pos = evt.renderedPosition || evt.position;
      const pageX = evt.originalEvent?.pageX || pos.x;
      const pageY = evt.originalEvent?.pageY || pos.y;
      const targetType = evt.target.isNode() ? 'node' : 'edge';
      dispatch(g.contextMenuOpen({ x: pageX, y: pageY, targetType, targetId: evt.target.id() }));
    });

    setLoading(false);

    // Keyboard shortcuts
    const onKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        cy.boxSelectionEnabled(false);
        cy.panningEnabled(true);
      } else if (e.code === 'Escape') {
        cy.elements().unselect();
        dispatch(g.clearSelection());
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        cy.boxSelectionEnabled(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Focus animation on selection
    cy.on('select', 'node,edge', (evt) => {
      const ele = evt.target;
      const pos = ele.position();
      cy.animate(
        { center: { eles: ele }, zoom: Math.max(0.6, cy.zoom()), duration: 250 },
        { queue: true },
      );
    });

    // Throttled hover tooltip
    const tooltip = document.createElement('div');
    tooltip.style.position = 'fixed';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.background = 'rgba(0,0,0,0.75)';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '2px 6px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '11px';
    tooltip.style.zIndex = '9999';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
    tooltipRef.current = tooltip;

    let lastShow = 0;
    const showTooltip = (text, x, y) => {
      const now = performance.now();
      if (now - lastShow < 50) return; // throttle ~20fps
      lastShow = now;
      tooltip.textContent = text;
      tooltip.style.left = `${x + 12}px`;
      tooltip.style.top = `${y + 12}px`;
      tooltip.style.display = 'block';
    };
    const hideTooltip = () => {
      tooltip.style.display = 'none';
    };

    cy.on('mouseover', 'node,edge', (evt) => {
      const text = evt.target.data('label') || evt.target.id();
      const px = evt.renderedPosition;
      const rect = containerRef.current.getBoundingClientRect();
      const x = rect.left + px.x;
      const y = rect.top + px.y;
      showTooltip(text, x, y);
    });
    cy.on('mouseout', 'node,edge', hideTooltip);

    // Listen for element additions from context menu
    const onAddElements = (ev) => {
      const { nodes = [], edges = [] } = ev.detail || {};
      addElementsChunked(cy, nodes, edges);
    };
    document.addEventListener('graph:addElements', onAddElements);

    // Listen for edge inspector open events (from context menu)
    const onOpenInspector = (ev) => {
      const edgeId = ev.detail?.edgeId;
      const e = cy.getElementById(edgeId);
      if (e && e.nonempty() && e.isEdge()) {
        setEdgeDetail({
          id: e.id(),
          type: e.data('type'),
          label: e.data('label'),
          properties: e.data('properties'),
          source: e.source().data(),
          target: e.target().data(),
        });
        setEdgeInspectorOpen(true);
      }
    };
    document.addEventListener('graph:openEdgeInspector', onOpenInspector);

    const onExploreSubgraph = () => {
      const sel = cy.elements(':selected');
      if (sel.length === 0) return;
      const nodes = sel
        .nodes()
        .map((n) => ({ data: { ...n.data(), id: n.id() }, position: n.position() }));
      const edges = sel
        .edges()
        .map((e) => ({
          data: { ...e.data(), id: e.id(), source: e.source().id(), target: e.target().id() },
        }));
      setSubgraphElements([...nodes, ...edges]);
      setSubgraphOpen(true);
    };
    document.addEventListener('graph:exploreSubgraph', onExploreSubgraph);

    const onSyncSubgraph = (ev) => {
      const { nodes = [], edges = [] } = ev.detail || {};
      nodes.forEach((n) => {
        const node = cy.getElementById(n.id);
        if (node && node.nonempty()) {
          if (n.position) node.position(n.position);
          if (n.data) node.data({ ...node.data(), ...n.data });
        }
      });
      edges.forEach((e) => {
        const edge = cy.getElementById(e.id);
        if (edge && edge.nonempty() && e.data) edge.data({ ...edge.data(), ...e.data });
      });
    };
    document.addEventListener('graph:syncSubgraph', onSyncSubgraph);

    // Sprite labels overlay
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '5';
    containerRef.current.appendChild(canvas);
    overlayCanvasRef.current = canvas;

    const drawSprites = () => {
      if (!overlayCanvasRef.current) return;
      const c = overlayCanvasRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      c.width = rect.width;
      c.height = rect.height;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);
      if (!spriteLabels) return;
      const z = cy.zoom();
      if (z < LABEL_ZOOM_THRESHOLD) return;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.font = '11px sans-serif';
      ctx.textBaseline = 'top';
      const nodes = cy.nodes(':visible');
      const max = Math.min(nodes.length, 2000);
      for (let i = 0; i < max; i++) {
        const n = nodes[i];
        const p = n.renderedPosition();
        const text = n.data('label') || n.id();
        ctx.fillText(text, p.x + 8, p.y + 8);
      }
    };
    const scheduleDraw = () => requestAnimationFrame(drawSprites);
    cy.on('render zoom pan add remove position', scheduleDraw);
    scheduleDraw();
    return () => {
      document.removeEventListener('graph:addElements', onAddElements);
      document.removeEventListener('graph:openEdgeInspector', onOpenInspector);
      document.removeEventListener('graph:exploreSubgraph', onExploreSubgraph);
      document.removeEventListener('graph:syncSubgraph', onSyncSubgraph);
      cy.off('render zoom pan add remove position', scheduleDraw);
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.remove();
        overlayCanvasRef.current = null;
      }
      if (tooltipRef.current) {
        tooltipRef.current.remove();
        tooltipRef.current = null;
      }
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cy.off('zoom pan', persistCamera);
      cy.destroy();
      cyRef.current = null;
    };
  }, [dispatch, elements, layout, lodLabels, layoutName, spriteLabels]);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('graph.layoutName', layoutName);
  }, [layoutName]);
  useEffect(() => {
    localStorage.setItem('graph.lodLabels', lodLabels ? '1' : '0');
  }, [lodLabels]);
  useEffect(() => {
    localStorage.setItem('graph.spriteLabels', spriteLabels ? '1' : '0');
  }, [spriteLabels]);
  useEffect(() => {
    localStorage.setItem('graph.aiPanelOpen', insightsOpen ? '1' : '0');
  }, [insightsOpen]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />

      <Box
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          p: 1,
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1,
          display: 'flex',
          gap: 1,
          alignItems: 'center',
        }}
      >
        <FormControlLabel
          control={
            <Switch checked={insightsOpen} onChange={(e) => setInsightsOpen(e.target.checked)} />
          }
          label="AI Panel"
        />
        <FormControlLabel
          control={<Switch checked={lodLabels} onChange={(e) => setLodLabels(e.target.checked)} />}
          label="LOD Labels"
        />
        <FormControlLabel
          control={
            <Switch checked={spriteLabels} onChange={(e) => setSpriteLabels(e.target.checked)} />
          }
          label="Sprite Labels"
        />
        <FormControlLabel
          control={
            <Switch
              checked={ttpOverlayOpen}
              onChange={(e) => setTtpOverlayOpen(e.target.checked)}
            />
          }
          label="TTP Overlay"
        />
        <FormControlLabel
          control={
            <Switch
              checked={triagePanelOpen}
              onChange={(e) => setTriagePanelOpen(e.target.checked)}
            />
          }
          label="Triage Panel"
        />
        <Select size="small" value={layoutName} onChange={(e) => setLayoutName(e.target.value)}>
          <MenuItem value="cose-bilkent">CoSE</MenuItem>
          <MenuItem value="dagre">Dagre</MenuItem>
          <MenuItem value="grid">Grid</MenuItem>
          <MenuItem value="concentric">Concentric</MenuItem>
        </Select>
        {import.meta?.env?.VITE_SEED_BUTTON === '1' && (
          <button
            onClick={() => {
              const seedNodes = [
                { id: 'n1', label: 'Alice', type: 'PERSON' },
                { id: 'n2', label: 'Bob', type: 'PERSON' },
                { id: 'n3', label: 'Acme Corp', type: 'ORGANIZATION' },
              ];
              const seedEdges = [
                { id: 'e1', source: 'n1', target: 'n2', type: 'KNOWS', label: 'KNOWS' },
                { id: 'e2', source: 'n2', target: 'n3', type: 'WORKS_FOR', label: 'WORKS_FOR' },
              ];
              const cy = cyRef.current;
              if (!cy) return;
              addElementsChunked(cy, seedNodes, seedEdges, 1000);
            }}
          >
            Seed Demo
          </button>
        )}
      </Box>

      <GraphContextMenu />
      <AIInsightsPanel open={insightsOpen} onClose={() => setInsightsOpen(false)} />
      <EdgeInspectorDialog
        open={edgeInspectorOpen}
        onClose={() => setEdgeInspectorOpen(false)}
        edge={edgeDetail}
      />
      {/* TTP Correlation Overlay */}
      <TTPCorrelationOverlay
        cy={cyRef.current}
        nodes={elements.nodes}
        edges={elements.edges}
        open={ttpOverlayOpen}
      />
      {/* TTP Triage Panel */}
      <TTPTriagePanel
        open={triagePanelOpen}
        onClose={() => setTriagePanelOpen(false)}
        selectedEntity={elements.nodes.find((n) => n.id === selectedNode)}
      />
      <SubgraphExplorerDialog
        open={subgraphOpen}
        onClose={() => setSubgraphOpen(false)}
        elements={subgraphElements}
      />
    </Box>
  );
}
