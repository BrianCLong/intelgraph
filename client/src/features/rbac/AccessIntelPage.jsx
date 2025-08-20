import React, { useState } from "react";
import { Box, Typography, Button, TextField, Stack } from "@mui/material";

export default function AccessIntelPage() {
  const [predicted] = useState({ Analyst: 0.8, Admin: 0.2 });
  const [declared] = useState("Analyst");
  const [action, setAction] = useState("view-report");
  const [result, setResult] = useState(null);
  const [comment, setComment] = useState("");

  const simulate = async () => {
    const res = await fetch("/rbac/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleVector: predicted, action }),
    });
    setResult(await res.json());
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Access Intel
      </Typography>
      <Typography variant="body1">Declared Role: {declared}</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Predicted Role Vector: {JSON.stringify(predicted)}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          size="small"
        />
        <Button variant="contained" onClick={simulate}>
          Simulate Access
        </Button>
      </Stack>
      {result && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2">
            Would grant: {String(result.granted)} (confidence{" "}
            {result.confidence})
          </Typography>
          <Typography variant="body2">Reason: {result.rationale}</Typography>
        </Box>
      )}
      <Stack direction="row" spacing={2}>
        <Button variant="outlined" color="success">
          Approve Shift
        </Button>
        <Button variant="outlined" color="error">
          Downgrade
        </Button>
        <TextField
          label="Comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          size="small"
        />
      </Stack>
    </Box>
  );
}
