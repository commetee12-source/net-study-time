/**
 * STAI Pose Analyzer
 * MediaPipe Pose Landmarker 좌표를 분석하여 집중/딴짓/자리비움 상태를 판별
 */

export type StudyState = "IDLE" | "FOCUS" | "DISTRACTED" | "AWAY";

// MediaPipe Pose Landmark indices
const NOSE = 0;
const LEFT_EYE_INNER = 1;
const LEFT_EYE = 2;
const LEFT_EYE_OUTER = 3;
const RIGHT_EYE_INNER = 4;
const RIGHT_EYE = 5;
const RIGHT_EYE_OUTER = 6;
const LEFT_EAR = 7;
const RIGHT_EAR = 8;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;

interface Landmark {
  x: number; // 0~1 normalized
  y: number;
  z: number;
  visibility?: number;
}

// 분석 임계값
const THRESHOLDS = {
  // 랜드마크 가시성 최소값
  MIN_VISIBILITY: 0.3,
  // 어깨 기울기 (수평 대비 기울어진 정도, 라디안)
  MAX_SHOULDER_TILT: 0.45, // ~26도 (여유 있게)
  // 고개 좌우 회전 판별: 코와 양 귀 사이 거리 비율
  HEAD_TURN_RATIO: 3.0,    // 완전히 옆을 볼 때만 감지
  // 머리 높이: 어깨선 대비 코 위치 (정상 범위)
  HEAD_Y_MIN: -0.15,       // 어깨선보다 너무 위
  HEAD_Y_MAX: 0.60,        // 어깨선보다 너무 아래 (필기 자세 허용)
  // 머리 좌우 이탈: 어깨 중앙 대비 코 X 오프셋
  HEAD_X_OFFSET_MAX: 0.35, // 자연스러운 움직임 허용
  // 눈 높이 차이로 고개 기울임 감지
  EYE_TILT_MAX: 0.12,      // 약간 기울여도 괜찮게
};

export interface PoseAnalysisResult {
  state: StudyState;
  confidence: number;
  details: {
    shoulderTilt: number;
    headTurnRatio: number;
    headYOffset: number;
    headXOffset: number;
    eyeTilt: number;
    landmarksVisible: boolean;
  };
}

function dist2d(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function analyzePose(landmarks: Landmark[]): PoseAnalysisResult {
  const defaultResult: PoseAnalysisResult = {
    state: "AWAY",
    confidence: 0,
    details: {
      shoulderTilt: 0,
      headTurnRatio: 0,
      headYOffset: 0,
      headXOffset: 0,
      eyeTilt: 0,
      landmarksVisible: false,
    },
  };

  if (!landmarks || landmarks.length < 13) {
    return defaultResult;
  }

  const nose = landmarks[NOSE];
  const leftEye = landmarks[LEFT_EYE];
  const rightEye = landmarks[RIGHT_EYE];
  const leftEar = landmarks[LEFT_EAR];
  const rightEar = landmarks[RIGHT_EAR];
  const leftShoulder = landmarks[LEFT_SHOULDER];
  const rightShoulder = landmarks[RIGHT_SHOULDER];

  // 1. 랜드마크가 13개 이상 존재하면 사람이 있다고 판단 (이미 위에서 체크함)
  // 전면 카메라에서는 visibility/좌표 값이 불안정하므로 추가 체크 생략

  // 2. 어깨 기울기 (수평도)
  const shoulderDx = rightShoulder.x - leftShoulder.x;
  const shoulderDy = rightShoulder.y - leftShoulder.y;
  const shoulderTilt = Math.abs(Math.atan2(shoulderDy, shoulderDx));
  // 0에 가까울수록 수평, PI/2에 가까울수록 수직

  // 3. 고개 좌우 회전 판별
  // 코에서 왼쪽 귀까지 거리 vs 코에서 오른쪽 귀까지 거리 비율
  const noseToLeftEar = dist2d(nose, leftEar);
  const noseToRightEar = dist2d(nose, rightEar);
  const headTurnRatio = Math.max(noseToLeftEar, noseToRightEar) /
    (Math.min(noseToLeftEar, noseToRightEar) + 1e-6);

  // 4. 머리 Y 위치: 어깨 중앙 대비
  const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
  const headYOffset = nose.y - shoulderCenterY;
  // 양수: 코가 어깨 아래 (고개 숙임) / 음수: 코가 어깨 위

  // 5. 머리 X 위치: 어깨 중앙 대비 좌우 이탈
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  const headXOffset = Math.abs(nose.x - shoulderCenterX);

  // 6. 눈 기울기 (고개 갸웃)
  const eyeTilt = Math.abs(leftEye.y - rightEye.y);

  const details = {
    shoulderTilt,
    headTurnRatio,
    headYOffset,
    headXOffset,
    eyeTilt,
    landmarksVisible: true,
  };

  // === 상태 판별 ===
  // 랜드마크가 감지된 이상 AWAY는 반환하지 않음 (AWAY는 detectFrame에서 랜드마크 미감지 시에만)

  let distractionScore = 0;

  // 고개 좌우 회전 → 딴짓
  if (headTurnRatio > THRESHOLDS.HEAD_TURN_RATIO) {
    distractionScore += 0.4;
  }

  // 어깨 기울기 → 딴짓
  if (shoulderTilt > THRESHOLDS.MAX_SHOULDER_TILT) {
    distractionScore += 0.2;
  }

  // 머리 Y 이탈 → 딴짓
  if (headYOffset < THRESHOLDS.HEAD_Y_MIN || headYOffset > THRESHOLDS.HEAD_Y_MAX) {
    distractionScore += 0.3;
  }

  // 머리 X 이탈 → 딴짓
  if (headXOffset > THRESHOLDS.HEAD_X_OFFSET_MAX) {
    distractionScore += 0.3;
  }

  // 눈 기울기 → 딴짓
  if (eyeTilt > THRESHOLDS.EYE_TILT_MAX) {
    distractionScore += 0.15;
  }

  if (distractionScore >= 0.6) {
    return {
      state: "DISTRACTED",
      confidence: Math.min(distractionScore, 1),
      details,
    };
  }

  return {
    state: "FOCUS",
    confidence: 1 - distractionScore,
    details,
  };
}
