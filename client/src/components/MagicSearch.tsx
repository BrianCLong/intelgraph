import React, { useState } from "react";
import { gql, useApolloClient } from "@apollo/client";
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
} from "@mui/material";

const COPILOT_QUERY = gql`
  query Copilot($q: String!, $preview: Boolean!) {
    copilotQuery(question: $q, caseId: "demo", preview: $preview) {
      preview
      citations { nodeId snippet }
      policy { allowed reason }
    }
  }
`;

const EXAMPLE = "Show all APT actors linked to finance-themed targets";

export default function MagicSearch() {
  const client = useApolloClient();
  const [input, setInput] = useState("");
  const [graphql, setGraphql] = useState("");
  const [citations, setCitations] = useState<any[]>([]);
  const [policy, setPolicy] = useState<{ allowed: boolean; reason: string } | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const options: string[] = [];

  const runSearch = async (execute = false) => {
    const { data } = await client.query({
      query: COPILOT_QUERY,
      variables: { q: input, preview: !execute },
      fetchPolicy: "no-cache",
    });
    const ans = data.copilotQuery;
    setGraphql(ans.preview);
    setPolicy(ans.policy);
    if (execute) {
      if (ans.policy.allowed) {
        setCitations(ans.citations);
      }
      setNeedsConfirm(false);
    } else {
      setNeedsConfirm(true);
      setCitations([]);
    }
  };

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
              if (e.key === "Enter") runSearch();
            }}
            fullWidth
          />
        )}
      />

      {graphql && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Query preview</Typography>
          <pre>{graphql}</pre>
          {policy && !policy.allowed && (
            <Typography color="error">Denied: {policy.reason}</Typography>
          )}
          {needsConfirm && policy?.allowed && (
            <Button sx={{ mt: 1 }} variant="outlined" onClick={() => runSearch(true)}>
              Execute
            </Button>
          )}
        </Box>
      )}

      {citations.length > 0 && (
        <List>
          {citations.map((c, idx) => (
            <ListItem key={idx}>
              <ListItemText primary={c.nodeId} secondary={c.snippet} />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
