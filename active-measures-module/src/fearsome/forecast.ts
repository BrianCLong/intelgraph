import { execSync } from 'child_process';

export function forecastBehavior(plan: any) {
  const pyCode = `
import torch
lstm = torch.nn.LSTM(1,1)
print('Altered timelines')
  `;
  return execSync(`python -c "${pyCode}"`).toString();
}
