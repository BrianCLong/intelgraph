import type { Meta, StoryObj } from '@storybook/react'
import { EntityDrawer } from './EntityDrawer'
import { TooltipProvider } from '@/components/ui/Tooltip'
import mockData from '@/mock/data.json'

const meta: Meta<typeof EntityDrawer> = {
  title: 'Panels/EntityDrawer',
  component: EntityDrawer,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="h-screen">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof EntityDrawer>

export const Default: Story = {
  args: {
    data: mockData.entities,
    relationships: mockData.relationships,
    open: true,
    onOpenChange: () => {},
    selectedEntityId: 'ent-001',
    onSelect: (entity) => console.log('Selected entity:', entity),
    onAction: (action, payload) => console.log('Action:', action, payload),
  },
}

export const PersonEntity: Story = {
  args: {
    data: mockData.entities,
    relationships: mockData.relationships,
    open: true,
    onOpenChange: () => {},
    selectedEntityId: 'ent-001', // John Anderson
    onSelect: (entity) => console.log('Selected entity:', entity),
    onAction: (action, payload) => console.log('Action:', action, payload),
  },
}

export const IPAddressEntity: Story = {
  args: {
    data: mockData.entities,
    relationships: mockData.relationships,
    open: true,
    onOpenChange: () => {},
    selectedEntityId: 'ent-002', // IP Address
    onSelect: (entity) => console.log('Selected entity:', entity),
    onAction: (action, payload) => console.log('Action:', action, payload),
  },
}

export const MalwareEntity: Story = {
  args: {
    data: mockData.entities,
    relationships: mockData.relationships,
    open: true,
    onOpenChange: () => {},
    selectedEntityId: 'ent-004', // Malware file
    onSelect: (entity) => console.log('Selected entity:', entity),
    onAction: (action, payload) => console.log('Action:', action, payload),
  },
}

export const NoSelection: Story = {
  args: {
    data: mockData.entities,
    relationships: mockData.relationships,
    open: true,
    onOpenChange: () => {},
    selectedEntityId: undefined,
    onSelect: (entity) => console.log('Selected entity:', entity),
    onAction: (action, payload) => console.log('Action:', action, payload),
  },
}

export const Loading: Story = {
  args: {
    data: [],
    relationships: [],
    loading: true,
    open: true,
    onOpenChange: () => {},
    selectedEntityId: undefined,
  },
}