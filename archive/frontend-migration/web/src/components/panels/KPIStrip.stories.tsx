import type { Meta, StoryObj } from '@storybook/react'
import { KPIStrip } from './KPIStrip'
import mockData from '@/mock/data.json'

const meta: Meta<typeof KPIStrip> = {
  title: 'Panels/KPIStrip',
  component: KPIStrip,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof KPIStrip>

export const Default: Story = {
  args: {
    data: mockData.kpiMetrics,
    onSelect: (metric) => console.log('Selected metric:', metric),
  },
}

export const Loading: Story = {
  args: {
    data: [],
    loading: true,
    columns: 4,
  },
}

export const Error: Story = {
  args: {
    data: [],
    error: new Error('Failed to load KPI metrics'),
    columns: 4,
  },
}

export const TwoColumns: Story = {
  args: {
    data: mockData.kpiMetrics.slice(0, 2),
    columns: 2,
    onSelect: (metric) => console.log('Selected metric:', metric),
  },
}

export const SixColumns: Story = {
  args: {
    data: [
      ...mockData.kpiMetrics,
      {
        id: 'users',
        title: 'Active Users',
        value: 156,
        format: 'number' as const,
        status: 'success' as const,
        change: {
          value: 8,
          direction: 'up' as const,
          period: 'last week',
        },
      },
      {
        id: 'uptime',
        title: 'System Uptime',
        value: 99.8,
        format: 'percentage' as const,
        status: 'success' as const,
      },
    ],
    columns: 6,
    onSelect: (metric) => console.log('Selected metric:', metric),
  },
}

export const CommandCenterStyle: Story = {
  args: {
    data: [
      {
        id: 'critical_alerts',
        title: 'Critical Alerts',
        value: 2,
        format: 'number' as const,
        status: 'error' as const,
        change: {
          value: 100,
          direction: 'up' as const,
          period: 'last hour',
        },
      },
      {
        id: 'threat_score',
        title: 'Threat Score',
        value: 73,
        format: 'percentage' as const,
        status: 'warning' as const,
        change: {
          value: 12,
          direction: 'up' as const,
          period: 'last 24h',
        },
      },
      {
        id: 'investigations',
        title: 'Active Investigations',
        value: 8,
        format: 'number' as const,
        status: 'neutral' as const,
      },
      {
        id: 'response_time',
        title: 'Avg Response',
        value: 1847,
        format: 'duration' as const,
        status: 'success' as const,
        change: {
          value: 15,
          direction: 'down' as const,
          period: 'this month',
        },
      },
    ],
    columns: 4,
    className: 'bg-slate-900 p-6 rounded-lg',
    onSelect: (metric) => console.log('Selected metric:', metric),
  },
}