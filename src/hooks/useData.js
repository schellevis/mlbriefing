import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL || './'

async function fetchJson(path) {
  const url = `${BASE}${path}`.replace(/\/+/g, '/').replace(':/', '://')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

export function useData(selectedDate = null) {
  const [index, setIndex] = useState(null)
  const [daily, setDaily] = useState(null)
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeDate, setActiveDate] = useState(selectedDate)

  // Laad index
  useEffect(() => {
    fetchJson('data/index.json')
      .then(data => {
        setIndex(data)
        if (!activeDate) {
          setActiveDate(data.latest)
        }
      })
      .catch(err => {
        setError('Geen data beschikbaar')
        setLoading(false)
      })
  }, [])

  // Laad daily data als datum bekend is
  useEffect(() => {
    if (!activeDate) return
    setLoading(true)
    setError(null)

    Promise.all([
      fetchJson(`data/daily/${activeDate}.json`),
      fetchJson(`data/news/${activeDate}.json`).catch(() => null),
    ])
      .then(([dailyData, newsData]) => {
        setDaily(dailyData)
        setNews(newsData)
        setLoading(false)
      })
      .catch(err => {
        setError(`Geen data voor ${activeDate}`)
        setLoading(false)
      })
  }, [activeDate])

  return {
    index,
    daily,
    news,
    loading,
    error,
    activeDate,
    setActiveDate,
  }
}
