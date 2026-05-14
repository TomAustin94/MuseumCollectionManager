'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  code: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d+$/, 'Code must contain only digits'),
})

type FormValues = z.infer<typeof schema>

interface EnrollData {
  id: string
  qrCode: string
  secret: string
}

export default function MfaSetupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    async function initialize() {
      const supabase = createClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      })

      if (error || !data) {
        toast.error(error?.message ?? 'Failed to start MFA enrollment')
        setInitializing(false)
        return
      }

      setEnrollData({
        id: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      })
      setInitializing(false)
    }

    initialize()
  }, [router])

  async function onSubmit(values: FormValues) {
    if (!enrollData) return

    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollData.id,
      code: values.code,
    })

    setIsLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setSuccess(true)
  }

  if (initializing) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          MFA enabled
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Two-factor authentication has been successfully configured for your
          account.
        </p>
        <Button onClick={() => router.push('/dashboard/items')} className="w-full">
          Continue to dashboard
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-slate-700 mb-3" />
        <h2 className="text-xl font-semibold text-slate-900">
          Set up two-factor authentication
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Scan the QR code with your authenticator app
        </p>
      </div>

      {enrollData && (
        <div className="space-y-5">
          <div className="flex justify-center">
            <div className="border border-slate-200 rounded-lg p-3 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollData.qrCode}
                alt="TOTP QR code"
                width={160}
                height={160}
                className="block"
              />
            </div>
          </div>

          <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500 mb-1 font-medium">
              Can&apos;t scan? Enter this key manually:
            </p>
            <p className="text-xs font-mono text-slate-700 break-all select-all">
              {enrollData.secret}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className="text-center text-lg tracking-widest"
                {...register('code')}
                aria-invalid={!!errors.code}
              />
              {errors.code && (
                <p className="text-xs text-red-500">{errors.code.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm and enable MFA
            </Button>
          </form>
        </div>
      )}
    </>
  )
}
