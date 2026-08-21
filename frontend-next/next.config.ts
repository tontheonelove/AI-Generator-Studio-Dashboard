/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // ✅ อนุญาตทุก origin ที่เข้าถึง dev server
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://10.10.10.253:3000',
    'http://10.10.10.253',
    '10.10.10.253',
    'http://10.10.10.*:3000',  // wildcard สำหรับ range
  ],

  // ✅ Proxy API calls ไปที่ Backend
  async rewrites() {
    return [
      { 
        source: '/api/:path*', 
        destination: 'http://127.0.0.1:8000/api/:path*' 
      },
    ];
  },
};

export default nextConfig;