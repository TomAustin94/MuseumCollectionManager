'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, MailCheck } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo:
        (process.env.NEXT_PUBLIC_APP_URL ?? '') + '/auth/reset-password',
    })

    setIsLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <MailCheck className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Reset link sent
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          If an account exists for that email, you&apos;ll receive a password
          reset link shortly.
        </p>
        <Link
          href="/auth/login"
          className="text-sm font-medium text-slate-900 hover:underline underline-offset-2"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          Forgot password?
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@museum.org"
            {...register('email')}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Remembered your password?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-slate-900 hover:underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </>
  )
}
