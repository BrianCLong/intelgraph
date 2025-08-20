import Flagsmith from 'flagsmith-nodejs';

export const flagsmith = new Flagsmith({
  environmentKey: process.env.FLAGSMITH_ENV_KEY!,
  apiUrl: process.env.FLAGSMITH_API_URL || 'https://edge.api.flagsmith.com/api/v1/',
});
export async function isEnabled(flag: string) {
  const state = await flagsmith.getEnvironmentFlags();
  return state.isFeatureEnabled(flag);
}