import { useState } from 'react'

export default function TimeSlider() {
  const [value, setValue] = useState(0)
  return (
    <div className="bg-white p-2 rounded shadow text-xs">
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
      />
    </div>
  )
}
