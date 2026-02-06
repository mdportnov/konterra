'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Contact } from '@/lib/db/schema'

interface TopCountriesChartProps {
  contacts: Contact[]
  limit?: number
}

export default function TopCountriesChart({ contacts, limit = 8 }: TopCountriesChartProps) {
  const data = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of contacts) {
      if (c.country) counts.set(c.country, (counts.get(c.country) || 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }))
  }, [contacts, limit])

  if (data.length === 0) return null

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Countries</span>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={70}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--popover-foreground)',
              }}
              cursor={{ fill: 'var(--accent)', opacity: 0.3 }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {data.map((_, i) => (
                <Cell key={i} fill={`rgba(249,115,22,${0.7 - i * 0.06})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
