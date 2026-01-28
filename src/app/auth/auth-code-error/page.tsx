import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen bg-black font-sans text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">Authentication Error</h1>
        <p className="text-zinc-400 mb-8">
          There was an error authenticating your account. The link may have expired or already been used.
        </p>
        <div className="space-y-4">
          <Link
            href="/auth/sign-in"
            className="inline-block bg-white text-black px-6 py-2 rounded font-medium hover:bg-zinc-200"
          >
            Go to Sign In
          </Link>
          <div>
            <Link
              href="/auth/sign-up"
              className="text-zinc-400 hover:text-white underline"
            >
              Create a new account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
