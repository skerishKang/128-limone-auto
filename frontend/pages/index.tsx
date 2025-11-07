import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// SSR 문제를 피하기 위해 dynamic import 사용
const DesktopLayout = dynamic(() => import('../layouts/DesktopLayout'), {
  ssr: false,
  loading: () => <div className="h-screen flex items-center justify-center">Loading...</div>
});
const MobileLayout = dynamic(() => import('../layouts/MobileLayout'), {
  ssr: false,
  loading: () => <div className="h-screen flex items-center justify-center">Loading...</div>
});

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 디바이스 감지 - width만 사용 (userAgent는 개발자도구에서 변함)
    const checkDevice = () => {
      const isMobileDevice = window.innerWidth < 1024; // 1024px 미만: 모바일
      setIsMobile(isMobileDevice);
    };

    // 초기 체크
    checkDevice();

    // 리사이즈 시 다시 체크
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
