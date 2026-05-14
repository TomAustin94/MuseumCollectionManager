'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, CheckCircle2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z
  .object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
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

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
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
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Check your email
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          We&apos;ve sent a confirmation link to your email address. Please
          verify your account before signing in.
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
        <h2 className="text-xl font-semibold text-slate-900">Create account</h2>
        <p className="text-sm text-slate-500 mt-1">
          Register for access to the collection
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            {...register('full_name')}
            aria-invalid={!!errors.full_name}
          />
          {errors.full_name && (
            <p className="text-xs text-red-500">{errors.full_name.message}</p>
          )}
        </div>

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

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            aria-invalid={!!errors.password}
          />
          {errors.password ? (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          ) : (
            <p className="text-xs text-slate-400">Minimum 12 characters</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">Confirm password</Label>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            {...register('confirm_password')}
            aria-invalid={!!errors.confirm_password}
          />
          {errors.confirm_password && (
            <p className="text-xs text-red-500">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{' '}
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
