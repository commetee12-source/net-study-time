---
name: focus-detection-skill
description: |
  MediaPipe 랜드마크 좌표를 입력받아 학생의 몰입/비몰입 상태를 판정하는
  알고리즘을 구현한다. 졸음/엎드림, 자리 이탈, 스마트폰 만지기/딴짓
  3가지 비몰입 유형을 감지한다.
  사용 시점: 비몰입 판정 로직, 졸음 감지, 딴짓 감지, 자리 이탈 감지,
  몰입 상태 판별, 타이머 제어 로직 구현 시 반드시 사용.
---

# Focus Detection Skill

MediaPipe Pose에서 추출한 랜드마크 좌표를 분석하여, 사전 정의된 규칙 기반으로
몰입/비몰입 상태를 판정한다. 일시적 동작(필기로 고개 숙이기 등)과
지속적 비몰입(졸음 등)을 구분하기 위한 시간 버퍼링을 적용한다.

## 설정 인터페이스

```typescript
interface DetectionConfig {
  sleepPitchThreshold: number;     // 졸음 판정 각도 (기본 30°)
  sleepDurationMs: number;          // 졸음 판정 지속 시간 (기본 5000ms)
  absentConfidenceThreshold: number; // 이탈 판정 신뢰도 (기본 0.3)
  distractedDurationMs: number;     // 딴짓 판정 지속 시간 (기본 3000ms)
  handFaceDistanceThreshold: number; // 손-얼굴 거리 임계값 (정규화, 기본 0.15)
  distractedPitchThreshold: number;  // 딴짓 시 머리 각도 (기본 15°)
}

const DEFAULT_CONFIG: DetectionConfig = {
  sleepPitchThreshold: 30,
  sleepDurationMs: 5000,
  absentConfidenceThreshold: 0.3,
  distractedDurationMs: 3000,
  handFaceDistanceThreshold: 0.15,
  distractedPitchThreshold: 15
};
```

## 판정 알고리즘 구현

```typescript
class FocusDetector {
  private config: DetectionConfig;
  private sleepStartTime: number | null = null;
  private distractedStartTime: number | null = null;

  constructor(config: Partial<DetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  detect(landmarks: NormalizedLandmark[], confidence: number): FocusState {
    const now = Date.now();

    // 1. 자리 이탈 감지 (최우선)
    if (landmarks.length === 0 || confidence < this.config.absentConfidenceThreshold) {
      this.resetTimers();
      return { isFocused: false, reason: 'absent', confidence };
    }

    // 2. 졸음/엎드림 감지
    const pitch = this.calculateHeadPitch(landmarks);
    const isSleepPosture = pitch > this.config.sleepPitchThreshold
      || this.isNoseBelowShoulders(landmarks);

    if (isSleepPosture) {
      if (!this.sleepStartTime) this.sleepStartTime = now;
      if (now - this.sleepStartTime >= this.config.sleepDurationMs) {
        return { isFocused: false, reason: 'sleeping', confidence };
      }
    } else {
      this.sleepStartTime = null;
    }

    // 3. 스마트폰/딴짓 감지
    const isDistractedPosture = this.isHandNearFace(landmarks)
      && pitch > this.config.distractedPitchThreshold;

    if (isDistractedPosture) {
      if (!this.distractedStartTime) this.distractedStartTime = now;
      if (now - this.distractedStartTime >= this.config.distractedDurationMs) {
        return { isFocused: false, reason: 'distracted', confidence };
      }
    } else {
      this.distractedStartTime = null;
    }

    // 모든 규칙 통과 → 몰입 상태
    return { isFocused: true, reason: undefined, confidence };
  }

  private calculateHeadPitch(landmarks: NormalizedLandmark[]): number {
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const midShoulderZ = (leftShoulder.z + rightShoulder.z) / 2;
    const radians = Math.atan2(nose.y - midShoulderY, nose.z - midShoulderZ);
    return Math.abs(radians * (180 / Math.PI));
  }

  private isNoseBelowShoulders(landmarks: NormalizedLandmark[]): boolean {
    const nose = landmarks[0];
    const maxShoulderY = Math.max(landmarks[11].y, landmarks[12].y);
    return nose.y > maxShoulderY;
  }

  private isHandNearFace(landmarks: NormalizedLandmark[]): boolean {
    const nose = landmarks[0];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const distL = Math.hypot(leftWrist.x - nose.x, leftWrist.y - nose.y);
    const distR = Math.hypot(rightWrist.x - nose.x, rightWrist.y - nose.y);
    return distL < this.config.handFaceDistanceThreshold
      || distR < this.config.handFaceDistanceThreshold;
  }

  private resetTimers() {
    this.sleepStartTime = null;
    this.distractedStartTime = null;
  }
}
```

## 판정 우선순위

1. **자리 이탈** (최우선): 랜드마크 미감지 → 즉시 비몰입
2. **졸음/엎드림**: pitch > 30° 또는 코 < 어깨 → 5초 지속 시 비몰입
3. **딴짓/스마트폰**: 손-얼굴 근접 + 머리 하방 → 3초 지속 시 비몰입
4. **몰입**: 위 모든 규칙 통과 시

## 사용 예제

**예제 1: 기본 사용**
- 입력: "MediaPipe 랜드마크를 받아서 졸고 있는지 판별하는 코드"
- 출력: FocusDetector 클래스 + sleepPitch 계산 로직

**예제 2: 커스텀 임계값 설정**
- 입력: "딴짓 감지를 5초로 변경하고, 졸음 각도를 25도로 낮춰줘"
- 출력: DetectionConfig 수정 적용 코드

**예제 3: 필기 오판 방지**
- 입력: "필기할 때 졸음으로 판정되지 않도록 버퍼를 조정해줘"
- 출력: sleepDurationMs를 7000~10000으로 조정 + 안내
