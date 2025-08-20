/* eslint-disable indent */
import React, { useState } from 'react';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { useLazyQuery } from '@apollo/client';
import { COPILOT_QUERY } from '../lib/graphql';

const CopilotDrawer: React.FC<{ caseId?: string }> = ({ caseId = 'demo' }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [runQuery, { data, loading, error }] = useLazyQuery(COPILOT_QUERY);

  const send = async (preview = true) => {
    if (!input.trim()) return;
    try {
      await runQuery({ variables: { question: input, caseId, preview } });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  const answer = data?.copilotQuery;

  return (
    <>
      <IconButton
        aria-label="open copilot"
        onClick={() => setOpen(true)}
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <ChatIcon />
      </IconButton>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 360, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Copilot
          </Typography>
          <Box sx={{ mb: 2 }}>
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              fullWidth
              size="small"
              placeholder="Ask a question"
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
            />
          </Box>
          {loading && <Typography>Loading...</Typography>}
          {error && <Typography color="error">{error.message}</Typography>}
          {answer && (
            <Box>
              <Typography variant="subtitle2">Preview</Typography>
              <pre>{answer.preview}</pre>
              <Typography variant="caption">
                Policy: {answer.policy.allowed ? 'allowed' : `denied: ${answer.policy.reason}`}
              </Typography>
              {answer.citations.length > 0 && (
                <List>
                  {answer.citations.map((c: any, i: number) => (
                    <ListItem key={i}>
                      <ListItemText
                        primary={c.source}
                        secondary={`node ${c.nodeId} (${c.confidence.toFixed(2)})`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              {!answer.cypher && answer.policy.allowed && (
                <Button sx={{ mt: 1 }} onClick={() => send(false)}>
                  Run with guardrails
                </Button>
              )}
              {answer.cypher && <Typography sx={{ mt: 1 }}>Executed query.</Typography>}
            </Box>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default CopilotDrawer;
