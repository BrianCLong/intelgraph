import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, List, ListItem, ListItemText } from '@mui/material';
import { gql, useApolloClient } from '@apollo/client';

const COPILOT_QUERY = gql`
  query CopilotPanel($q: String!, $preview: Boolean!) {
    copilotQuery(question: $q, caseId: "demo", preview: $preview) {
      preview
      citations { nodeId snippet }
      policy { allowed reason }
    }
  }
`;

function AISuggestionsPanel() {
  const client = useApolloClient();
  const [question, setQuestion] = useState('');
  const [preview, setPreview] = useState('');
  const [citations, setCitations] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const ask = async (execute = false) => {
    const { data } = await client.query({
      query: COPILOT_QUERY,
      variables: { q: question, preview: !execute },
      fetchPolicy: 'no-cache'
    });
    const ans = data.copilotQuery;
    setPreview(ans.preview);
    setPolicy(ans.policy);
    if (execute) {
      if (ans.policy.allowed) setCitations(ans.citations);
      setNeedsConfirm(false);
    } else {
      setNeedsConfirm(true);
      setCitations([]);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>AI Suggestions</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField label="Question" value={question} onChange={e => setQuestion(e.target.value)} fullWidth size="small" />
        <Button variant="contained" onClick={() => ask()}>Ask</Button>
      </Box>
      {preview && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Preview</Typography>
          <pre>{preview}</pre>
          {policy && !policy.allowed && (
            <Typography color="error">Denied: {policy.reason}</Typography>
          )}
          {needsConfirm && policy?.allowed && (
            <Button variant="outlined" onClick={() => ask(true)}>Execute</Button>
          )}
        </Box>
      )}
      {citations.length > 0 && (
        <List>
          {citations.map((c, i) => (
            <ListItem key={i}>
              <ListItemText primary={c.nodeId} secondary={c.snippet} />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}

export default AISuggestionsPanel;
