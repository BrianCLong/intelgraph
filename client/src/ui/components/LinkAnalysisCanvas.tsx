import { FC, useState } from 'react';

interface TimeRange {
  start: number;
  end: number;
}

const LinkAnalysisCanvas: FC = () => {
  const [range, setRange] = useState<TimeRange>({ start: 0, end: 100 });

  const handleStartChange = (value: number) => {
    setRange((r) => ({ ...r, start: value }));
  };

  const handleEndChange = (value: number) => {
    setRange((r) => ({ ...r, end: value }));
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }} aria-label="timeline">
          <input
            type="range"
            min={0}
            max={100}
            value={range.start}
            onChange={(e) => handleStartChange(Number(e.target.value))}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={range.end}
            onChange={(e) => handleEndChange(Number(e.target.value))}
          />
        </div>
        <div style={{ flex: 2 }} aria-label="map">
          {/* Map placeholder with time/space filters */}
        </div>
      </div>
      <div style={{ flex: 3 }} aria-label="graph">
        {/* Graph placeholder with pivot/expand and pinboard support */}
        <div>{`Time range: ${range.start} - ${range.end}`}</div>
      </div>
    </div>
  );
};

export default LinkAnalysisCanvas;
