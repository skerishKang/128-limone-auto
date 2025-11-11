const path = require('path');

/** @type {import('next').NextConfig} */
const isStaticExport = process.env.NEXT_EXPORT === 'true';

const nextConfig = {
  ...(isStaticExport ? { output: 'export' } : {}),
  reactStrictMode: true,
  swcMinify: true,

  // Performance optimizations
  experimental: {
    scrollRestoration: true,
  },

  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Bundle analyzer (optional)
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      const ignoredGlobs = [
        '**/node_modules/**',
        '**/.git/**',
        '**/System Volume Information/**',
        'G:/System Volume Information/**',
        'G:/System Volume Information*',
        'G:/System Volume Information',
        'G:/System Volume Information/*',
        'G:/System Volume Information/.*',
        'G:/System Volume Information/**',
        'G:/System Volume Information?*',
        'G:/System Volume Information +(*)',
        'G:/System Volume Information/**/*',
        'G:/System Volume Information/****',
        'G:/System Volume Information/*/**',
        'G:/System Volume Information/*/*'
      ];

      config.watchOptions = {
        ...config.watchOptions,
        ignored: ignoredGlobs,
      };
    }
    if (!dev && !isServer) {
      // Optimize bundle for production
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
            },
          },
        },
      };
    }
    return config;
  },

  // Compression
  compress: true,

  // PWA support
  async headers() {
    if (isStaticExport) {
      return [];
    }
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
