import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { LoadingSkeleton } from './LoadingSkeleton';

const data = [
  { time: 1, value: 3 },
  { time: 2, value: 5 },
  { time: 3, value: 2 },
  { time: 4, value: 8 },
  { time: 5, value: 6 },
];

export const TimelinePanel = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (process.env.NODE_ENV === 'test') {
    return (
      <div
        className="h-full flex items-center justify-center"
        role="region"
        aria-label="Timeline chart"
      >
        Timeline Placeholder
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} role="region" aria-label="Timeline chart">
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
};
