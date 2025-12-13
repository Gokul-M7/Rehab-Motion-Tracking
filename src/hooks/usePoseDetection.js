import { useEffect, useRef, useState } from 'react';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

export const usePoseDetection = (videoRef, canvasRef, onResults) => {
  const [isReady, setIsReady] = useState(false);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    // Initialize MediaPipe Pose
    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults((results) => {
      if (results.poseLandmarks) {
        drawPose(canvasRef.current, results);
        onResults(results);
      }
    });

    poseRef.current = pose;

    // Initialize Camera
    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (poseRef.current) {
          await poseRef.current.send({ image: videoRef.current });
        }
      },
      width: 1280,
      height: 720
    });

    camera.start().then(() => setIsReady(true));
    cameraRef.current = camera;

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, [videoRef, canvasRef, onResults]);

  return { isReady };
};

// Draw skeleton on canvas
const drawPose = (canvas, results) => {
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw landmarks
  if (results.poseLandmarks) {
    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
    drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', fillColor: '#FF0000', radius: 6 });
  }

  ctx.restore();
};

// MediaPipe pose connections
const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [17, 19], [19, 15],
  [15, 21], [12, 14], [14, 16], [16, 18], [18, 20], [20, 16], [16, 22],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [27, 29], [29, 31],
  [27, 31], [24, 26], [26, 28], [28, 30], [30, 32], [28, 32]
];

// Helper functions
const drawConnectors = (ctx, landmarks, connections, style) => {
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.lineWidth;
  
  connections.forEach(([i, j]) => {
    const start = landmarks[i];
    const end = landmarks[j];
    if (start && end) {
      ctx.beginPath();
      ctx.moveTo(start.x * ctx.canvas.width, start.y * ctx.canvas.height);
      ctx.lineTo(end.x * ctx.canvas.width, end.y * ctx.canvas.height);
      ctx.stroke();
    }
  });
};

const drawLandmarks = (ctx, landmarks, style) => {
  landmarks.forEach((landmark) => {
    ctx.fillStyle = style.fillColor;
    ctx.beginPath();
    ctx.arc(
      landmark.x * ctx.canvas.width,
      landmark.y * ctx.canvas.height,
      style.radius,
      0,
      2 * Math.PI
    );
    ctx.fill();
  });
};

// Calculate angle between three points
export const calculateAngle = (a, b, c) => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
};

// Extract angles from pose landmarks
export const extractAngles = (landmarks) => {
  if (!landmarks || landmarks.length < 33) return null;

  return {
    leftKnee: calculateAngle(
      landmarks[23], // left hip
      landmarks[25], // left knee
      landmarks[27]  // left ankle
    ),
    rightKnee: calculateAngle(
      landmarks[24], // right hip
      landmarks[26], // right knee
      landmarks[28]  // right ankle
    ),
    leftShoulder: calculateAngle(
      landmarks[11], // left shoulder
      landmarks[13], // left elbow
      landmarks[15]  // left wrist
    ),
    rightShoulder: calculateAngle(
      landmarks[12], // right shoulder
      landmarks[14], // right elbow
      landmarks[16]  // right wrist
    ),
    leftHip: calculateAngle(
      landmarks[11], // left shoulder
      landmarks[23], // left hip
      landmarks[25]  // left knee
    ),
    rightHip: calculateAngle(
      landmarks[12], // right shoulder
      landmarks[24], // right hip
      landmarks[26]  // right knee
    )
  };
};