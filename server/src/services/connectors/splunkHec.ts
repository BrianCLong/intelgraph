const enabled = process.env.ENABLE_SPLUNK_HEC === 'true';
export const isEnabled = () => enabled;
// TODO: map HEC events -> ECS-like internal shape, reuse ingestEcsEvents
