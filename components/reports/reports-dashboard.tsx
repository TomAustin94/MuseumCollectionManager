'use client'

import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const STATUS_COLORS: Record<string, string> = {
  display: '#22c55e',
  storage: '#94a3b8',
  loan: '#f59e0b',
  conservation: '#3b82f6',
  lost: '#ef4444',
}

const CONDITION_COLORS: Record<string, string> = {
  excellent: '#22c55e',
  good: '#84cc16',
  fair: '#f59e0b',
  poor: '#f97316',
  damaged: '#ef4444',
  unknown: '#94a3b8',
}

function useReport<T>(type: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reports?type=${type}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [type])

  return { data, loading }
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  )
}

function OverviewReport() {
  const { data, loading } = useReport<{
    total: number
    byStatus: { name: string; value: number }[]
    byCategory: { name: string; value: number }[]
  }>('overview')

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>
  if (!data) return <div className="text-center py-12 text-muted-foreground">Failed to load</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Items" value={data.total} />
        <StatCard label="On Display" value={data.byStatus.find((s) => s.name === 'display')?.value ?? 0} />
        <StatCard label="In Storage" value={data.byStatus.find((s) => s.name === 'storage')?.value ?? 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.byStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {data.byStatus.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byCategory} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" name="Items" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function LocationReport() {
  const { data, loading } = useReport<
    { name: string; display: number; storage: number; total: number }[]
  >('location')

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>
  if (!data) return <div className="text-center py-12 text-muted-foreground">Failed to load</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Items by Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3 pr-4 font-medium">Location</th>
                <th className="py-3 pr-4 font-medium text-right">On Display</th>
                <th className="py-3 pr-4 font-medium text-right">In Storage</th>
                <th className="py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.name} className="border-b hover:bg-muted/50">
                  <td className="py-3 pr-4">{row.name}</td>
                  <td className="py-3 pr-4 text-right text-green-600">{row.display}</td>
                  <td className="py-3 pr-4 text-right text-slate-500">{row.storage}</td>
                  <td className="py-3 text-right font-medium">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function AcquisitionReport() {
  const { data, loading } = useReport<{ year: string; count: number }[]>('acquisition')

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>
  if (!data) return <div className="text-center py-12 text-muted-foreground">Failed to load</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Acquisitions by Year</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Items Acquired" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function ConditionReport() {
  const { data, loading } = useReport<{ condition: string; count: number }[]>('condition')

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>
  if (!data) return <div className="text-center py-12 text-muted-foreground">Failed to load</div>

  const atRisk = data
    .filter((d) => ['poor', 'damaged'].includes(d.condition))
    .reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="space-y-4">
      {atRisk > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <strong>{atRisk} item{atRisk !== 1 ? 's' : ''}</strong> in poor or damaged condition require attention.
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Condition Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="condition" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" name="Items">
                {data.map((entry) => (
                  <Cell
                    key={entry.condition}
                    fill={CONDITION_COLORS[entry.condition] ?? '#94a3b8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export function ReportsDashboard() {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-6">
        <TabsTrigger value="overview">Collection Overview</TabsTrigger>
        <TabsTrigger value="location">Location Report</TabsTrigger>
        <TabsTrigger value="acquisition">Acquisition Timeline</TabsTrigger>
        <TabsTrigger value="condition">Condition Report</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <OverviewReport />
      </TabsContent>
      <TabsContent value="location">
        <LocationReport />
      </TabsContent>
      <TabsContent value="acquisition">
        <AcquisitionReport />
      </TabsContent>
      <TabsContent value="condition">
        <ConditionReport />
      </TabsContent>
    </Tabs>
  )
}
