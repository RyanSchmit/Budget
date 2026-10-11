// With NEXT_PUBLIC_API_URL unset the API client issues same-origin /api requests,
// which these rewrites forward to the Express backend.
const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
