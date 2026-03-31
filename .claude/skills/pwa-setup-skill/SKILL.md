---
name: pwa-setup-skill
description: |
  PWA(Progressive Web App) 설정을 생성한다.
  manifest.json, 서비스 워커, 카메라 권한 요청, 홈화면 추가 안내,
  Wake Lock API 설정을 포함한다.
  사용 시점: PWA 초기 설정, 오프라인 지원, 홈화면 추가,
  카메라 권한 처리, 화면 꺼짐 방지 기능 구현 시 반드시 사용.
---

# PWA Setup Skill

스마트폰에서 네이티브 앱처럼 동작하는 PWA 설정 파일을 생성한다.
카메라 권한 요청 흐름과 Wake Lock API(화면 꺼짐 방지)를 포함한다.

## manifest.json 템플릿

```json
{
  "name": "Net Study Time",
  "short_name": "NetStudy",
  "description": "AI 자세 분석 기반 순공부시간 측정",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## Vite PWA 플러그인 설정

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Net Study Time',
        short_name: 'NetStudy',
        description: 'AI 자세 분석 기반 순공부시간 측정',
        theme_color: '#4F46E5',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ]
});
```

## Wake Lock API 훅

```typescript
import { useState, useRef, useCallback } from 'react';

function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const request = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setIsLocked(true);
        wakeLockRef.current.addEventListener('release', () => setIsLocked(false));
      }
    } catch (err) {
      console.warn('Wake Lock failed:', err);
    }
  }, []);

  const release = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  return { isLocked, request, release };
}
```

## 카메라 권한 요청 패턴

```typescript
async function requestCameraPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    if (result.state === 'granted') return 'granted';
    if (result.state === 'denied') return 'denied';
    
    // 'prompt' 상태 → 실제 요청
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    stream.getTracks().forEach(track => track.stop());
    return 'granted';
  } catch {
    return 'denied';
  }
}
```

## 사용 예제

**예제 1: PWA 전체 설정**
- 입력: "PWA 설정 파일들을 만들어줘"
- 출력: manifest.json + 서비스워커 + Vite PWA 플러그인 설정

**예제 2: 카메라 권한 처리**
- 입력: "카메라 권한 요청 + 거부 시 안내 모달을 만들어줘"
- 출력: 권한 요청 함수 + 안내 UI 컴포넌트
