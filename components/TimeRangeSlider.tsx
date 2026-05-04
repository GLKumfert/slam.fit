'use client'
import * as Slider from '@radix-ui/react-slider'

interface TimeRangeSliderProps {
  value: [number, number] // minutes from midnight
  onChange: (value: [number, number]) => void
}

export default function TimeRangeSlider({ value, onChange }: TimeRangeSliderProps) {
  function formatTime(minutes: number) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    const ampm = h >= 12 && h < 24 ? 'PM' : 'AM'
    const displayH = h % 12 === 0 ? 12 : h % 12
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  return (
    <div className="px-2 pt-6 pb-2">
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5 mt-4"
        value={value}
        max={1440} // 24 hours
        step={15}
        minStepsBetweenThumbs={4} // at least 1 hour
        onValueChange={(val) => onChange(val as [number, number])}
      >
        <Slider.Track className="bg-white/20 relative grow rounded-full h-2">
          <Slider.Range className="absolute bg-dse-teal rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb className="block w-5 h-5 bg-dse-teal shadow-md rounded-full focus:outline-none focus:ring-2 focus:ring-dse-teal/50 cursor-grab active:cursor-grabbing relative">
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-white/90 select-none">
            {formatTime(value[0])}
          </span>
        </Slider.Thumb>
        <Slider.Thumb className="block w-5 h-5 bg-dse-teal shadow-md rounded-full focus:outline-none focus:ring-2 focus:ring-dse-teal/50 cursor-grab active:cursor-grabbing relative">
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-white/90 select-none">
            {formatTime(value[1])}
          </span>
        </Slider.Thumb>
      </Slider.Root>
    </div>
  )
}
