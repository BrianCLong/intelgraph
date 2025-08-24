import type { Meta, StoryObj } from '@storybook/react';
import { LinkAnalysisCanvas } from './LinkAnalysisCanvas';

const meta: Meta<typeof LinkAnalysisCanvas> = {
  title: 'Features/LinkAnalysisCanvas',
  component: LinkAnalysisCanvas,
};

export default meta;
export const Default: StoryObj<typeof LinkAnalysisCanvas> = {};
