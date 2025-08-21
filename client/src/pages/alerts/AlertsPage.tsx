import { useEffect } from 'react';
import $ from 'jquery';

interface AlertRow {
  id: string;
  entity: string;
  reason: string;
  severity: number;
  status: string;
}

const sample: AlertRow[] = [
  { id: '1', entity: 'Entity 1', reason: 'matched name', severity: 5, status: 'OPEN' },
];

export default function AlertsPage() {
  useEffect(() => {
    const table = $('#alerts-table');
    table.find('th').css({ position: 'sticky', top: 0 });
  }, []);

  return (
    <div>
      <h1>Alerts</h1>
      <table id="alerts-table">
        <thead>
          <tr>
            <th>Entity</th>
            <th>Reason</th>
            <th>Severity</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sample.map((a) => (
            <tr key={a.id}>
              <td>{a.entity}</td>
              <td>{a.reason}</td>
              <td>{a.severity}</td>
              <td>{a.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
