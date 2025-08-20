import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Home,
  Upload,
  GitMerge,
  Share2,
  Search,
  FlaskConical,
  Bot,
  ShieldCheck,
  BookOpenCheck,
  Activity,
  FileText,
  Settings,
  Database,
  BellRing,
  Ban,
  Users,
  ChevronRight,
  Menu,
  PlayCircle,
  Eye,
  Sparkles,
  Download,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import { Progress } from '@/components/ui/Progress'
import { Separator } from '@/components/ui/Separator'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/Sheet'
import { TooltipProvider } from '@/components/ui/Tooltip'

/**
 * COUNCIL v1 — GA Core Wireframes
 * Single‑file React component with Tailwind + shadcn/ui.
 * All screens are low‑fi wireframes (grayscale blocks + labels) with real UI scaffolding.
 * Navigation at left, content on the right; a North‑Star wizard and Copilot drawer are available anywhere.
 */

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'intake', label: 'Intake', icon: Upload },
  { id: 'er', label: 'Entity Resolution', icon: GitMerge },
  { id: 'graph', label: 'Graph Explorer', icon: Share2 },
  { id: 'patterns', label: 'Pattern Queries', icon: Search },
  { id: 'hypothesis', label: 'Hypothesis', icon: FlaskConical },
  { id: 'explain', label: 'Explainability', icon: Eye },
  { id: 'copilot', label: 'Copilot Log', icon: Bot },
  { id: 'policy', label: 'Policy & Access', icon: ShieldCheck },
  { id: 'audit', label: 'Audit Trail', icon: BookOpenCheck },
  { id: 'observability', label: 'Observability', icon: Activity },
  { id: 'reporting', label: 'Reporting', icon: FileText },
  { id: 'datasets', label: 'Datasets & Provenance', icon: Database },
  { id: 'alerts', label: 'Alerts & Runbooks', icon: BellRing },
  { id: 'redlines', label: 'Red‑Lines', icon: Ban },
  { id: 'admin', label: 'Admin', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const ScreenShell: React.FC<{
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}> = ({ title, subtitle, actions, children }) => (
  <div className="space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
    {children}
  </div>
)

const Placeholder: React.FC<{ label: string; h?: string }> = ({
  label,
  h = 'h-32',
}) => (
  <div
    className={`w-full ${h} rounded-2xl border border-dashed bg-muted/40 grid place-items-center text-xs text-muted-foreground`}
  >
    {label}
  </div>
)

const Grid: React.FC<{ cols?: string; children: React.ReactNode }> = ({
  cols = 'grid-cols-3',
  children,
}) => <div className={`grid ${cols} gap-4`}>{children}</div>

// —— Individual Screens ————————————————————————————————————————————————

function Dashboard() {
  return (
    <ScreenShell
      title="Council — GA Core"
      subtitle="North‑Star: Intake → ER → Link Analysis → COA → Brief"
      actions={
        <>
          <Badge variant="secondary" className="rounded-2xl">
            GA Core
          </Badge>
          <WizardTrigger />
        </>
      }
    >
      <Grid cols="grid-cols-4">
        <Card className="col-span-4 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">North‑Star Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              'Intake',
              'Entity Resolution',
              'Link Analysis',
              'COA',
              'Brief',
            ].map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <Checkbox id={`ns-${i}`} />
                <Label htmlFor={`ns-${i}`} className="flex-1">
                  {i + 1}. {s}
                </Label>
                <Progress value={i * 20} className="w-32" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="Audit log feed (wireframe)" h="h-44" />
            <Button variant="outline" className="w-full">
              Open Audit Trail
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate">
                  Resolve suggested merge #{101 + i}
                </span>
                <Badge variant="outline">ER</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </Grid>
      <Grid cols="grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SLO Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="p95 read/write sparklines" />
            <div className="flex gap-3 text-xs">
              <Badge>p95 read ≤ 1500ms</Badge>
              <Badge variant="secondary">p95 write ≤ 2500ms</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Policy Denials (24h)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="bar chart wireframe" />
            <Button variant="outline" className="w-full">
              Open Policy Simulator
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provenance Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="donut wireframe" />
            <div className="text-xs text-muted-foreground">
              % nodes/edges with source manifests
            </div>
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function Intake() {
  return (
    <ScreenShell
      title="Intake"
      subtitle="Files, notes, and captures with provenance manifests"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-3">
        <Card className="col-span-3 md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Add Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Upload file</Label>
              <Input type="file" />
              <Button className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Capture note</Label>
              <Textarea placeholder="Paste or jot notes…" />
              <Button variant="outline" className="w-full">
                Save Note
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ingested Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search filenames, handlers…" />
            <Grid cols="grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">artifact_{i}.csv</span>
                    <Badge variant="outline">Signed</Badge>
                  </div>
                  <Placeholder label="Provenance manifest preview" h="h-24" />
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm">
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function ER() {
  return (
    <ScreenShell
      title="Entity Resolution"
      subtitle="Review suggested merges, metrics, and history"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-3">
        <Card className="col-span-3 md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Suggested Merges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Filter by name, score…" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-3 rounded-2xl border p-3"
              >
                <div className="col-span-5 space-y-2">
                  <Badge variant="secondary">A</Badge>
                  <Placeholder label="Record A details" h="h-20" />
                </div>
                <div className="col-span-2 grid place-items-center">
                  <GitMerge className="text-muted-foreground" />
                </div>
                <div className="col-span-5 space-y-2">
                  <Badge variant="secondary">B</Badge>
                  <Placeholder label="Record B details" h="h-20" />
                </div>
                <div className="col-span-12 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Score: {0.86 + i * 0.02} • Temporal overlap: partial
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Reject
                    </Button>
                    <Button size="sm">Merge</Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="ROC curve wireframe" h="h-28" />
            <div className="text-xs">AUC ≥ 0.90 target</div>
            <Separator />
            <Placeholder label="Precision@k bars" h="h-24" />
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function GraphExplorer() {
  return (
    <ScreenShell
      title="Graph Explorer"
      subtitle="Tri‑pane: inventory → canvas → details/provenance"
      actions={<CopilotOpen />}
    >
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Entities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Search entities…" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border p-2 text-sm"
              >
                <span className="truncate">Entity #{i + 1}</span>
                <Badge variant="outline">P{i}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Canvas</CardTitle>
          </CardHeader>
          <CardContent>
            <Placeholder label="Graph canvas wireframe (zoom/pan)" h="h-72" />
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm">
                2‑hop Ego
              </Button>
              <Button variant="outline" size="sm">
                Add Note
              </Button>
              <Button variant="outline" size="sm">
                Snapshot
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Details & Provenance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Tabs defaultValue="details">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="sources">Sources</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <Placeholder label="Attributes / timeline" h="h-40" />
              </TabsContent>
              <TabsContent value="sources">
                <Placeholder label="Cited sources list" h="h-40" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ScreenShell>
  )
}

function PatternQueries() {
  return (
    <ScreenShell
      title="Pattern Queries"
      subtitle="Templates and result sets"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              '2‑hop ego',
              'Suspicious triad',
              'Temporal co‑presence',
              'Shared identifiers',
            ].map(t => (
              <div
                key={t}
                className="rounded-xl border p-2 text-sm flex items-center justify-between"
              >
                <span>{t}</span>
                <Button size="sm" variant="ghost">
                  Run
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="Result table wireframe" h="h-48" />
            <Button variant="outline">Add to Hypothesis</Button>
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function Hypothesis() {
  return (
    <ScreenShell
      title="Hypothesis Workspace"
      subtitle="Assumptions, evidence, confidence"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hypotheses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm">
              <FlaskConical className="mr-2 h-4 w-4" />
              New
            </Button>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-2 text-sm">
                H{i + 1}: Short statement…
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Statement</Label>
            <Input placeholder="What do we believe?" />
            <Label>Evidence</Label>
            <Placeholder
              label="Evidence list (drag in from Results)"
              h="h-28"
            />
            <Label>Confidence</Label>
            <div className="flex items-center gap-3">
              <Progress value={60} className="w-56" />
              <span className="text-xs">60%</span>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function Explainability() {
  return (
    <ScreenShell
      title="Explainability Console"
      subtitle="Why am I seeing this? Show entities, edges, and sources"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-3">
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Explanation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="Ranked contributors list" h="h-52" />
            <div className="text-xs text-muted-foreground">
              Target: return within 2s (p95)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Citations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="Source cards (IDs, types)" h="h-52" />
            <Button variant="outline" className="w-full">
              Open Source
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function CopilotLog() {
  return (
    <ScreenShell
      title="Copilot Log"
      subtitle="Auditable AI: prompts, responses, citations, refusals"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-2 text-sm">
                Session #{i + 1} • 14:2{i}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transcript</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Placeholder
              label="Turns with citations & policy checks"
              h="h-64"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline">Export</Button>
              <Button>Re‑run</Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function Policy() {
  return (
    <ScreenShell
      title="Policy & Access"
      subtitle="ABAC/RBAC, OPA rules, simulator"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Roles & Attributes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Placeholder label="Role matrix wireframe" h="h-48" />
            <Button variant="outline" className="w-full">
              Edit Roles
            </Button>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Policy Simulator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Grid cols="grid-cols-3">
              <div className="space-y-2">
                <Label>User</Label>
                <Input placeholder="user@org" />
              </div>
              <div className="space-y-2">
                <Label>Resource</Label>
                <Input placeholder="graph/node/123" />
              </div>
              <div className="space-y-2">
                <Label>Action</Label>
                <Input placeholder="read|write" />
              </div>
            </Grid>
            <Button className="w-fit">Simulate</Button>
            <Placeholder label="Decision + rationale" h="h-24" />
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function Audit() {
  return (
    <ScreenShell
      title="Audit Trail"
      subtitle="Every privileged action with actor, object, policy, reason"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-1">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Filter by actor, policy, resource…" />
            <Placeholder label="Chronological log list" h="h-72" />
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function Observability() {
  return (
    <ScreenShell
      title="Observability"
      subtitle="SLOs, slow‑query killer, alerts"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">SLOs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="Latency charts wireframe" h="h-40" />
            <div className="text-xs text-muted-foreground">
              Targets: read ≤ 1500ms • write ≤ 2500ms
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Slow‑Query Killer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="Threshold & incidents table" h="h-40" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline">Trip Test</Button>
              <Button>Abort Query</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="Alerts wireframe" h="h-40" />
            <Button variant="outline" className="w-full">
              Configure Alerts
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function Reporting() {
  return (
    <ScreenShell
      title="Reporting"
      subtitle="One‑click brief with figures and citations"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-3">
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Brief Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="Brief pages wireframe" h="h-72" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" className="w-full">
              Export HTML
            </Button>
            <Separator />
            <Label>Include</Label>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Checkbox id="fig" />
                <Label htmlFor="fig">Figures</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="cit" defaultChecked />
                <Label htmlFor="cit">Citations</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="app" />
                <Label htmlFor="app">Appendix</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function Datasets() {
  return (
    <ScreenShell
      title="Datasets & Provenance"
      subtitle="Artifacts, lineage, handlers"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Datasets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border p-2 text-sm flex items-center justify-between"
              >
                <span>Dataset_{i + 1}</span>
                <Button size="sm" variant="ghost">
                  Open
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lineage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="Lineage DAG wireframe" h="h-64" />
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function AlertsRunbooks() {
  return (
    <ScreenShell
      title="Alerts & Runbooks"
      subtitle="Triggers, playbooks, drills"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border p-2 text-sm flex items-center justify-between"
              >
                <span>Policy‑denial spike</span>
                <Badge variant="outline">On</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Runbooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder
              label="Step lists: Denial Surge / Slow‑Query Killer / Audit Integrity"
              h="h-64"
            />
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function Redlines() {
  return (
    <ScreenShell
      title="Red‑Lines & Won’t‑Build"
      subtitle="Defensive posture, prohibited capabilities"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Prohibited List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              'Offensive tooling',
              'Predictive targeting',
              'Mass scraping',
              'Auto‑actioning',
            ].map(t => (
              <div key={t} className="rounded-xl border p-2 text-sm">
                {t}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attestation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Placeholder label="Quarterly review log wireframe" h="h-64" />
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function Admin() {
  return (
    <ScreenShell
      title="Admin"
      subtitle="Users, groups, workspaces"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Search users…" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border p-2 text-sm flex items-center justify-between"
              >
                <span>user{i}@org</span>
                <Button size="sm" variant="ghost">
                  Manage
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Groups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Placeholder label="Group list wireframe" h="h-56" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Workspaces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Placeholder label="Workspace tiles wireframe" h="h-56" />
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

function SettingsScreen() {
  return (
    <ScreenShell
      title="Settings"
      subtitle="Profile, org, authentication"
      actions={<CopilotOpen />}
    >
      <Grid cols="grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Full name" />
            <Input placeholder="Email" />
            <Button className="w-fit">Save</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Placeholder label="FIDO2/WebAuthn devices" h="h-40" />
            <Button variant="outline" className="w-fit">
              Add Security Key
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Placeholder label="Branding, retention, minimization" h="h-40" />
          </CardContent>
        </Card>
      </Grid>
    </ScreenShell>
  )
}

// —— Shared Controls: Wizard & Copilot ————————————————————————————————

function WizardTrigger() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm">
          <PlayCircle className="mr-2 h-4 w-4" />
          Start North‑Star
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[520px] sm:w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>North‑Star Flow</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {[
            { t: 'Intake', d: 'Add files/notes with provenance' },
            { t: 'Entity Resolution', d: 'Merge duplicates, respect time' },
            { t: 'Link Analysis', d: 'Explore patterns and neighborhoods' },
            { t: 'Courses of Action', d: 'Draft options, note tradeoffs' },
            { t: 'Brief', d: 'Export with figures & citations' },
          ].map((s, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {i + 1}. {s.t}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">{s.d}</div>
                <Placeholder label="Step UI wireframe" h="h-24" />
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm">
                    Open Screen
                  </Button>
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles className="h-4 w-4" /> Acceptance: pass
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function CopilotOpen() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Bot className="mr-2 h-4 w-4" />
          Open Copilot
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[520px] sm:w-[560px] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Copilot (Auditable)</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <Textarea placeholder="Ask a question…" />
          <div className="text-xs text-muted-foreground">
            Copilot will cite sources and respect policy‑by‑default.
          </div>
          <Separator />
          <Placeholder label="Turns with citations & policy checks" h="h-72" />
        </div>
      </SheetContent>
    </Sheet>
  )
}

// —— App Shell ——————————————————————————————————————————————————

const ScreenMap: Record<string, React.FC> = {
  dashboard: Dashboard,
  intake: Intake,
  er: ER,
  graph: GraphExplorer,
  patterns: PatternQueries,
  hypothesis: Hypothesis,
  explain: Explainability,
  copilot: CopilotLog,
  policy: Policy,
  audit: Audit,
  observability: Observability,
  reporting: Reporting,
  datasets: Datasets,
  alerts: AlertsRunbooks,
  redlines: Redlines,
  admin: Admin,
  settings: SettingsScreen,
}

export default function CouncilWireframes() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<string>('dashboard')
  const Screen = useMemo(() => ScreenMap[view] ?? Dashboard, [view])

  return (
    <TooltipProvider>
      <div className="h-full w-full bg-background text-foreground">
        <div className="flex h-full">
          {/* Sidebar */}
          <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r p-3 gap-3">
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-2xl bg-primary/10 grid place-items-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Council</div>
                  <div className="text-xs text-muted-foreground">
                    GA Core Wireframes
                  </div>
                </div>
              </div>
            </div>
            <Separator />
            <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
              {nav.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition border ${
                    view === id
                      ? 'bg-muted/70'
                      : 'bg-transparent hover:bg-muted/40'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{label}</span>
                  <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
                </button>
              ))}
            </nav>
            <div className="text-[10px] text-muted-foreground px-2">
              © 2025 Council — Wireframes only
            </div>
          </aside>

          {/* Mobile Topbar */}
          <div className="md:hidden fixed top-0 inset-x-0 z-10 border-b bg-background">
            <div className="flex items-center gap-2 px-3 py-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(v => !v)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div className="text-sm font-semibold">Council</div>
              <div className="ml-auto">
                <WizardTrigger />
              </div>
            </div>
            {open && (
              <div className="grid grid-cols-2 gap-2 p-2">
                {nav.map(({ id, label }) => (
                  <Button
                    key={id}
                    variant={view === id ? 'default' : 'outline'}
                    onClick={() => {
                      setView(id)
                      setOpen(false)
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Main content */}
          <main className="flex-1 p-4 md:p-6 overflow-y-auto md:ml-0 mt-10 md:mt-0">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Screen />
            </motion.div>
            <div className="mt-8 text-[11px] text-muted-foreground">
              These are low‑fidelity wireframes meant to communicate structure,
              information hierarchy, and key controls — not visual design or
              final copy.
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
