import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Activity, TrendingUp, Home, Volume2, VolumeX, Play, Square, AlertCircle, CheckCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Exercise configurations
const exercises = {
  squat: {
    name: "Squat",
    description: "Lower your body by bending knees to 90 degrees",
    targetAngles: { knee: [80, 100] },
    readyAngle: 160,
    jointType: 'knee',
    instructions: [
      "Stand with feet shoulder-width apart",
      "Keep your back straight throughout",
      "Bend knees to 90 degrees",
      "Push through heels to stand up"
    ],
    feedback: {
      ready: "Stand up straight. Ready to begin",
      starting: "Good! Start bending your knees",
      tooHigh: "Go lower. Bend your knees more",
      almostThere: "Almost there! A bit more",
      perfect: "Perfect! Hold this position",
      tooLow: "Come up a little bit",
      rising: "Good! Now push back up"
    }
  },
  armRaise: {
    name: "Shoulder Flexion",
    description: "Raise arms forward to shoulder height",
    targetAngles: { shoulder: [80, 100] },
    readyAngle: 160,
    jointType: 'shoulder',
    instructions: [
      "Stand with arms at your sides",
      "Keep arms straight",
      "Raise arms forward slowly",
      "Stop at shoulder height"
    ],
    feedback: {
      ready: "Arms down. Ready to start",
      starting: "Good! Start raising your arms",
      tooHigh: "Lower your arms slightly",
      almostThere: "Almost at shoulder height",
      perfect: "Perfect height! Hold it",
      tooLow: "Raise your arms higher"
    }
  },
  lateralRaise: {
    name: "Lateral Arm Raise",
    description: "Raise arms out to the sides",
    targetAngles: { shoulder: [80, 100] },
    readyAngle: 160,
    jointType: 'shoulder',
    instructions: [
      "Stand with arms at sides",
      "Raise arms out to sides",
      "Keep arms straight",
      "Reach shoulder height"
    ],
    feedback: {
      ready: "Arms at sides. Get ready",
      starting: "Good! Raise arms to sides",
      tooHigh: "Lower your arms a bit",
      almostThere: "Almost there! Keep going",
      perfect: "Perfect! Hold this position",
      tooLow: "Raise your arms higher"
    }
  },
  kneeRaise: {
    name: "Knee Raise",
    description: "Lift knee towards chest",
    targetAngles: { hip: [80, 100] },
    readyAngle: 160,
    jointType: 'hip',
    instructions: [
      "Stand on one leg",
      "Lift opposite knee up",
      "Raise to hip level",
      "Lower slowly"
    ],
    feedback: {
      ready: "Stand on one leg. Ready",
      starting: "Good! Lift your knee up",
      tooHigh: "Lower your knee slightly",
      almostThere: "Almost to hip level",
      perfect: "Perfect! Hold it there",
      tooLow: "Lift your knee higher"
    }
  }
};

// Calculate angle
const calculateAngle = (a, b, c) => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
};

// Extract all angles using MediaPipe Pose
const extractAngles = (landmarks) => {
  if (!landmarks || landmarks.length < 33) return null;
  
  return {
    leftKnee: calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
    rightKnee: calculateAngle(landmarks[24], landmarks[26], landmarks[28]),
    leftShoulder: calculateAngle(landmarks[11], landmarks[13], landmarks[15]),
    rightShoulder: calculateAngle(landmarks[12], landmarks[14], landmarks[16]),
    leftElbow: calculateAngle(landmarks[13], landmarks[15], landmarks[17]),
    rightElbow: calculateAngle(landmarks[14], landmarks[16], landmarks[18]),
    leftHip: calculateAngle(landmarks[11], landmarks[23], landmarks[25]),
    rightHip: calculateAngle(landmarks[12], landmarks[24], landmarks[26]),
    torsoAngle: calculateAngle(landmarks[11], landmarks[23], landmarks[25])
  };
};

// MediaPipe Pose Hook with enhanced skeleton visualization
const useMediaPipePose = (videoRef, canvasRef, isActive, onPoseDetected) => {
  const poseRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const animationFrameRef = useRef(null);
  const processingRef = useRef(false);
  const lastFrameTimeRef = useRef(0);

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;

    let isMounted = true;

    const initializePose = async () => {
      try {
        // Wait for MediaPipe to load with retry logic
        let retries = 0;
        while (typeof window.Pose === 'undefined' && retries < 20) {
          await new Promise(resolve => setTimeout(resolve, 300));
          retries++;
        }

        if (typeof window.Pose === 'undefined') {
          setError('MediaPipe libraries not loaded. Please refresh the page.');
          return;
        }

        const pose = new window.Pose({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          }
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        pose.onResults((results) => {
          if (!isMounted) return;
          
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext('2d');
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.poseLandmarks) {
            // Enhanced skeleton drawing with color-coded joints
            const connections = window.POSE_CONNECTIONS;
            
            // Draw connections with gradient effect
            connections.forEach(([start, end]) => {
              const startPoint = results.poseLandmarks[start];
              const endPoint = results.poseLandmarks[end];
              
              ctx.beginPath();
              ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
              ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
              
              // Color code based on body part
              let color = '#00FF00'; // Default green
              if (start >= 11 && start <= 16 || end >= 11 && end <= 16) {
                color = '#3B82F6'; // Blue for arms
              } else if (start >= 23 && start <= 28 || end >= 23 && end <= 28) {
                color = '#F59E0B'; // Orange for legs
              } else if (start >= 0 && start <= 10 || end >= 0 && end <= 10) {
                color = '#10B981'; // Emerald for torso/head
              }
              
              ctx.strokeStyle = color;
              ctx.lineWidth = 5;
              ctx.lineCap = 'round';
              ctx.stroke();
            });
            
            // Draw landmarks with different sizes for key joints
            results.poseLandmarks.forEach((landmark, index) => {
              const x = landmark.x * canvas.width;
              const y = landmark.y * canvas.height;
              
              // Key joints (shoulders, elbows, hips, knees, ankles)
              const keyJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
              const isKeyJoint = keyJoints.includes(index);
              
              ctx.beginPath();
              ctx.arc(x, y, isKeyJoint ? 8 : 4, 0, 2 * Math.PI);
              
              // Color code joints
              if (index >= 11 && index <= 16) {
                ctx.fillStyle = isKeyJoint ? '#3B82F6' : '#60A5FA';
              } else if (index >= 23 && index <= 28) {
                ctx.fillStyle = isKeyJoint ? '#F59E0B' : '#FCD34D';
              } else {
                ctx.fillStyle = isKeyJoint ? '#10B981' : '#34D399';
              }
              
              ctx.fill();
              
              // Add white border for visibility
              ctx.strokeStyle = 'white';
              ctx.lineWidth = 2;
              ctx.stroke();
            });

            const angles = extractAngles(results.poseLandmarks);
            if (angles && onPoseDetected) {
              onPoseDetected(angles);
            }
          }

          ctx.restore();
          processingRef.current = false;
        });

        poseRef.current = pose;

        // Manual frame processing with throttling
        const processFrame = async () => {
          if (!isMounted || !videoRef.current || !poseRef.current) return;
          
          const now = Date.now();
          const timeSinceLastFrame = now - lastFrameTimeRef.current;
          
          // Process at ~30 FPS (every 33ms) to prevent overload
          if (timeSinceLastFrame >= 33) {
            try {
              if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && !processingRef.current) {
                processingRef.current = true;
                lastFrameTimeRef.current = now;
                await poseRef.current.send({ image: videoRef.current });
              }
            } catch (err) {
              console.error('Frame processing error:', err);
              processingRef.current = false;
            }
          }
          
          animationFrameRef.current = requestAnimationFrame(processFrame);
        };

        // Start processing frames
        setIsReady(true);
        processFrame();

      } catch (err) {
        console.error('MediaPipe error:', err);
        if (isMounted) {
          setError('Failed to initialize pose tracking. Please refresh.');
        }
      }
    };

    initializePose();

    return () => {
      isMounted = false;
      processingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (poseRef.current) {
        try {
          poseRef.current.close();
        } catch (err) {
          console.error('Error closing pose:', err);
        }
      }
    };
  }, [isActive, videoRef, canvasRef, onPoseDetected]);

  return { isReady, error };
};

// Exercise Tracker Component
const ExerciseTracker = ({ exercise, onComplete, voiceEnabled }) => {
  const [reps, setReps] = useState(0);
  const [phase, setPhase] = useState('ready');
  const [feedback, setFeedback] = useState('Position yourself in camera view');
  const [secondaryFeedback, setSecondaryFeedback] = useState('');
  const [accuracy, setAccuracy] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [progress, setProgress] = useState(0);
  const [poseDetected, setPoseDetected] = useState(true);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastPhaseRef = useRef('ready');
  const lastFeedbackRef = useRef('');
  const lastSpeakTimeRef = useRef(0);
  const repInProgressRef = useRef(false);
  const frameCountRef = useRef(0);
  const perfectHoldCountRef = useRef(0);
  const noPoseCountRef = useRef(0);

  const speak = useCallback((text, priority = 'normal') => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    const now = Date.now();
    const timeSinceLastSpeak = now - lastSpeakTimeRef.current;
    
    // More responsive timing
    const delays = { high: 0, normal: 800, low: 1500 };
    const delay = delays[priority] || 800;
    
    if (text !== lastFeedbackRef.current || timeSinceLastSpeak > delay) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15; // Slightly faster, more natural
      utterance.pitch = 1.05; // More enthusiastic
      utterance.volume = 1.0;
      
      // Try to use a more natural voice if available
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Karen')) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;
      
      speechSynthesis.speak(utterance);
      lastSpeakTimeRef.current = now;
      lastFeedbackRef.current = text;
    }
  }, [voiceEnabled]);

  const handlePoseDetected = useCallback((angles) => {
    frameCountRef.current++;
    noPoseCountRef.current = 0;
    setPoseDetected(true);
    
    let jointAngle = 0;
    switch (exercise.jointType) {
      case 'knee':
        jointAngle = Math.min(angles.leftKnee, angles.rightKnee);
        break;
      case 'shoulder':
        jointAngle = Math.max(angles.leftShoulder, angles.rightShoulder);
        break;
      case 'hip':
        jointAngle = Math.min(angles.leftHip, angles.rightHip);
        break;
      default:
        jointAngle = angles.leftKnee;
    }
    
    setCurrentAngle(Math.round(jointAngle));
    
    const [targetMin, targetMax] = exercise.targetAngles[exercise.jointType];
    const readyAngle = exercise.readyAngle;
    
    // Calculate progress (0-100%)
    if (jointAngle < readyAngle) {
      const progressValue = Math.min(100, Math.max(0, 
        ((readyAngle - jointAngle) / (readyAngle - targetMin)) * 100
      ));
      setProgress(Math.round(progressValue));
    } else {
      setProgress(0);
    }
    
    let newPhase = phase;
    let mainFeedback = '';
    let secondFeedback = '';
    
    // Phase detection with more granular feedback
    if (jointAngle >= readyAngle) {
      newPhase = 'ready';
      mainFeedback = exercise.feedback.ready;
      
      if (lastPhaseRef.current === 'perfect' && repInProgressRef.current) {
        setReps(r => r + 1);
        setAccuracy(acc => [...acc, 100]);
        speak('Excellent rep! Keep it up', 'high');
        repInProgressRef.current = false;
        perfectHoldCountRef.current = 0;
      }
      
      if (lastPhaseRef.current !== 'ready' && frameCountRef.current % 60 === 0) {
        speak('Ready for next rep', 'normal');
      }
      
    } else if (jointAngle < readyAngle && jointAngle > targetMax + 20) {
      newPhase = 'descending';
      mainFeedback = exercise.feedback.starting;
      repInProgressRef.current = true;
      
      if (jointAngle > targetMax + 40) {
        secondFeedback = 'Keep going down';
        if (frameCountRef.current % 35 === 0) {
          speak('Good start, keep going', 'low');
        }
      } else {
        secondFeedback = exercise.feedback.almostThere;
        if (frameCountRef.current % 30 === 0) {
          speak('Almost there, little more', 'normal');
        }
      }
      
    } else if (jointAngle > targetMax && jointAngle <= targetMax + 20) {
      newPhase = 'almost';
      mainFeedback = exercise.feedback.almostThere;
      
      if (exercise.jointType === 'knee') {
        secondFeedback = 'A bit deeper';
        if (frameCountRef.current % 25 === 0) {
          speak('Go a bit deeper', 'normal');
        }
      } else if (exercise.jointType === 'shoulder') {
        secondFeedback = 'Raise higher';
        if (frameCountRef.current % 25 === 0) {
          speak('Raise your arms higher', 'normal');
        }
      } else {
        secondFeedback = 'Almost perfect';
      }
      
    } else if (jointAngle >= targetMin && jointAngle <= targetMax) {
      newPhase = 'perfect';
      mainFeedback = exercise.feedback.perfect;
      perfectHoldCountRef.current++;
      
      if (perfectHoldCountRef.current === 15) {
        speak('Perfect form! Hold this', 'high');
        secondFeedback = 'Hold for 2 seconds';
      } else if (perfectHoldCountRef.current === 45) {
        speak('Great! Now come back up', 'high');
      } else if (perfectHoldCountRef.current > 15 && perfectHoldCountRef.current < 45) {
        secondFeedback = 'Holding strong!';
      }
      
    } else if (jointAngle < targetMin) {
      newPhase = 'too_low';
      mainFeedback = exercise.feedback.tooLow;
      secondFeedback = 'Come up slightly';
      
      if (frameCountRef.current % 25 === 0) {
        speak('Too low, come up a bit', 'normal');
      }
    }
    
    // Enhanced form corrections with more specific feedback
    if (exercise.jointType === 'knee') {
      if (angles.torsoAngle < 150) {
        secondFeedback = 'Straighten your back';
        if (frameCountRef.current % 40 === 0) {
          speak('Keep your back straight', 'high');
        }
      }
      
      // Check knee alignment
      const kneeDiff = Math.abs(angles.leftKnee - angles.rightKnee);
      if (kneeDiff > 15 && newPhase !== 'ready') {
        secondFeedback = 'Balance both knees';
        if (frameCountRef.current % 50 === 0) {
          speak('Keep both knees even', 'normal');
        }
      }
    } else if (exercise.jointType === 'shoulder') {
      const avgElbow = (angles.leftElbow + angles.rightElbow) / 2;
      if (avgElbow < 160 && newPhase !== 'ready') {
        secondFeedback = 'Straighten arms';
        if (frameCountRef.current % 40 === 0) {
          speak('Keep your arms straight', 'high');
        }
      }
      
      // Check arm symmetry
      const armDiff = Math.abs(angles.leftShoulder - angles.rightShoulder);
      if (armDiff > 20 && newPhase !== 'ready') {
        secondFeedback = 'Keep arms level';
        if (frameCountRef.current % 50 === 0) {
          speak('Raise both arms evenly', 'normal');
        }
      }
    } else if (exercise.jointType === 'hip') {
      // Balance check for single leg exercises
      if (frameCountRef.current % 60 === 0 && newPhase === 'perfect') {
        speak('Keep your balance', 'low');
      }
    }
    
    lastPhaseRef.current = newPhase;
    setPhase(newPhase);
    setFeedback(mainFeedback);
    setSecondaryFeedback(secondFeedback);
    
  }, [exercise, phase, speak]);

  const { isReady, error } = useMediaPipePose(videoRef, canvasRef, isTracking, handlePoseDetected);

  // Check for no pose detected
  useEffect(() => {
    if (!isTracking) return;
    
    const interval = setInterval(() => {
      noPoseCountRef.current++;
      if (noPoseCountRef.current > 10) { // 10 frames without detection
        setPoseDetected(false);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isTracking]);

  const startTracking = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsTracking(true);
      speak('Starting exercise. Position yourself so I can see your full body. Stand 6 to 8 feet from the camera', 'high');
      setFeedback('Initializing camera...');
    } catch (err) {
      console.error('Camera error:', err);
      setFeedback('❌ Camera access denied');
      speak('Camera access denied');
    }
  };

  const stopTracking = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    
    speechSynthesis.cancel();
    setIsTracking(false);
    
    const avgAccuracy = accuracy.length > 0 
      ? (accuracy.reduce((a, b) => a + b, 0) / accuracy.length).toFixed(1)
      : 0;
    
    speak(`Workout complete. You completed ${reps} repetitions. Great job!`, 'high');
    
    setTimeout(() => {
      onComplete({ 
        reps, 
        avgAccuracy, 
        exercise: exercise.name,
        date: new Date().toISOString()
      });
    }, 2000);
  };

  return (
    <div className="exercise-tracker">
      <div className="video-section">
        <div className="video-container">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="video-feed"
          />
          <canvas 
            ref={canvasRef} 
            width="640" 
            height="480"
            className="pose-canvas"
          />
          
          {!isTracking && (
            <div className="video-placeholder">
              <Camera size={64} />
              <p>Click Start to begin</p>
              <small>Stand 6-8 feet from camera</small>
            </div>
          )}
          
          {error && (
            <div className="error-overlay">
              <AlertCircle size={32} />
              <p>{error}</p>
              <small>Please refresh the page</small>
            </div>
          )}
          
          {isTracking && !poseDetected && (
            <div className="warning-overlay">
              <AlertCircle size={32} />
              <p>⚠️ No pose detected</p>
              <small>Step back and ensure your full body is visible</small>
            </div>
          )}
          
          {isTracking && (
            <>
              <div className="skeleton-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{background: '#10B981'}}></div>
                  <span>Head/Torso</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{background: '#3B82F6'}}></div>
                  <span>Arms</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{background: '#F59E0B'}}></div>
                  <span>Legs</span>
                </div>
              </div>
              
              <div className="feedback-overlay">
                <div className={`feedback-main phase-${phase}`}>
                  {feedback}
                </div>
                {secondaryFeedback && (
                  <div className="feedback-secondary">
                    {secondaryFeedback}
                  </div>
                )}
              </div>
              
              <div className="angle-indicator">
                <div className="angle-circle">
                  <span className="angle-value">{currentAngle}°</span>
                </div>
              </div>
              
              {progress > 0 && progress < 100 && (
                <div className="progress-overlay">
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="progress-text">{progress}%</div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="live-stats-row">
          <div className="stat-box-live">
            <div className="stat-label">Reps</div>
            <div className="stat-value-live">{reps}</div>
          </div>
          <div className="stat-box-live">
            <div className="stat-label">Form</div>
            <div className={`stat-value-live phase-${phase}`}>
              {phase === 'perfect' ? '✓' : phase === 'almost' ? '~' : '•'}
            </div>
          </div>
          <div className="stat-box-live">
            <div className="stat-label">Accuracy</div>
            <div className="stat-value-live">
              {accuracy.length > 0 
                ? Math.round(accuracy.reduce((a, b) => a + b, 0) / accuracy.length)
                : 0}%
            </div>
          </div>
        </div>
      </div>

      <div className="exercise-info">
        <h2>{exercise.name}</h2>
        <p className="description">{exercise.description}</p>
        
        <div className="instructions-box">
          <h4>📋 Instructions</h4>
          <ol>
            {exercise.instructions.map((inst, i) => (
              <li key={i}>{inst}</li>
            ))}
          </ol>
        </div>

        <div className="target-box">
          <h4>🎯 Target Range</h4>
          <div className="target-value">
            {exercise.targetAngles[exercise.jointType][0]}° - 
            {exercise.targetAngles[exercise.jointType][1]}°
          </div>
        </div>

        <div className="controls-box">
          {!isTracking ? (
            <button className="btn-start" onClick={startTracking}>
              <Play size={24} />
              Start Exercise
            </button>
          ) : (
            <button className="btn-stop" onClick={stopTracking}>
              <Square size={24} />
              Stop & Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ sessions }) => {
  const totalReps = sessions.reduce((sum, s) => sum + s.reps, 0);
  const avgAccuracy = sessions.length > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + parseFloat(s.avgAccuracy), 0) / sessions.length)
    : 0;

  const weeklyData = sessions.slice(-7).map((s, i) => ({
    day: new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' }),
    reps: s.reps,
    accuracy: parseFloat(s.avgAccuracy)
  }));

  return (
    <div className="dashboard">
      <h2>📊 Your Progress</h2>
      
      <div className="stats-grid">
        <div className="stat-card-dash">
          <Activity size={32} />
          <div>
            <div className="stat-big">{sessions.length}</div>
            <div className="stat-small">Sessions</div>
          </div>
        </div>
        <div className="stat-card-dash">
          <TrendingUp size={32} />
          <div>
            <div className="stat-big">{totalReps}</div>
            <div className="stat-small">Total Reps</div>
          </div>
        </div>
        <div className="stat-card-dash">
          <CheckCircle size={32} />
          <div>
            <div className="stat-big">{avgAccuracy}%</div>
            <div className="stat-small">Avg Accuracy</div>
          </div>
        </div>
      </div>

      {sessions.length > 0 ? (
        <>
          <div className="chart-section">
            <h3>Weekly Progress</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="reps" stroke="#667eea" strokeWidth={3} />
                <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="recent-list">
            <h3>Recent Sessions</h3>
            {sessions.slice(-5).reverse().map((session, i) => (
              <div key={i} className="session-row">
                <Activity size={20} />
                <div className="session-info">
                  <div className="session-name">{session.exercise}</div>
                  <div className="session-date">
                    {new Date(session.date).toLocaleString()}
                  </div>
                </div>
                <div className="session-badges">
                  <span className="badge">{session.reps} reps</span>
                  <span className="badge">{session.avgAccuracy}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Activity size={64} />
          <h3>No sessions yet</h3>
          <p>Start your first exercise to track progress!</p>
        </div>
      )}
    </div>
  );
};

// Main App
export default function App() {
  const [view, setView] = useState('home');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Load MediaPipe scripts
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    const loadMediaPipe = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
        console.log('MediaPipe loaded successfully');
      } catch (error) {
        console.error('Failed to load MediaPipe:', error);
      }
    };

    loadMediaPipe();
  }, []);

  const handleExerciseComplete = (sessionData) => {
    setSessions(prev => [...prev, { ...sessionData, id: Date.now() }]);
    setView('dashboard');
    setSelectedExercise(null);
  };

  const startExercise = (exerciseKey) => {
    setSelectedExercise(exercises[exerciseKey]);
    setView('exercise');
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <Activity size={28} />
          <span>RehabMotion Pro</span>
        </div>
        <div className="nav-links">
          <button 
            className={view === 'home' ? 'active' : ''} 
            onClick={() => { setView('home'); setSelectedExercise(null); }}
          >
            <Home size={20} /> Home
          </button>
          <button 
            className={view === 'dashboard' ? 'active' : ''} 
            onClick={() => { setView('dashboard'); setSelectedExercise(null); }}
          >
            <TrendingUp size={20} /> Progress
          </button>
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={voiceEnabled ? 'voice-active' : ''}
          >
            {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </nav>

      <main className="main-content">
        {view === 'home' && (
          <div className="home">
            <div className="hero">
              <h1>Virtual Physical Therapy 🏥</h1>
              <p>Real-time coaching with voice guidance</p>
            </div>

            <div className="exercise-grid">
              {Object.keys(exercises).map(key => (
                <div key={key} className="exercise-card" onClick={() => startExercise(key)}>
                  <div className="exercise-icon">
                    <Activity size={40} />
                  </div>
                  <h3>{exercises[key].name}</h3>
                  <p>{exercises[key].description}</p>
                  <button className="btn-card">Start →</button>
                </div>
              ))}
            </div>

            {sessions.length > 0 && (
              <div className="quick-stats">
                <h3>Quick Stats</h3>
                <div className="stats-row-home">
                  <div className="stat-home">
                    <strong>{sessions.length}</strong>
                    <span>Sessions</span>
                  </div>
                  <div className="stat-home">
                    <strong>{sessions.reduce((s, se) => s + se.reps, 0)}</strong>
                    <span>Total Reps</span>
                  </div>
                  <div className="stat-home">
                    <strong>
                      {sessions.length > 0 
                        ? Math.round(sessions.reduce((s, se) => s + parseFloat(se.avgAccuracy), 0) / sessions.length)
                        : 0}%
                    </strong>
                    <span>Accuracy</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'exercise' && selectedExercise && (
          <ExerciseTracker
            exercise={selectedExercise}
            onComplete={handleExerciseComplete}
            voiceEnabled={voiceEnabled}
          />
        )}

        {view === 'dashboard' && <Dashboard sessions={sessions} />}
      </main>

      <style jsx>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .app {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .navbar {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(10px);
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: #667eea;
        }

        .nav-links {
          display: flex;
          gap: 0.5rem;
        }

        .nav-links button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          background: transparent;
          color: #64748b;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 1rem;
          font-weight: 500;
        }

        .nav-links button:hover, .nav-links button.active {
          background: #667eea;
          color: white;
        }

        .nav-links button.voice-active {
          background: #10b981;
          color: white;
        }

        .main-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        .hero {
          text-align: center;
          color: white;
          margin-bottom: 2rem;
        }

        .hero h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        .hero p {
          font-size: 1.1rem;
          opacity: 0.95;
        }

        .exercise-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .exercise-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .exercise-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .exercise-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-bottom: 1rem;
        }

        .exercise-card h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #1e293b;
        }

        .exercise-card p {
          color: #64748b;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .btn-card {
          background: transparent;
          border: 2px solid #667eea;
          color: #667eea;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
          width: 100%;
        }

        .btn-card:hover {
          background: #667eea;
          color: white;
        }

        .quick-stats {
          background: rgba(255, 255, 255, 0.95);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .quick-stats h3 {
          color: #1e293b;
          margin-bottom: 1.5rem;
        }

        .stats-row-home {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .stat-home {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .stat-home strong {
          font-size: 2rem;
          color: #667eea;
        }

        .stat-home span {
          color: #64748b;
          font-size: 0.875rem;
        }

        .exercise-tracker {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 2rem;
        }

        .video-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .video-container {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
          border-radius: 16px;
          overflow: hidden;
          background: #000;
        }

        .video-feed, .pose-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pose-canvas {
          pointer-events: none;
          z-index: 2;
          mix-blend-mode: screen;
          opacity: 0.95;
        }

        .video-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #94a3b8;
          text-align: center;
          padding: 2rem;
        }

        .video-placeholder svg {
          margin-bottom: 1rem;
          opacity: 0.6;
        }

        .video-placeholder small {
          opacity: 0.8;
          margin-top: 0.5rem;
        }

        .skeleton-legend {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(10px);
          padding: 0.75rem;
          border-radius: 8px;
          z-index: 3;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          font-size: 0.75rem;
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
        }

        .error-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(239, 68, 68, 0.95);
          color: white;
          padding: 1.5rem 2rem;
          border-radius: 12px;
          text-align: center;
          z-index: 10;
        }

        .warning-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(245, 158, 11, 0.95);
          color: white;
          padding: 1.5rem 2rem;
          border-radius: 12px;
          text-align: center;
          z-index: 10;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.7; }
        }

        .feedback-overlay {
          position: absolute;
          top: 1rem;
          left: 1rem;
          right: 1rem;
          z-index: 5;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .feedback-main {
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-size: 1.25rem;
          font-weight: 600;
          text-align: center;
          border-left: 4px solid #667eea;
          animation: slideIn 0.3s ease;
        }

        .feedback-main.phase-perfect {
          border-left-color: #10b981;
          background: rgba(16, 185, 129, 0.25);
        }

        .feedback-main.phase-almost {
          border-left-color: #f59e0b;
          background: rgba(245, 158, 11, 0.25);
        }

        .feedback-main.phase-too_low {
          border-left-color: #ef4444;
          background: rgba(239, 68, 68, 0.25);
        }

        .feedback-secondary {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 1rem;
          text-align: center;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .angle-indicator {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          z-index: 5;
        }

        .angle-circle {
          width: 80px;
          height: 80px;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #667eea;
        }

        .angle-value {
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .progress-overlay {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          right: 100px;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .progress-bar-container {
          flex: 1;
          height: 12px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          border-radius: 6px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #10b981 100%);
          border-radius: 6px;
          transition: width 0.3s ease;
        }

        .progress-text {
          color: white;
          font-weight: 700;
          font-size: 1rem;
          background: rgba(0, 0, 0, 0.85);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          min-width: 60px;
          text-align: center;
        }

        .live-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .stat-box-live {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 12px;
          text-align: center;
        }

        .stat-label {
          color: #64748b;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .stat-value-live {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
        }

        .stat-value-live.phase-perfect {
          color: #10b981;
        }

        .stat-value-live.phase-almost {
          color: #f59e0b;
        }

        .stat-value-live.phase-too_low {
          color: #ef4444;
        }

        .exercise-info {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .exercise-info h2 {
          font-size: 2rem;
          color: #1e293b;
        }

        .description {
          color: #64748b;
          line-height: 1.6;
        }

        .instructions-box {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 12px;
        }

        .instructions-box h4 {
          margin-bottom: 1rem;
          color: #1e293b;
        }

        .instructions-box ol {
          padding-left: 1.5rem;
        }

        .instructions-box li {
          margin-bottom: 0.5rem;
          color: #64748b;
          line-height: 1.6;
        }

        .target-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1.5rem;
          border-radius: 12px;
          color: white;
        }

        .target-box h4 {
          margin-bottom: 0.5rem;
        }

        .target-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .controls-box {
          margin-top: auto;
        }

        .btn-start {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 12px;
          cursor: pointer;
          font-size: 1.125rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s;
          width: 100%;
        }

        .btn-start:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-stop {
          background: #ef4444;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 12px;
          cursor: pointer;
          font-size: 1.125rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s;
          width: 100%;
        }

        .btn-stop:hover {
          background: #dc2626;
        }

        .dashboard {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .dashboard h2 {
          font-size: 2rem;
          margin-bottom: 2rem;
          color: #1e293b;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card-dash {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          border-radius: 16px;
          color: white;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-big {
          font-size: 2.5rem;
          font-weight: 700;
        }

        .stat-small {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .chart-section {
          background: #f8fafc;
          padding: 2rem;
          border-radius: 16px;
          margin-bottom: 2rem;
        }

        .chart-section h3 {
          margin-bottom: 1.5rem;
          color: #1e293b;
        }

        .recent-list {
          margin-top: 2rem;
        }

        .recent-list h3 {
          margin-bottom: 1.5rem;
          color: #1e293b;
        }

        .session-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #f8fafc;
          padding: 1rem;
          border-radius: 12px;
          margin-bottom: 0.75rem;
          transition: all 0.3s;
        }

        .session-row:hover {
          background: #e2e8f0;
          transform: translateX(4px);
        }

        .session-info {
          flex: 1;
        }

        .session-name {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }

        .session-date {
          font-size: 0.875rem;
          color: #64748b;
        }

        .session-badges {
          display: flex;
          gap: 0.5rem;
        }

        .badge {
          background: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #667eea;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #64748b;
        }

        .empty-state svg {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin-bottom: 0.5rem;
          color: #1e293b;
        }

        @media (max-width: 1024px) {
          .exercise-tracker {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 1rem;
          }

          .nav-brand span {
            display: none;
          }

          .hero h1 {
            font-size: 2rem;
          }

          .exercise-grid {
            grid-template-columns: 1fr;
          }

          .stats-row-home {
            grid-template-columns: 1fr;
          }

          .live-stats-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}