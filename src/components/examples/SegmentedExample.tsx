'use client'

import { useState } from 'react'
import { Segmented } from '../Segmented'

const urgencyOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' }
]

export function SegmentedExample() {
  const [urgency, setUrgency] = useState('normal')

  return (
    <div className="p-8 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Urgency Selection</h3>
        <Segmented
          options={urgencyOptions}
          value={urgency}
          onChange={setUrgency}
          name="urgency-example"
        />
        <p className="mt-2 text-sm text-gray-600">
          Selected: {urgency}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Disabled State</h3>
        <Segmented
          options={urgencyOptions}
          value={urgency}
          onChange={setUrgency}
          name="urgency-disabled"
          disabled
        />
      </div>
    </div>
  )
}