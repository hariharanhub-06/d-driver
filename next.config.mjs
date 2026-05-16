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
};

export default nextConfig;
