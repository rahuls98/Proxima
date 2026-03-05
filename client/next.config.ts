import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async rewrites() {
        return {
            beforeFiles: [
                {
                    source: "/context/:path*",
                    destination: "http://localhost:8000/context/:path*",
                },
                {
                    source: "/report/:path*",
                    destination: "http://localhost:8000/report/:path*",
                },
            ],
        };
    },
};

export default nextConfig;
