'use client'

import { login, signup } from './actions'
import Link from 'next/link'
import { useEffect, useState, useActionState } from 'react'
import { ArrowRightIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";


export default function LoginPage() {
  const [loginState, loginAction] = useActionState(login, { error: "", success: false });
  const [signupState, signupAction] = useActionState(signup, { error: "", success: false });
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successfulSignUp, setSuccess] = useState(false)

  useEffect(() => {
    if (loginState.error) {
      setErrorMessage(loginState.error)
      setSuccess(false)
    } else if (signupState.error) {
      setErrorMessage(signupState.error)
      setSuccess(false)
    } else setErrorMessage(null)

    if (loginState.success) {
      window.location.href = '/main'
    }

    if (signupState.success) {
      if (errorMessage !== null) {
        setErrorMessage(null)
      }
      setSuccess(true)
    }
  }, [loginState, signupState])

  return (
<div className="flex items-start sm:items-center justify-center min-h-screen px-4 pt-8 sm:pt-0">
<div className="textbox w-full max-w-xs sm:max-w-md p-6 sm:p-8 pb-14 lg:pb-6">
        <Link href='/' className='text-sm text-yellow-500 flex items-center mb-4'>
          <ArrowLeftIcon className="w-5 md:w-5" />
          <span className='ml-1'>Back</span>
        </Link>

        <h1 className="text-2xl font-semibold defaulttext mb-6 text-center">
          Log in or sign up!
        </h1>

        <form className="space-y-5">
          <div>
            <label htmlFor="email" className="text-sm defaulttext">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter an email..."
              required
              className="w-full inputfield mt-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm defaulttext">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter a password..."
              required
              className="w-full inputfield mt-2 text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button formAction={loginAction} className="w-full submitbutton">
              Log in
              <ArrowRightIcon className="w-5 md:w-6" />
            </button>
            <button formAction={signupAction} className="w-full submitbutton">
              Sign up
              <ArrowRightIcon className="w-5 md:w-6" />
            </button>
          </div>
        </form>

        <Link href='/account/reset' className='text-sm text-blue-500 mt-4 underline block text-center'>
          Forgot password?
        </Link>

        {errorMessage && (
          <div className="mt-6 bg-red-500 text-white text-sm p-3 rounded-lg shadow">
            {errorMessage}
          </div>
        )}
        {successfulSignUp && (
          <div className="mt-6 bg-green-500 text-white text-sm p-3 rounded-lg shadow">
            Check your email for confirmation (Might be in spam)
          </div>
        )}
      </div>
    </div>
  )
}
