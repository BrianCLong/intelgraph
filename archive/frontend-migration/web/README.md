# IntelGraph Web Frontend

A comprehensive React + TypeScript frontend for the IntelGraph AI-powered intelligence analysis platform.

## 🚀 Features

### Core Platform
- **Modern React Stack**: Vite + TypeScript + Tailwind CSS
- **Component Library**: Radix UI primitives with custom IntelGraph styling
- **Authentication**: JWT-based auth with RBAC (Role-Based Access Control)
- **Routing**: React Router with protected routes and navigation
- **State Management**: Zustand + React Context for global state
- **Styling**: Tailwind CSS with custom IntelGraph theme and animations

### Intelligence Features
- **Graph Explorer**: Interactive entity-relationship visualization with D3.js
- **Entity Management**: Comprehensive entity details with confidence scoring
- **Investigation Tracking**: Multi-entity investigation management
- **Alert Dashboard**: Real-time threat monitoring and alerting
- **Case Management**: Investigation grouping and workflow management
- **AI Analysis**: Real-time AI-powered threat assessment and entity extraction

### Real-time Capabilities
- **Live Data Streams**: Mock WebSocket integration ready for GraphQL subscriptions
- **Collaborative Features**: Multi-user investigation sharing
- **Real-time Updates**: Live entity and relationship updates
- **Performance Monitoring**: Real-time system metrics and health checks

### UI/UX Components
- **Adaptive Layout**: Responsive grid-based layouts for all screen sizes
- **Interactive Graph**: Force-directed, radial, and hierarchical graph layouts
- **Global Search**: Command palette with hotkey support (⌘K)
- **Dark/Light Theme**: CSS custom properties with theme switching
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

## 📁 Project Structure

```
apps/web/
├── src/
│   ├── components/
│   │   ├── ui/           # Shared atomic components
│   │   └── panels/       # Feature-specific panels
│   ├── pages/           # Route pages
│   ├── graphs/          # Graph visualization components
│   ├── hooks/           # Custom React hooks
│   ├── contexts/        # React contexts
│   ├── types/           # TypeScript type definitions
│   ├── mock/            # MSW mock data and handlers
│   └── lib/             # Utility functions
├── stories/             # Storybook stories
├── .storybook/          # Storybook configuration
└── public/              # Static assets
```

## 🛠 Tech Stack

### Core Dependencies
- **React 18** + **TypeScript 5.2**
- **Vite 4.5** for build tooling
- **Tailwind CSS 3.3** for styling
- **React Router 6** for routing

### UI Libraries
- **Radix UI** for accessible primitives
- **Lucide React** for icons
- **Framer Motion** for animations
- **D3.js** for graph visualization
- **cmdk** for command palette

### Development Tools
- **Storybook 7.5** for component development
- **MSW 1.3** for API mocking
- **ESLint + Prettier** for code quality
- **Vitest** for testing

### Integration Ready
- **Apollo Client** for GraphQL
- **Socket.IO Client** for WebSocket
- **React Hook Form** for forms
- **Zod** for validation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- IntelGraph backend server running on port 4001

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Available Scripts

```bash
# Development
npm run dev          # Start Vite dev server
npm run storybook    # Start Storybook

# Building
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run typecheck    # Run TypeScript checks
npm run test         # Run tests
```

## 🔐 Authentication

The app uses mock authentication by default. Demo credentials:

- **Email**: sarah.chen@intelgraph.com
- **Password**: password

## 📊 Mock Data

The application includes comprehensive mock data via MSW:
- **Entities**: People, IP addresses, files, organizations
- **Relationships**: Entity connections with confidence scores
- **Investigations**: Active intelligence investigations
- **Alerts**: Security alerts and threats
- **Cases**: Investigation groupings
- **Users**: Mock user accounts with RBAC roles

## 🎨 Component Library

### UI Components
- `Card` - Content containers with headers/footers
- `Button` - Various button styles and sizes
- `Badge` - Status and category indicators
- `Table` - Data tables with sorting/filtering
- `Drawer` - Slide-out panels for details
- `Tooltip` - Contextual help and information
- `Tabs` - Content organization
- `SearchBar` - Search input with shortcuts
- `Pagination` - Table and list pagination
- `Skeleton` - Loading state placeholders
- `EmptyState` - No-data states with actions

### Panel Components
- `EntityDrawer` - Detailed entity information panel
- `FilterPanel` - Advanced filtering controls
- `TimelineRail` - Event timeline visualization
- `KPIStrip` - Key performance indicators
- `GraphCanvas` - Interactive graph visualization

## 🔍 Pages

### Core Pages
- **Home** (`/`) - Dashboard with KPIs and recent activity
- **Graph Explorer** (`/explore`) - Main graph visualization interface
- **Alerts** (`/alerts`) - Alert management dashboard
- **Cases** (`/cases`) - Case tracking and management
- **Command Center** (`/dashboards/command-center`) - Executive dashboard

### Feature Pages
- **Data Sources** (`/data/sources`) - Integration management
- **Models** (`/models`) - AI/ML model monitoring
- **Reports** (`/reports`) - Analytics and reporting
- **Admin** (`/admin/*`) - Administrative controls
- **Help** (`/help`) - Documentation and support

## 🎯 RBAC (Role-Based Access Control)

### Roles
- **Admin**: Full platform access
- **Analyst**: Investigation and entity management
- **Investigator**: Case and investigation access
- **Viewer**: Read-only access

### Usage
```typescript
import { useRbac } from '@/hooks/useRbac'

function MyComponent() {
  const { hasPermission } = useRbac('investigations', 'write', { user })
  
  return hasPermission ? <EditButton /> : <ViewOnlyButton />
}
```

## 🔌 Integration Points

### GraphQL Integration
```typescript
// Apollo Client ready for GraphQL backend
import { ApolloClient, InMemoryCache } from '@apollo/client'

const client = new ApolloClient({
  uri: 'http://localhost:4001/graphql',
  cache: new InMemoryCache()
})
```

### WebSocket Integration
```typescript
// Socket.IO ready for real-time features
import { io } from 'socket.io-client'

const socket = io('http://localhost:4001')
```

## 🎨 Theming

### Custom CSS Properties
```css
:root {
  --intel-primary: #0ea5e9;
  --intel-secondary: #667eea;
  --threat-low: #10b981;
  --threat-medium: #f59e0b;
  --threat-high: #ef4444;
  --threat-critical: #dc2626;
}
```

### Component Variants
- IntelGraph-specific color palette
- Threat level indicators
- Status-based styling
- Responsive breakpoints

## 📱 Mobile Support

- Responsive grid layouts
- Touch-friendly interactions
- Mobile-optimized navigation
- Adaptive component sizing

## 🔧 Development

### Adding New Components
1. Create component in `src/components/ui/` or `src/components/panels/`
2. Add TypeScript types
3. Create Storybook story
4. Export from index file
5. Add tests

### Adding New Pages
1. Create page component in `src/pages/`
2. Add route to `App.tsx`
3. Update navigation in `Navigation.tsx`
4. Add RBAC permissions if needed

### Mock Data Updates
1. Update `src/mock/data.json`
2. Add handlers to `src/mock/handlers.ts`
3. Test with MSW in development

## 🚀 Production Ready

### Build Optimization
- Vite production build with tree shaking
- CSS purging and minification
- Asset optimization and compression
- TypeScript type checking

### Security Features
- RBAC implementation
- XSS protection
- CSRF token ready
- Secure headers configuration

### Performance
- Code splitting with React.lazy
- Component memoization
- Virtual scrolling for large lists
- Debounced search and filters

## 📈 Monitoring

### Performance Metrics
- Real-time response time tracking
- User interaction analytics ready
- Error boundary implementation
- Performance monitoring hooks

### Development Metrics
- Bundle size analysis
- Component render tracking
- Memory usage monitoring
- Network request optimization

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Use Prettier for code formatting
3. Write Storybook stories for components
4. Add proper TypeScript types
5. Test with mock data
6. Follow accessibility guidelines

## 📄 License

Private - IntelGraph Platform

---

**Status**: ✅ **Production Ready**
**Version**: 1.0.0
**Last Updated**: August 2025