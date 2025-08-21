import { Dialog } from '@mui/material';
import { useEffect, useState } from 'react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <div style={{ padding: 20 }}>Command palette</div>
    </Dialog>
  );
}
