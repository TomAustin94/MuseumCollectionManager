'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'

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

export default function MfaChallengePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [loadingFactors, setLoadingFactors] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    async function loadFactor() {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.listFactors()

      if (error || !data?.totp?.length) {
        toast.error('No MFA factor found. Please sign in again.')
        router.push('/auth/login')
        return
      }

      const verifiedFactor = data.totp.find((f) => f.status === 'verified')
      if (!verifiedFactor) {
        toast.error('No verified MFA factor found.')
        router.push('/auth/login')
        return
      }

      setFactorId(verifiedFactor.id)
      setLoadingFactors(false)
    }

    loadFactor()
  }, [router])

  async function onSubmit(values: FormValues) {
    if (!factorId) return

    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: values.code,
    })

    setIsLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    router.push('/dashboard/items')
  }

  if (loadingFactors) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-slate-700 mb-3" />
        <h2 className="text-xl font-semibold text-slate-900">
          Two-factor authentication
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="code">Authentication code</Label>
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

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !factorId}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify
        </Button>
      </form>
    </>
  )
}
