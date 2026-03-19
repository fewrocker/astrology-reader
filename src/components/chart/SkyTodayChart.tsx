import { useMemo } from 'react'
import { calculateChart } from '../../engine/astronomy'
import { calculateAspects } from '../../engine/aspects'
import ChartWheel from './ChartWheel'

/**
 * Renders today's sky as a decorative, read-only natal chart wheel.
 * Calculates planetary positions for the current moment at Greenwich (0°, 0°).
 */
export default function SkyTodayChart() {
  const { chartData, aspects } = useMemo(() => {
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const chart = calculateChart(dateStr, timeStr, 51.4772, -0.0005, 'UTC', false)
    const asp = calculateAspects(chart.planets)
    return { chartData: chart, aspects: asp }
  }, [])

  return (
    <div className="sky-today-chart relative w-full h-full flex items-center justify-center">
      {/* Subtle radial glow behind the chart */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[90%] h-[90%] rounded-full bg-gradient-radial from-mystic-gold/[0.04] via-mystic-purple/[0.02] to-transparent" />
      </div>
      <div className="relative w-full max-w-[640px] pointer-events-none select-none sky-chart-glow">
        <ChartWheel chartData={chartData} aspects={aspects} />
      </div>
    </div>
  )
}
