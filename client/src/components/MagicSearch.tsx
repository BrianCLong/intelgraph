import React, { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
} from '@mui/material';
import { COPILOT_QUERY } from '../lib/graphql';

const ENTITY_SUGGESTIONS = ['APT actor', 'campaign', 'target', 'malware'];
const RELATION_SUGGESTIONS = ['linked to', 'associated with', 'targets'];
const EXAMPLE = 'Show all APT actors linked to finance-themed targets';

export default function MagicSearch({ caseId = 'demo' }: { caseId?: string }) {
  const [input, setInput] = useState('');
  const [runQuery, { data, loading, error }] = useLazyQuery(COPILOT_QUERY);
  const options = [...ENTITY_SUGGESTIONS, ...RELATION_SUGGESTIONS];

  const runSearch = async (preview = true) => {
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
    <Box sx={{ p: 2 }}>
      <Autocomplete
        freeSolo
        options={options}
        inputValue={input}
        onInputChange={(_, v) => setInput(v)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Magic Search"
            placeholder="Ask in natural language"
            helperText={`Try: ${EXAMPLE}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
            fullWidth
          />
        )}
      />

      {loading && <Typography>Loading...</Typography>}
      {error && <Typography color="error">{error.message}</Typography>}
      {answer && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Generated Cypher</Typography>
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
            <Button sx={{ mt: 1 }} onClick={() => runSearch(false)}>
              Run with guardrails
            </Button>
          )}
          {answer.cypher && <Typography sx={{ mt: 1 }}>Executed query.</Typography>}
        </Box>
      )}
    </Box>
  );
}
