/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API calls to the backend (set NEXT_PUBLIC_API_URL in Vercel env vars)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
