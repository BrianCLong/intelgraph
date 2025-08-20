import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { Layout } from '@/components/Layout'

// Apollo Client and Socket Context
import { apolloClient } from '@/lib/apollo'
import { SocketProvider } from '@/contexts/SocketContext'

// Pages
import HomePage from '@/pages/HomePage'
import ExplorePage from '@/pages/ExplorePage'
import AlertsPage from '@/pages/AlertsPage'
import AlertDetailPage from '@/pages/AlertDetailPage'
import CasesPage from '@/pages/CasesPage'
import CaseDetailPage from '@/pages/CaseDetailPage'
import CommandCenterDashboard from '@/pages/dashboards/CommandCenterDashboard'
import SupplyChainDashboard from '@/pages/dashboards/SupplyChainDashboard'
import DataSourcesPage from '@/pages/DataSourcesPage'
import ModelsPage from '@/pages/ModelsPage'
import ReportsPage from '@/pages/ReportsPage'
import AdminPage from '@/pages/AdminPage'
import HelpPage from '@/pages/HelpPage'
import ChangelogPage from '@/pages/ChangelogPage'
import SignInPage from '@/pages/SignInPage'
import AccessDeniedPage from '@/pages/AccessDeniedPage'

// Global search context
import { SearchProvider } from '@/contexts/SearchContext'
import { AuthProvider } from '@/contexts/AuthContext'

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <SocketProvider>
        <TooltipProvider>
          <AuthProvider>
            <SearchProvider>
              <Router>
                <Routes>
                  {/* Auth routes */}
                  <Route path="/signin" element={<SignInPage />} />
                  <Route path="/access-denied" element={<AccessDeniedPage />} />
                  
                  {/* Protected routes with layout */}
                  <Route path="/" element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="explore" element={<ExplorePage />} />
                    
                    {/* Alerts */}
                    <Route path="alerts" element={<AlertsPage />} />
                    <Route path="alerts/:id" element={<AlertDetailPage />} />
                    
                    {/* Cases */}
                    <Route path="cases" element={<CasesPage />} />
                    <Route path="cases/:id" element={<CaseDetailPage />} />
                    
                    {/* Dashboards */}
                    <Route path="dashboards/command-center" element={<CommandCenterDashboard />} />
                    <Route path="dashboards/supply-chain" element={<SupplyChainDashboard />} />
                    
                    {/* Data & Models */}
                    <Route path="data/sources" element={<DataSourcesPage />} />
                    <Route path="models" element={<ModelsPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    
                    {/* Admin */}
                    <Route path="admin/*" element={<AdminPage />} />
                    
                    {/* Support */}
                    <Route path="help" element={<HelpPage />} />
                    <Route path="changelog" element={<ChangelogPage />} />
                    
                    {/* Catch all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </Router>
            </SearchProvider>
          </AuthProvider>
        </TooltipProvider>
      </SocketProvider>
    </ApolloProvider>
  )
}

export default App