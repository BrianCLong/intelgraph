import React from 'react';
import $ from 'jquery';
import { useMutation, gql } from '@apollo/client';

const MUT = gql`mutation($events: JSON!, $options: EcsIngestOptions!) {
  ingestEcsEvents(events:$events, options:$options){ received accepted rejected batchId }
}`;

export default function EcsIngestPanel() {
  const [mutate, { data, loading }] = useMutation(MUT);
  const [json, setJson] = React.useState('[]');

  React.useEffect(() => {
    $('#ecsIngestBtn').off('click').on('click', async () => {
      $('#ecsIngestBtn').prop('disabled', true);
      try {
        const events = JSON.parse(json);
        const res = await mutate({ variables: { events, options: { source: 'elastic-ecs' } }});
        const r = res.data.ingestEcsEvents;
        $('#ecsIngestResult').text(`Received ${r.received}, accepted ${r.accepted}, rejected ${r.rejected} (batch ${r.batchId})`);
      } catch (e) {
        $('#ecsIngestResult').text('Invalid JSON or server error');
      } finally {
        $('#ecsIngestBtn').prop('disabled', false);
      }
    });
  }, [json]);

  return (
    <div className="p-4 rounded-2xl shadow space-y-3">
      <h3 className="text-lg font-semibold">Elastic SIEM (ECS) Ingest</h3>
      <textarea value={json} onChange={e=>setJson(e.target.value)} className="w-full h-40 p-2 rounded border" />
      <button id="ecsIngestBtn" className="px-4 py-2 rounded-2xl shadow">{loading ? 'Ingesting…' : 'Ingest JSON'}</button>
      <div id="ecsIngestResult" className="text-sm opacity-80" />
    </div>
  );
}
