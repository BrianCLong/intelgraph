import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const points = [
  { x: 10, y: 30 },
  { x: 20, y: 50 },
  { x: 30, y: 20 },
  { x: 40, y: 80 },
];

export const MapPanel = () => {
  if (process.env.NODE_ENV === 'test') {
    return (
      <div className="h-full flex items-center justify-center" role="region" aria-label="Map mock">
        Map Placeholder
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart role="region" aria-label="Map mock">
        <XAxis type="number" dataKey="x" name="x" />
        <YAxis type="number" dataKey="y" name="y" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={points} fill="#82ca9d" />
      </ScatterChart>
    </ResponsiveContainer>
  );
};
