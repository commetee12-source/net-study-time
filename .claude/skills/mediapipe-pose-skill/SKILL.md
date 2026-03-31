---
name: mediapipe-pose-skill
description: |
  MediaPipe Pose(또는 PoseLandmarker)를 브라우저 환경에서 초기화하고,
  카메라 스트림에서 실시간으로 신체 랜드마크를 추출하는 코드를 생성한다.
  사용 시점: 카메라 연결, MediaPipe 초기화, 프레임 루프 설정,
  랜드마크 좌표 추출, 포즈 감지 엔진 구현 시 반드시 사용.
---

# MediaPipe Pose Skill

MediaPipe Pose 모델을 브라우저 내에서 로드하고, 전면 카메라 스트림을 연결하여
각 프레임에서 33개 신체 랜드마크(코, 어깨, 손목 등)를 실시간으로 추출한다.
모바일 최적화를 위해 FPS를 제한하고 모델 복잡도를 조정한다.

## 핵심 구현 패턴

### MediaPipe Pose 초기화

```typescript
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

async function initPose(): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
  );
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU'  // 모바일 GPU 가속
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
}
```

### 프레임 처리 루프 (5~10 FPS 제한)

```typescript
const TARGET_FPS = 8;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

function startFrameLoop(
  poseLandmarker: PoseLandmarker,
  video: HTMLVideoElement,
  onResult: (landmarks: NormalizedLandmark[]) => void
) {
  let lastTime = 0;
  
  function processFrame(currentTime: number) {
    if (currentTime - lastTime >= FRAME_INTERVAL) {
      const result = poseLandmarker.detectForVideo(video, currentTime);
      if (result.landmarks.length > 0) {
        onResult(result.landmarks[0]);
      } else {
        onResult([]); // 사람 미감지
      }
      lastTime = currentTime;
    }
    requestAnimationFrame(processFrame);
  }
  
  requestAnimationFrame(processFrame);
}
```

### 카메라 스트림 연결

```typescript
async function startCamera(videoElement: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',     // 전면 카메라
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { max: 15 }  // 배터리 절약
    }
  });
  videoElement.srcObject = stream;
  await videoElement.play();
  return stream;
}
```

## 주요 랜드마크 인덱스 참조

| 인덱스 | 부위 | 용도 |
|--------|------|------|
| 0 | 코(nose) | 머리 위치, 졸음 감지 |
| 11 | 왼쪽 어깨 | 자세 기준선 |
| 12 | 오른쪽 어깨 | 자세 기준선 |
| 15 | 왼쪽 손목 | 딴짓 감지 |
| 16 | 오른쪽 손목 | 딴짓 감지 |

## 사용 예제

**예제 1: 기본 초기화 및 프레임 루프 설정**
- 입력: "카메라를 연결하고 MediaPipe로 자세 분석을 시작하는 코드를 작성해줘"
- 출력: initPose() + startCamera() + startFrameLoop() 통합 코드

**예제 2: React Hook으로 래핑**
- 입력: "usePoseDetection 훅을 만들어줘"
- 출력: 카메라 초기화·MediaPipe 로드·프레임 루프·클린업을 관리하는 커스텀 훅

## 에러 처리

카메라 접근 실패, MediaPipe 모델 로딩 실패, GPU 미지원 환경 등에 대해
사용자에게 명확한 안내 메시지를 표시해야 한다.

```typescript
// 에러 처리 패턴
try {
  const stream = await startCamera(videoRef.current);
} catch (err) {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') {
      // 카메라 권한 거부 → 안내 모달 표시
    } else if (err.name === 'NotFoundError') {
      // 카메라 없음 → 안내 메시지
    }
  }
}
```
