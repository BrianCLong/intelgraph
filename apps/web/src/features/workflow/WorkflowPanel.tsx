import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import $ from 'jquery';

interface ChecklistItem {
  text: string;
  done: boolean;
}

interface CaseInfo {
  state: string;
  assignees: string[];
  checklist: ChecklistItem[];
  slaRemaining: number | null;
}

export default function WorkflowPanel() {
  const [caseId, setCaseId] = useState<string | null>(null);
  const [info, setInfo] = useState<CaseInfo | null>(null);

  useEffect(() => {
    const handler = (_e: any, node: any) => setCaseId(node.id());
    $(document).on('cy:selected', handler);
    return () => $(document).off('cy:selected', handler);
  }, []);

  useEffect(() => {
    let timer: any;
    if (caseId) {
      const fetchInfo = async () => {
        const res = await fetch(`/wf/cases/${caseId}`);
        const data = await res.json();
        setInfo(data);
      };
      fetchInfo();
      timer = setInterval(fetchInfo, 1000);
    }
    return () => clearInterval(timer);
  }, [caseId]);

  if (!info) return <Typography tabIndex={0}>Select a case</Typography>;

  return (
    <div aria-label="workflow panel">
      <Typography tabIndex={0}>State: {info.state}</Typography>
      <Typography tabIndex={0}>SLA remaining: {info.slaRemaining}</Typography>
      <List aria-label="checklist">
        {info.checklist.map((item, idx) => (
          <ListItem key={idx} disablePadding>
            <Checkbox tabIndex={0} inputProps={{ 'aria-label': item.text }} />
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Button variant="contained" tabIndex={0} aria-label="refresh" onClick={() => caseId && fetch(`/wf/cases/${caseId}`).then(r => r.json()).then(setInfo)}>
        Refresh
      </Button>
    </div>
  );
}
