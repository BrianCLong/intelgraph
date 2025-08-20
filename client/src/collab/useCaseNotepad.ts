import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Lazy loaded Yjs
let Y: any;

export function useCaseNotepad(caseId: string) {
  const docRef = useRef<any>();

  useEffect(() => {
    let socket: any;
    (async () => {
      try {
        if (!Y) {
          Y = await import('yjs');
        }
        const ydoc = new Y.Doc();
        docRef.current = ydoc;
        socket = io(`/realtime/case/${caseId}`);
        socket.on('note', (update: Uint8Array) => {
          Y.applyUpdate(ydoc, update);
        });
        ydoc.on('update', (update: Uint8Array) => {
          socket.emit('note', update);
        });
      } catch (err) {
        console.error('notepad init failed', err);
      }
    })();
    return () => {
      socket?.close();
      docRef.current?.destroy();
    };
  }, [caseId]);

  return docRef.current;
}
