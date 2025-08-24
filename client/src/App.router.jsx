import React, { useEffect, useMemo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Provider } from "react-redux";
import { ApolloProvider } from "@apollo/client";
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  LinearProgress,
  Divider,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Search,
  Timeline,
  Psychology,
  Menu as MenuIcon,
  Map,
  Assessment,
  Settings,
} from "@mui/icons-material";
import { getIntelGraphTheme } from "./theme/intelgraphTheme";
import { store } from "./store";
import { apolloClient } from "./services/apollo";
import { useSelector } from "react-redux";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import LoginPage from "./components/auth/LoginPage.jsx";
import InteractiveGraphExplorer from "./components/graph/InteractiveGraphExplorer";
import IntelligentCopilot from "./components/ai/IntelligentCopilot";
import LiveCollaborationPanel from "./components/collaboration/LiveCollaborationPanel";
import InvestigationTimeline from "./components/timeline/InvestigationTimeline";
import ThreatAssessmentEngine from "./components/threat/ThreatAssessmentEngine";
import OsintFeedConfig from "./components/admin/OSINTFeedConfig";
import ExecutiveDashboard from "./features/wargame/ExecutiveDashboard"; // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
import { MilitaryTech } from "@mui/icons-material"; // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
import AccessIntelPage from "./features/rbac/AccessIntelPage.jsx";
import { Security } from "@mui/icons-material";
import DashboardDesigner from "./components/dashboard/DashboardDesigner.jsx";

// Navigation items
const navigationItems = [
  { path: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { path: "/investigations", label: "Timeline", icon: <Search /> },
  { path: "/graph", label: "Graph Explorer", icon: <Timeline /> },
  { path: "/copilot", label: "AI Copilot", icon: <Psychology /> },
  { path: "/threats", label: "Threat Assessment", icon: <Assessment /> },
  { path: "/access-intel", label: "Access Intel", icon: <Security /> },
  { path: "/geoint", label: "GeoInt Map", icon: <Map /> },
  { path: "/reports", label: "Reports", icon: <Assessment /> },
  { path: "/system", label: "System", icon: <Settings />, roles: [ADMIN] },
  {
    path: "/admin/osint-feeds",
    label: "OSINT Feeds",
    icon: <Settings />,
    roles: [ADMIN],
  },
  // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
  // Ethics Compliance: This dashboard is for hypothetical scenario simulation only.
  {
    path: "/wargame-dashboard",
    label: "WarGame Dashboard",
    icon: <MilitaryTech />,
    roles: [ADMIN],
  },
];

// Connection Status Component
function ConnectionStatus() {
  const [backendStatus, setBackendStatus] = React.useState("checking");

  React.useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch("http://localhost:4000/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "{ __typename }" }),
        });
        setBackendStatus(response.ok ? "connected" : "error");
      } catch (error) {
        setBackendStatus("error");
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    checking: { color: "info", message: "🔄 Checking backend connection..." },
    connected: {
      color: "success",
      message: "✅ Backend connected successfully!",
    },
    error: {
      color: "error",
      message: "❌ Backend connection failed. Check if server is running.",
    },
  };

  const { color, message } = statusConfig[backendStatus];
  return (
    <Alert severity={color} sx={{ mb: 2 }}>
      {message}
    </Alert>
  );
}

// Navigation Drawer
function NavigationDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasRole, hasPermission } = useAuth();

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  const items = navigationItems.filter((item) => {
    if (item.roles && !item.roles.some((r) => hasRole(r))) return false;
    if (item.permissions && !item.permissions.some((p) => hasPermission(p)))
      return false;
    return true;
  });

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: 250, mt: 8 }}>
        <List>
          {items.map((item) => (
            <ListItem
              key={item.path}
              button
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}

// App Bar
function AppHeader({ onMenuClick }) {
  const location = useLocation();
  const currentPage = navigationItems.find(
    (item) => item.path === location.pathname,
  );

  return (
    <AppBar position="fixed">
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          IntelGraph Platform - {currentPage?.label || "Unknown"}
        </Typography>
      </Toolbar>
    </AppBar>
  );
}

// Enhanced Dashboard with Live Metrics
function DashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = React.useState({
    investigations: 3,
    graphNodes: 247,
    reportsGenerated: 12,
    systemLoad: 67,
    activeUsers: 8,
    alertsCount: 2,
  });

  // Simulate real-time updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        systemLoad: Math.max(
          20,
          Math.min(95, prev.systemLoad + (Math.random() - 0.5) * 10),
        ),
        activeUsers: Math.max(
          1,
          Math.min(
            20,
            prev.activeUsers + Math.floor((Math.random() - 0.5) * 3),
          ),
        ),
        graphNodes: prev.graphNodes + Math.floor(Math.random() * 3),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Container maxWidth="lg">
      <ConnectionStatus />

      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
              color: "white",
            }}
          >
            <CardContent>
              <Typography variant="h3" gutterBottom>
                📊 Intelligence Command Center
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Real-time intelligence analysis and monitoring dashboard
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Key Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: "100%",
              background: "linear-gradient(135deg, #4caf50 0%, #81c784 100%)",
              color: "white",
            }}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h3" sx={{ fontWeight: "bold" }}>
                {metrics.investigations}
              </Typography>
              <Typography variant="h6">Active Investigations</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                🔍 +2 this week
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: "100%",
              background: "linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)",
              color: "white",
            }}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h3" sx={{ fontWeight: "bold" }}>
                {metrics.graphNodes.toLocaleString()}
              </Typography>
              <Typography variant="h6">Graph Entities</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                🕸️ Live updating
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: "100%",
              background: "linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)",
              color: "white",
            }}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h3" sx={{ fontWeight: "bold" }}>
                {metrics.reportsGenerated}
              </Typography>
              <Typography variant="h6">Reports Generated</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                📊 Last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: "100%",
              background: "linear-gradient(135deg, #f44336 0%, #ef5350 100%)",
              color: "white",
            }}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h3" sx={{ fontWeight: "bold" }}>
                {metrics.alertsCount}
              </Typography>
              <Typography variant="h6">Active Alerts</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                ⚠️ Requires attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🖥️ System Performance
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2">System Load</Typography>
                  <Typography variant="body2">{metrics.systemLoad}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={metrics.systemLoad}
                  color={
                    metrics.systemLoad > 80
                      ? "error"
                      : metrics.systemLoad > 60
                        ? "warning"
                        : "success"
                  }
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Active Users
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {metrics.activeUsers}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Response Time
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    125ms
                  </Typography>
                </Box>
              </Box>

              <Alert severity="success" sx={{ mt: 2 }}>
                ✅ All systems operational
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚀 Quick Actions
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Search />}
                    onClick={() => navigate("/investigations")}
                    sx={{ mb: 1 }}
                  >
                    New Investigation
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Timeline />}
                    onClick={() => navigate("/graph")}
                    sx={{ mb: 1 }}
                  >
                    Graph Explorer
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Psychology />}
                    onClick={() => navigate("/copilot")}
                    sx={{ mb: 1 }}
                  >
                    AI Analysis
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Assessment />}
                    onClick={() => navigate("/threats")}
                    sx={{ mb: 1 }}
                  >
                    Threat Assessment
                  </Button>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Recent Activity
              </Typography>
              <Box sx={{ fontSize: "0.85rem" }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  🔍 Investigation "Project Alpha" updated 2 min ago
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  🤖 AI detected new pattern in Case #47
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  📊 Weekly intelligence report generated
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Live Collaboration Panel */}
        <Grid item xs={12} md={4}>
          <LiveCollaborationPanel />
        </Grid>

        {/* Platform Status */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🛠️ Platform Components
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4} md={2}>
                  <Box sx={{ textAlign: "center", p: 1 }}>
                    <Typography variant="h4">✅</Typography>
                    <Typography variant="body2">React Router</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Box sx={{ textAlign: "center", p: 1 }}>
                    <Typography variant="h4">✅</Typography>
                    <Typography variant="body2">Material-UI</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Box sx={{ textAlign: "center", p: 1 }}>
                    <Typography variant="h4">✅</Typography>
                    <Typography variant="body2">Apollo GraphQL</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Box sx={{ textAlign: "center", p: 1 }}>
                    <Typography variant="h4">✅</Typography>
                    <Typography variant="body2">Redux Store</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Box sx={{ textAlign: "center", p: 1 }}>
                    <Typography variant="h4">✅</Typography>
                    <Typography variant="body2">Graph Engine</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Box sx={{ textAlign: "center", p: 1 }}>
                    <Typography variant="h4">✅</Typography>
                    <Typography variant="body2">AI Copilot</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Alert severity="success" sx={{ mt: 2 }}>
                🌐 <strong>Real-time collaboration active!</strong> Team members
                can see live updates, AI insights, and coordinate investigations
                in real-time.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

function InvestigationsPage() {
  return (
    <Container maxWidth="xl" sx={{ height: "100vh", py: 2 }}>
      <InvestigationTimeline />
    </Container>
  );
}

function GraphExplorerPage() {
  return (
    <Container maxWidth="xl" sx={{ height: "100vh", py: 2 }}>
      <InteractiveGraphExplorer />
    </Container>
  );
}

function CopilotPage() {
  return (
    <Container maxWidth="xl" sx={{ height: "100vh", py: 2 }}>
      <IntelligentCopilot />
    </Container>
  );
}

function ThreatsPage() {
  return (
    <Container maxWidth="xl" sx={{ height: "100vh", py: 2 }}>
      <ThreatAssessmentEngine />
    </Container>
  );
}

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ textAlign: "center", mt: 8 }}>
      <Card>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            404 - Page Not Found
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            The page you're looking for doesn't exist.
          </Typography>
          <Button variant="contained" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}

// Main Layout Component
function MainLayout() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppHeader onMenuClick={() => setDrawerOpen(true)} />
      <NavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/designer" element={<DashboardDesigner />} />
            <Route path="/investigations" element={<InvestigationsPage />} />
            <Route path="/graph" element={<GraphExplorerPage />} />
            <Route path="/copilot" element={<CopilotPage />} />
            <Route path="/threats" element={<ThreatsPage />} />
            <Route path="/access-intel" element={<AccessIntelPage />} />
            <Route path="/geoint" element={<InvestigationsPage />} />
            <Route path="/reports" element={<InvestigationsPage />} />
            <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
              <Route path="/system" element={<InvestigationsPage />} />
              <Route path="/admin/osint-feeds" element={<OsintFeedConfig />} />
              <Route
                path="/wargame-dashboard"
                element={<ExecutiveDashboard />}
              />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Box>
    </Box>
  );
}

// Themed App Shell with Beautiful Background

function ThemedAppShell({ children }) {
  const mode = useSelector((state) => state.ui?.theme || "light");
  const theme = useMemo(() => getIntelGraphTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          background:
            "linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 25%, #eceff1 50%, #e8eaf6 75%, #e1f5fe 100%)",
          minHeight: "100vh",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 20% 50%, rgba(33, 150, 243, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(63, 81, 181, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(3, 169, 244, 0.1) 0%, transparent 50%)",
            pointerEvents: "none",
          },
        }}
      >
        <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>
      </Box>
    </ThemeProvider>
  );
}

function App() {
  useEffect(() => {
    console.log("🚀 Router IntelGraph App mounting...");
    console.log("✅ Redux store connected");
    console.log("✅ Material-UI theme loaded");
    console.log("✅ Apollo GraphQL client initialized");
    console.log("✅ React Router navigation enabled");
  }, []);

  return (
    <Provider store={store}>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <ThemedAppShell>
            <Router>
              <MainLayout />
            </Router>
          </ThemedAppShell>
        </AuthProvider>
      </ApolloProvider>
    </Provider>
  );
}

export default App;
