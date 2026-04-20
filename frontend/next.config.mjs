/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API calls to the backend (set NEXT_PUBLIC_API_URL in Vercel env vars)
  async rewrites() {
    const rawApiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const apiBase = rawApiBase.replace(/\/+$/, '')
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
