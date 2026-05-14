import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 21V12m0 0V3m0 9H3m9 0h9M3 9h18M3 15h18"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Museum Collection Manager
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Collection stewardship platform
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
