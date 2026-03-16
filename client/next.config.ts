import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
    async rewrites() {
        return {
            beforeFiles: [
                {
                    source: "/context/:path*",
                    destination: `${backendUrl}/context/:path*`,
                },
                {
                    source: "/report/:path*",
                    destination: `${backendUrl}/report/:path*`,
                },
                {
                    source: "/teammate/:path*",
                    destination: `${backendUrl}/teammate/:path*`,
                },
                {
                    source: "/api/:path*",
                    destination: `${backendUrl}/api/:path*`,
                },
            ],
        };
    },
};

export default nextConfig;
