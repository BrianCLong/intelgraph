import React, { useEffect, useRef, useState } from 'react';
import { Box, List, ListItem, TextField, Button, Typography } from '@mui/material';
import DOMPurify from 'dompurify';
import $ from 'jquery';
import { CollabClient } from '../../../../packages/sdk/collab-js/src/collabClient';

interface Comment {
  commentId: string;
  text: string;
  userId: string;
}

interface Props {
  entityId: string;
  client: CollabClient;
}

export const CollabWidget: React.FC<Props> = ({ entityId, client }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const cy = (window as { cy?: unknown }).cy;
    if (cy) {
      (
        $ as unknown as (el: unknown) => {
          on: (
            event: string,
            selector: string,
            cb: (e: { target: { id: () => string } }) => void,
          ) => void;
        }
      )(cy).on('select', 'node', (e: { target: { id: () => string } }) => {
        client.updateSelection(e.target.id(), true);
      });
    }
    const handleAdd = (msg: { commentId: string; text: string; userId: string }) => {
      setComments((prev) => [
        ...prev,
        { commentId: msg.commentId, text: msg.text, userId: msg.userId },
      ]);
    };
    client.on('comment.add', handleAdd);
    return () => {
      client.off('comment.add', handleAdd);
    };
  }, [client]);

  const add = () => {
    if (text.trim()) {
      client.addComment(entityId, text);
      setText('');
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLLIElement>) => {
    if (e.key === 'ArrowDown') (e.currentTarget.nextElementSibling as HTMLElement)?.focus();
    if (e.key === 'ArrowUp') (e.currentTarget.previousElementSibling as HTMLElement)?.focus();
  };

  return (
    <Box sx={{ width: 300 }}>
      <Typography variant="h6">Comments</Typography>
      <List ref={listRef}>
        {comments.map((c) => (
          <ListItem key={c.commentId} tabIndex={0} onKeyDown={onKey}>
            <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.text) }} />
          </ListItem>
        ))}
      </List>
      <TextField
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={() => client.typing(entityId)}
      />
      <Button onClick={add}>Add</Button>
    </Box>
  );
};

export default CollabWidget;
