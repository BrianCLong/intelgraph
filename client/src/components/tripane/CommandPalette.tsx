import { useEffect } from 'react';
import { Command } from 'cmdk';
import { useAppStore } from './store';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const CommandPalette = ({ open, onOpenChange }: Props) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const toggleTheme = useAppStore((s) => s.toggleTheme);

  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange} label="Command Palette">
      <Command.Input autoFocus placeholder="Type a command" />
      <Command.List>
        <Command.Item onSelect={toggleTheme}>Toggle Theme</Command.Item>
      </Command.List>
    </Command.Dialog>
  );
};
