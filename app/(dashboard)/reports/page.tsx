import { ReportsDashboard } from '@/components/reports/reports-dashboard'

export default function ReportsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Collection insights and statistics</p>
      </div>
      <ReportsDashboard />
    </div>
  )
}
