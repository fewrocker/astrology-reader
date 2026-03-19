import { useState, useEffect, useRef, useCallback } from 'react'
import type { City } from '../../data/cityTypes'
import { loadCities, searchCities, formatCity } from '../../data/citySearch'

interface CityAutocompleteProps {
  value: City | null
  onChange: (city: City | null) => void
}

export default function CityAutocomplete({ value, onChange }: CityAutocompleteProps) {
  const [query, setQuery] = useState(value ? formatCity(value) : '')
  const [results, setResults] = useState<City[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [cities, setCities] = useState<City[]>([])
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setLoading(true)
    loadCities().then(c => {
      setCities(c)
      setLoading(false)
    })
  }, [])

  const doSearch = useCallback((q: string) => {
    if (!cities.length) return
    const matches = searchCities(cities, q)
    setResults(matches)
    setIsOpen(matches.length > 0)
    setHighlightIndex(-1)
  }, [cities])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    onChange(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 100)
  }

  const selectCity = (city: City) => {
    setQuery(formatCity(city))
    onChange(city)
    setIsOpen(false)
    setResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      selectCity(results[highlightIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length) setIsOpen(true) }}
        placeholder={loading ? 'Loading cities...' : 'Start typing a city name...'}
        disabled={loading}
        className="w-full px-4 py-3 bg-mystic-surface border border-mystic-border rounded-lg text-mystic-text placeholder-mystic-muted focus:outline-none focus:border-mystic-gold transition-colors"
        aria-label="City of birth"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        role="combobox"
      />

      {isOpen && results.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 bg-mystic-surface border border-mystic-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
        >
          {results.map((city, i) => (
            <li
              key={`${city.name}-${city.lat}-${city.lng}`}
              role="option"
              aria-selected={i === highlightIndex}
              className={`px-4 py-2 cursor-pointer transition-colors ${
                i === highlightIndex
                  ? 'bg-mystic-gold/20 text-mystic-gold'
                  : 'hover:bg-mystic-border text-mystic-text'
              }`}
              onMouseDown={() => selectCity(city)}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              <span className="font-medium">{city.name}</span>
              <span className="text-mystic-muted text-sm ml-2">
                {city.region && !/^\d+$/.test(city.region) ? `${city.region}, ` : ''}{city.country}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
