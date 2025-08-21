import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  TextField,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import $ from 'jquery';

interface CopilotAnswer {
  preview: string;
  cypher?: string | null;
  citations: { nodeId: string; source: string; confidence: number }[];
  redactions: string[];
  policy: { allowed: boolean; reason: string; deniedRules: string[] };
  metrics: Record<string, any>;
}

const CopilotDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<CopilotAnswer | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    $('#copilot-open-btn').on('click', () => setOpen(true));
    return () => {
      $('#copilot-open-btn').off('click');
    };
  }, []);

  const ask = async (preview = true) => {
    setError('');
    try {
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:
            'query($q:String!,$case:ID!,$p:Boolean!){copilotQuery(question:$q,caseId:$case,preview:$p){preview cypher citations{nodeId source confidence} redactions policy{allowed reason deniedRules} metrics}}',
          variables: { q: question, case: 'case1', p: preview },
        }),
      });
      const json = await res.json();
      if (json.errors) {
        throw new Error(json.errors[0].message);
      }
      setAnswer(json.data.copilotQuery);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <>
      <IconButton
        id="copilot-open-btn"
        aria-label="open copilot"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <ChatIcon />
      </IconButton>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 360, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Copilot
          </Typography>
          <TextField
            fullWidth
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question"
            size="small"
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button variant="contained" onClick={() => ask(true)}>
              Preview
            </Button>
            <Button
              variant="outlined"
              onClick={() => ask(false)}
              disabled={!answer?.policy.allowed}
            >
              Run with guardrails
            </Button>
          </Box>
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
          {answer && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Cypher:</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {answer.cypher || answer.preview}
              </Typography>
              <Chip
                label={answer.policy.allowed ? 'Allowed' : 'Denied'}
                color={answer.policy.allowed ? 'success' : 'error'}
                size="small"
                sx={{ mt: 1 }}
              />
              {answer.citations.length > 0 && (
                <List dense>
                  {answer.citations.map((c) => (
                    <ListItem key={c.nodeId}>
                      <ListItemText primary={c.source} secondary={`confidence: ${c.confidence}`} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default CopilotDrawer;
