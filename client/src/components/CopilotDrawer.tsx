/* eslint-disable indent */
import React, { useState } from "react";
import {
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";

interface Message {
  from: "user" | "ai";
  text: string;
}

/**
 * CopilotDrawer provides a lightweight chat interface that
 * streams messages from an AI endpoint via Socket.IO.
 */
const CopilotDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<{ question: string } | null>(null);

  const runQuery = async (question: string, preview: boolean) => {
    const res = await fetch("/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query:
          "query($q:String!,$case:ID!,$preview:Boolean!){copilotQuery(question:$q,caseId:$case,preview:$preview){preview citations{nodeId} policy{allowed reason}}}",
        variables: { q: question, case: "demo", preview },
      }),
    }).then((r) => r.json());
    return res.data.copilotQuery;
  };

  const send = async () => {
    if (!input.trim()) return;
    const question = input;
    setMessages((m) => [...m, { from: "user", text: question }]);
    setInput("");
    const ans = await runQuery(question, true);
    setMessages((m) => [...m, { from: "ai", text: ans.preview }]);
    setPending({ question });
  };

  const confirm = async () => {
    if (!pending) return;
    const ans = await runQuery(pending.question, false);
    if (ans.policy.allowed) {
      setMessages((m) => [...m, { from: "ai", text: `Executed (${ans.citations.length} citations)` }]);
    } else {
      setMessages((m) => [...m, { from: "ai", text: `Denied: ${ans.policy.reason}` }]);
    }
    setPending(null);
  };

  return (
    <>
      <IconButton
        aria-label="open copilot"
        onClick={() => setOpen(true)}
        sx={{ position: "fixed", bottom: 16, right: 16 }}
      >
        <ChatIcon />
      </IconButton>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 320, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Copilot
          </Typography>
          <List sx={{ height: 360, overflowY: "auto" }}>
            {messages.map((m, idx) => (
              <ListItem key={idx}>
                <ListItemText
                  primary={m.text}
                  secondary={m.from === "ai" ? "AI" : "You"}
                />
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              fullWidth
              size="small"
              placeholder="Ask a question"
            />
            <Button onClick={send} variant="contained">
              Send
            </Button>
          </Box>
          {pending && (
            <Box sx={{ mt: 1 }}>
              <Button onClick={confirm} variant="outlined" fullWidth>
                Execute query
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default CopilotDrawer;
