import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import ForceGraph2D from "react-force-graph-2d";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Download, Expand, Map as MapIcon, Play, RefreshCw, Search, Settings, ZoomIn, ZoomOut, Network, Crosshair, Share2, Globe2 } from "lucide-react";


// Geospatial & DAG layout libs
import DeckGL from "@deck.gl/react";
import { ArcLayer, ScatterplotLayer } from "@deck.gl/layers";
import Map, { NavigationControl } from "react-map-gl";
import maplibregl from "maplibre-gl";
import dagre from "dagre";


// ---- Types ----
type GraphNode = {
  id: string;
  label?: string;
  type?: string;
  degree?: number;
  ts?: number; // epoch millis for timeline filtering
  group?: string; // community id
  lat?: number; // optional geo
  lon?: number; // optional geo
  x?: number; y?: number; // layout positions
  fx?: number; fy?: number; // fixed positions for ForceGraph
  [k: string]: any;
};


type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
  weight?: number;
  ts?: number;
  [k: string]: any;
};


type GraphData = { nodes: GraphNode[]; links: GraphLink[] };


// ---- Utilities ----
const palette = ["#2563eb","#059669","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#eab308","#f97316","#22c55e","#06b6d4"];
const by = <T,>(arr: T[], key: (t: T) => string | number) =>
  Object.groupBy ? (Object.groupBy as any)(arr, key) : arr.reduce((acc: any, x: T) => { const k = key(x); (acc[k] ||= []).push(x); return acc; }, {});


function louvainLikeCommunities(data: GraphData): Record<string, string> {
  const parent: Record<string, string> = {};
  const find = (x: string): string => (parent[x] ? (parent[x] = find(parent[x])) : (parent[x] = x));
  const union = (a: string, b: string) => { a = find(a); b = find(b); if (a !== b) parent[b] = a; };
  data.links.forEach((e) => union(String((e.source as any).id ?? e.source), String((e.target as any).id ?? e.target)));
  const res: Record<string, string> = {};
  data.nodes.forEach((n) => (res[n.id] = find(n.id)));
  return res;
}


function computeDegrees(data: GraphData): Record<string, number> {
  const deg: Record<string, number> = {};
  data.nodes.forEach((node) => (deg[node.id] = 0));
  data.links.forEach((link) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    if (deg[sourceId] !== undefined) deg[sourceId]++;
    if (deg[targetId] !== undefined) deg[targetId]++;
  });
  return deg;
}

// Placeholder mock data (will be replaced by GraphQL)
const mock: GraphData = {
  nodes: [
    { id: "node1", label: "Entity A", type: "Person", degree: 2, ts: 1678886400000, group: "g1", lat: 34.0522, lon: -118.2437 },
    { id: "node2", label: "Entity B", type: "Organization", degree: 3, ts: 1678972800000, group: "g1", lat: 34.0522, lon: -118.2437 },
    { id: "node3", label: "Entity C", type: "Location", degree: 1, ts: 1679059200000, group: "g2", lat: 34.0522, lon: -118.2437 },
    { id: "node4", label: "Entity D", type: "Event", degree: 2, ts: 1679145600000, group: "g1", lat: 34.0522, lon: -118.2437 },
    { id: "node5", label: "Entity E", type: "Person", degree: 1, ts: 1679232000000, group: "g2", lat: 34.0522, lon: -118.2437 },
  ],
  links: [
    { source: "node1", target: "node2", type: "knows", weight: 0.8, ts: 1678886400000 },
    { source: "node2", target: "node3", type: "located_at", weight: 0.5, ts: 1678972800000 },
    { source: "node1", target: "node4", type: "attended", weight: 0.9, ts: 1679059200000 },
    { source: "node4", target: "node2", type: "involved_in", weight: 0.7, ts: 1679145600000 },
    { source: "node3", target: "node5", type: "related_to", weight: 0.6, ts: 1679232000000 },
  ],
};

// Main component
export function IntelGraphWorkbench() {
  const fgRef = useRef<any>();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [minDegree, setMinDegree] = useState<number>(0);
  const [maxDegree, setMaxDegree] = useState<number>(100);
  const [minTimestamp, setMinTimestamp] = useState<number>(0);
  const [maxTimestamp, setMaxTimestamp] = useState<number>(Date.now());
  const [showMap, setShowMap] = useState<boolean>(false);
  const [layoutType, setLayoutType] = useState<"force" | "dagre" | "radial">("force");
  const [isMockMode, setIsMockMode] = useState<boolean>(true); // Default to mock mode for initial development
  // --- NEW: Loading and Error states for GraphQL fetching ---
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- NEW: GraphQL Query Placeholder ---
  // This is a basic example. You'll need to adjust it based on your actual GraphQL schema.
  // It assumes a query named 'graph' that returns nodes and links.
  const GRAPHQL_QUERY = `
    query GetGraphData {
      graph {
        nodes {
          id
          label
          type
          degree
          ts
          group
          lat
          lon
        }
        links {
          source
          target
          type
          weight
          ts
        }
      }
    }
  `;

  // --- NEW: Function to fetch graph data from GraphQL endpoint ---
  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: GRAPHQL_QUERY }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors.map((err: any) => err.message).join(", "));
      }

      // Assuming the data structure matches GraphData type
      // Adjust 'result.data.graph' based on your actual GraphQL response structure
      if (result.data && result.data.graph) {
        setGraphData(result.data.graph);
      } else {
        setGraphData({ nodes: [], links: [] }); // Set empty if no data
      }
    } catch (e: any) {
      console.error("Error fetching graph data:", e);
      setError(e.message || "Failed to fetch graph data.");
      setGraphData({ nodes: [], links: [] }); // Clear graph on error
    } finally {
      setLoading(false);
    }
  }, [GRAPHQL_QUERY]); // Recreate if query changes (unlikely for a fixed query)

  // --- MODIFIED: useEffect to load data ---
  useEffect(() => {
    if (isMockMode) {
      setGraphData(mock);
      setLoading(false); // Mock data is instant
      setError(null);
    } else {
      fetchGraphData();
    }
  }, [isMockMode, fetchGraphData]); // Depend on isMockMode and fetchGraphData

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    setSelectedLink(null); // Clear link selection
    // Center on node
    fgRef.current.centerAndZoom(node.x, node.y, 1000);
  }, []);

  const handleLinkClick = useCallback((link: GraphLink) => {
    setSelectedLink(link);
    setSelectedNode(null); // Clear node selection
  }, []);

  const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleDegreeChange = useCallback((value: number[]) => {
    setMinDegree(value[0]);
    setMaxDegree(value[1]);
  }, []);

  const handleTimestampChange = useCallback((value: number[]) => {
    setMinTimestamp(value[0]);
    setMaxTimestamp(value[1]);
  }, []);

  const handleLayoutChange = useCallback((value: "force" | "dagre" | "radial") => {
    setLayoutType(value);
    // TODO: Implement layout logic here (dagre, radial)
    // For now, just reset force layout
    if (fgRef.current) {
      fgRef.current.d3ReheatSimulation();
    }
  }, []);

  const handleToggleMap = useCallback(() => {
    setShowMap((prev) => !prev);
  }, []);

  // --- MODIFIED: handleRefresh to re-fetch data if not in mock mode ---
  const handleRefresh = useCallback(() => {
    if (!isMockMode) {
      fetchGraphData();
    } else {
      setGraphData(mock); // Re-apply mock data
    }
  }, [isMockMode, fetchGraphData]);

  const handleDownloadPNG = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.exportImage('image/png', 'intelgraph-workbench.png');
    }
  }, []);

  const filteredGraphData = useMemo(() => {
    const filteredNodes = graphData.nodes.filter((node) => {
      const matchesSearch = searchQuery
        ? node.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.id.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesDegree = (node.degree ?? 0) >= minDegree && (node.degree ?? 0) <= maxDegree;
      const matchesTimestamp = (node.ts ?? 0) >= minTimestamp && (node.ts ?? 0) <= maxTimestamp;
      return matchesSearch && matchesDegree && matchesTimestamp;
    });

    const filteredNodeIds = new Set(filteredNodes.map((node) => node.id));

    const filteredLinks = graphData.links.filter((link) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });

    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, searchQuery, minDegree, maxDegree, minTimestamp, maxTimestamp]);

  const nodeColors = useMemo(() => {
    const communities = louvainLikeCommunities(filteredGraphData);
    const uniqueGroups = Array.from(new Set(Object.values(communities)));
    return filteredGraphData.nodes.reduce((acc: Record<string, string>, node) => {
      const group = communities[node.id];
      const colorIndex = uniqueGroups.indexOf(group) % palette.length;
      acc[node.id] = palette[colorIndex];
      return acc;
    }, {});
  }, [filteredGraphData]);

  // --- NEW: Render loading and error messages ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen text-lg text-gray-500">
        Loading graph data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen w-screen text-lg text-red-500">
        Error: {error}
        <Button onClick={handleRefresh} className="ml-4">
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-gray-50 text-gray-900">
      {/* Left Panel */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="w-80 bg-white p-4 shadow-lg flex flex-col z-10"
      >
        <h1 className="text-2xl font-bold mb-4 text-blue-700">IntelGraph Workbench</h1>

        <Tabs defaultValue="data" className="flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="flex-grow flex flex-col overflow-y-auto pr-2">
            <div className="mb-4">
              <Label htmlFor="search">Search Nodes</Label>
              <Input
                id="search"
                type="text"
                placeholder="Search by ID or Label..."
                value={searchQuery}
                onChange={handleSearch}
                className="mt-1"
              />
            </div>

            <div className="mb-4">
              <Label>Degree Filter ({minDegree} - {maxDegree})</Label>
              <Slider
                min={0}
                max={graphData.nodes.length > 0 ? Math.max(...graphData.nodes.map(n => n.degree || 0)) : 100}
                step={1}
                value={[minDegree, maxDegree]}
                onValueChange={handleDegreeChange}
                className="mt-2"
              />
            </div>

            <div className="mb-4">
              <Label>Timeline Filter</Label>
              <Slider
                min={graphData.nodes.length > 0 ? Math.min(...graphData.nodes.map(n => n.ts || 0)) : 0}
                max={graphData.nodes.length > 0 ? Math.max(...graphData.nodes.map(n => n.ts || 0)) : Date.now()}
                step={86400000} // 1 day in milliseconds
                value={[minTimestamp, maxTimestamp]}
                onValueChange={handleTimestampChange}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{new Date(minTimestamp).toLocaleDateString()}</span>
                <span>{new Date(maxTimestamp).toLocaleDateString()}</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between mb-4">
              <Label htmlFor="mock-mode">Mock Data Mode</Label>
              <Switch
                id="mock-mode"
                checked={isMockMode}
                onCheckedChange={setIsMockMode}
              />
            </div>

            <Button onClick={handleRefresh} className="w-full mb-4">
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh Graph
            </Button>

            <div className="flex-grow overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">Selection Inspector</h3>
              {selectedNode && (
                <Card className="mb-2 bg-blue-50 border-blue-200">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-md text-blue-700">Node: {selectedNode.label || selectedNode.id}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1 text-sm">
                    {Object.entries(selectedNode).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {selectedLink && (
                <Card className="mb-2 bg-green-50 border-green-200">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-md text-green-700">Link: {selectedLink.type || "Relationship"}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1 text-sm">
                    <div><span className="font-medium">Source:</span> {(selectedLink.source as GraphNode).label || (selectedLink.source as GraphNode).id || selectedLink.source}</div>
                    <div><span className="font-medium">Target:</span> {(selectedLink.target as GraphNode).label || (selectedLink.target as GraphNode).id || selectedLink.target}</div>
                    {Object.entries(selectedLink).map(([key, value]) => (
                      // Avoid re-displaying source/target if they are objects
                      (key !== 'source' && key !== 'target') && (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                      )
                    ))}
                  </CardContent>
                </Card>
              )}
              {!selectedNode && !selectedLink && (
                <p className="text-sm text-gray-500">Click on a node or link to inspect.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="flex-grow flex flex-col overflow-y-auto pr-2">
            <div className="mb-4">
              <Label htmlFor="layout-type">Graph Layout</Label>
              <Select value={layoutType} onValueChange={handleLayoutChange as any}>
                <SelectTrigger id="layout-type" className="mt-1">
                  <SelectValue placeholder="Select a layout" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="force">Force-Directed</SelectItem>
                  <SelectItem value="dagre">DAG (Hierarchical)</SelectItem>
                  <SelectItem value="radial">Radial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between mb-4">
              <Label htmlFor="show-map">Show Geospatial Map</Label>
              <Switch
                id="show-map"
                checked={showMap}
                onCheckedChange={handleToggleMap}
              />
            </div>

            <Separator className="my-4" />

            <Button onClick={handleDownloadPNG} className="w-full mb-2">
              <Download className="h-4 w-4 mr-2" /> Download PNG
            </Button>
            {/* Add more settings here */}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Main Graph Area */}
      <div className="flex-grow relative">
        {showMap && (
          <div className="absolute inset-0 z-0">
            <Map
              mapLib={maplibregl}
              initialViewState={{
                longitude: -100,
                latitude: 40,
                zoom: 3,
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" // Example map style
            >
              <NavigationControl position="top-left" />
              <DeckGL
                initialViewState={{
                  longitude: -100,
                  latitude: 40,
                  zoom: 3,
                }}
                controller={true}
                layers={[
                  new ScatterplotLayer({
                    id: 'nodes-layer',
                    data: filteredGraphData.nodes.filter(n => n.lat !== undefined && n.lon !== undefined),
                    getPosition: d => [d.lon, d.lat],
                    getFillColor: d => {
                      const color = nodeColors[d.id];
                      return color ? [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16), 200] : [0, 0, 0, 200];
                    },
                    getRadius: 10000, // Adjust radius based on zoom level
                    pickable: true,
                    onHover: ({object, x, y}) => {
                      // TODO: Show tooltip on hover
                    },
                    onClick: ({object}) => {
                      if (object) handleNodeClick(object as GraphNode);
                    }
                  }),
                  new ArcLayer({
                    id: 'links-layer',
                    data: filteredGraphData.links.filter(link => {
                      const sourceNode = filteredGraphData.nodes.find(n => n.id === (typeof link.source === 'object' ? link.source.id : link.source));
                      const targetNode = filteredGraphData.nodes.find(n => n.id === (typeof link.target === 'object' ? link.target.id : link.target));
                      return sourceNode?.lat !== undefined && sourceNode?.lon !== undefined && targetNode?.lat !== undefined && targetNode?.lon !== undefined;
                    }),
                    getSourcePosition: d => {
                      const sourceNode = filteredGraphData.nodes.find(n => n.id === (typeof d.source === 'object' ? d.source.id : d.source));
                      return sourceNode ? [sourceNode.lon, sourceNode.lat] : [0,0];
                    },
                    getTargetPosition: d => {
                      const targetNode = filteredGraphData.nodes.find(n => n.id === (typeof d.target === 'object' ? d.target.id : d.target));
                      return targetNode ? [targetNode.lon, targetNode.lat] : [0,0];
                    },
                    getSourceColor: [0, 128, 255, 160],
                    getTargetColor: [255, 0, 128, 160],
                    getWidth: 2,
                    pickable: true,
                    onHover: ({object, x, y}) => {
                      // TODO: Show tooltip on hover
                    },
                    onClick: ({object}) => {
                      if (object) handleLinkClick(object as GraphLink);
                    }
                  })
                ]}
              />
            </Map>
          </div>
        )}

        <ForceGraph2D
          ref={fgRef}
          graphData={filteredGraphData}
          nodeLabel="label"
          nodeColor={(node: any) => nodeColors[node.id]}
          nodeAutoColorBy="group" // Fallback if nodeColors not set
          linkWidth={2}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={1}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          onBackgroundClick={() => {
            setSelectedNode(null);
            setSelectedLink(null);
          }}
          // Adjust simulation parameters for better layout
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          enableNodeDrag={true}
          // Conditional rendering for map overlay
          // If showMap is true, ForceGraph2D should not render nodes/links as they are handled by DeckGL
          // However, ForceGraph2D is still useful for its simulation and controls
          // We might need to hide its visual elements when map is active
          nodeCanvasObject={(node, ctx, globalScale) => {
            if (showMap) return; // Don't draw nodes if map is active
            const label = node.label || node.id;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = nodeColors[node.id] || '#000000';
            ctx.fillText(label, node.x, node.y);

            node.__bckgDimensions = bckgDimensions; // for hit testing
          }}
          linkCanvasObject={(link, ctx, globalScale) => {
            if (showMap) return; // Don't draw links if map is active
            // Draw link as before
            const start = link.source as GraphNode;
            const end = link.target as GraphNode;
            if (!start || !end || !start.x || !start.y || !end.x || !end.y) return;

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 1 / globalScale;
            ctx.stroke();
          }}
          linkCanvasObjectMode={() => 'after'} // Draw links after nodes
          // Ensure ForceGraph2D is always rendered, but its visual output is conditional
          className={showMap ? "opacity-0 pointer-events-none" : ""} // Hide ForceGraph2D when map is active
        />
      </div>
    </div>
  );
}
