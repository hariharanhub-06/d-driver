/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        ignoreBuildErrors: true,
    },
    images: {
        domains: ['ik.imagekit.io', 'img.icons8.com'],
    },
    // Allow leaflet to work
    webpack: (config) => {
        config.resolve.fallback = { ...config.resolve.fallback, fs: false };
        return config;
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    // SAMEORIGIN here — CSP frame-ancestors overrides this in all modern browsers,
                    // allowing hariharanhub.com admin portal to embed these pages via iframe
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            // checkout.razorpay.com serves the Checkout SDK. Without it the script
                            // is blocked and every payment fails with "Failed to load payment gateway".
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "img-src 'self' data: blob: https: http:",
                            "font-src 'self' data: https://fonts.gstatic.com",
                            "connect-src 'self' https: wss:",
                            "media-src 'self' https: blob:",
                            // Razorpay Checkout renders inside an iframe. There was no frame-src, so it
                            // fell back to default-src 'self' and the payment window would be blocked
                            // even once the script loaded.
                            "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
                            "frame-ancestors 'self' https://hariharanhub.com",
                            "object-src 'none'",
                        ].join('; '),
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
