"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { analyzePose, type StudyState, type PoseAnalysisResult } from "@/lib/pose-analyzer";

interface UsePoseDetectionOptions {
  onStateChange?: (state: StudyState, result: PoseAnalysisResult) => void;
}

export function usePoseDetection(options?: UsePoseDetectionOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastStateRef = useRef<StudyState>("IDLE");
  const stateBufferRef = useRef<StudyState[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState<StudyState>("IDLE");
  const [analysisResult, setAnalysisResult] = useState<PoseAnalysisResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const onStateChangeRef = useRef(options?.onStateChange);
  onStateChangeRef.current = options?.onStateChange;

  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError("카메라 접근이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.");
      throw new Error("Camera access denied");
    }
  }, []);

  const initPoseLandmarker = useCallback(async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });
    landmarkerRef.current = landmarker;
  }, []);

  // 상태 버퍼링: 최근 5프레임 중 다수결로 상태 결정 (노이즈 제거)
  const STATE_BUFFER_SIZE = 5;
  const MAJORITY_THRESHOLD = 3; // 5프레임 중 3개 이상이면 상태 전환

  const updateState = useCallback((newState: StudyState, result: PoseAnalysisResult) => {
    const buffer = stateBufferRef.current;
    buffer.push(newState);
    if (buffer.length > STATE_BUFFER_SIZE) {
      buffer.shift();
    }

    // 다수결: 버퍼에서 가장 많은 상태가 과반이면 전환
    if (buffer.length >= MAJORITY_THRESHOLD) {
      const counts = new Map<StudyState, number>();
      for (const s of buffer) {
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
      let majorityState: StudyState | null = null;
      let maxCount = 0;
      for (const [state, count] of counts) {
        if (count > maxCount) {
          maxCount = count;
          majorityState = state;
        }
      }
      if (majorityState && maxCount >= MAJORITY_THRESHOLD && lastStateRef.current !== majorityState) {
        lastStateRef.current = majorityState;
        setCurrentState(majorityState);
        onStateChangeRef.current?.(majorityState, result);
      }
    }
    setAnalysisResult(result);
  }, []);

  const detectFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !canvas || !landmarker || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 좌우 반전 (거울 모드)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const now = performance.now();
    const result = landmarker.detectForVideo(video, now);

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];

      // 스켈레톤 오버레이 그리기 (좌우 반전 적용)
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      const drawingUtils = new DrawingUtils(ctx);
      drawingUtils.drawLandmarks(landmarks, {
        radius: 3,
        color: "#00FF00",
        fillColor: "#00FF0088",
      });
      drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
        color: "#00FFFF88",
        lineWidth: 2,
      });
      ctx.restore();

      // 자세 분석
      const analysis = analyzePose(landmarks);
      updateState(analysis.state, analysis);
    } else {
      updateState("AWAY", {
        state: "AWAY",
        confidence: 1,
        details: {
          shoulderTilt: 0,
          headTurnRatio: 0,
          headYOffset: 0,
          headXOffset: 0,
          eyeTilt: 0,
          landmarksVisible: false,
        },
      });
    }

    animFrameRef.current = requestAnimationFrame(detectFrame);
  }, [updateState]);

  const start = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await initCamera();
      await initPoseLandmarker();
      setIsLoading(false);
      setIsRunning(true);
      animFrameRef.current = requestAnimationFrame(detectFrame);
    } catch (e) {
      setIsLoading(false);
      if (e instanceof Error) setError(e.message);
    }
  }, [initCamera, initPoseLandmarker, detectFrame]);

  const stop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    setIsRunning(false);
    setCurrentState("IDLE");
    stateBufferRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }
      landmarkerRef.current?.close();
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isLoading,
    error,
    currentState,
    analysisResult,
    isRunning,
    start,
    stop,
  };
}
