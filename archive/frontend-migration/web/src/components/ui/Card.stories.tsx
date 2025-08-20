import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './Card'
import { Button } from './Button'
import { Badge } from './Badge'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>
          Card description. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
}

export const WithBadge: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Investigation #001</CardTitle>
          <Badge variant="success">Active</Badge>
        </div>
        <CardDescription>
          Network security analysis and threat detection investigation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Entities:</span>
            <span>12</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Relationships:</span>
            <span>8</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Priority:</span>
            <Badge variant="warning" className="text-xs">High</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
}

export const IntelGraphStyled: Story = {
  render: () => (
    <Card className="w-[350px] intel-gradient text-white border-intel-600">
      <CardHeader>
        <CardTitle className="text-white">🔍 Active Investigation</CardTitle>
        <CardDescription className="text-intel-100">
          Real-time intelligence analysis in progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="cyber-glow p-3 rounded-lg bg-white/10 backdrop-blur-sm">
            <div className="text-sm font-medium">Threat Level</div>
            <div className="text-2xl font-bold text-yellow-300">MEDIUM</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/10 p-2 rounded">
              <div className="text-intel-200">Entities</div>
              <div className="font-bold">24</div>
            </div>
            <div className="bg-white/10 p-2 rounded">
              <div className="text-intel-200">Alerts</div>
              <div className="font-bold">3</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
}