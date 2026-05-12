// Global variables for AR application
let video;          // Video element for camera feed
let canvas;         // Canvas for drawing AR effects
let ctx;            // Canvas context for drawing
let faceMesh;       // MediaPipe Face Mesh instance
let isARActive = false;     // Tracks if AR is currently running
let camera;         // Camera instance
let bgMusic;        // Background music element
let isMusicPlaying = false; // Tracks music state
let isFrontCamera = true;  // Tracks camera direction
let animationFrame = 0; // For animations
let currentMask = 'ironMan'; // Current active mask

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get references to HTML elements
    video = document.getElementById('camera');
    canvas = document.getElementById('overlay');
    ctx = canvas.getContext('2d');
    bgMusic = document.getElementById('bgMusic');

    // Set up event listeners for controls
    document.getElementById('startAR').addEventListener('click', startAR);
    document.getElementById('exitAR').addEventListener('click', stopAR);
    document.getElementById('toggleMusic').addEventListener('click', toggleMusic);
    document.getElementById('takePhoto').addEventListener('click', takePhoto);
    document.getElementById('toggleCamera').addEventListener('click', toggleCamera);

    // Set up mask switching
    document.getElementById('ironManMask').addEventListener('click', () => switchMask('ironMan'));
    document.getElementById('batmanMask').addEventListener('click', () => switchMask('batman'));
    document.getElementById('spiderManMask').addEventListener('click', () => switchMask('spiderMan'));
    document.getElementById('shakthiManMask').addEventListener('click', () => switchMask('shakthiMan'));

    // Initialize MediaPipe Face Mesh
    faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });

    // Configure face mesh options
    faceMesh.setOptions({
        maxNumFaces: 1,          // Track only one face
        refineLandmarks: true,   // Use refined landmarks
        minDetectionConfidence: 0.5,  // Minimum confidence for detection
        minTrackingConfidence: 0.5    // Minimum confidence for tracking
    });

    // Set up callback for face mesh results
    faceMesh.onResults(onResults);
});

/**
 * Switches between different masks
 */
function switchMask(maskType) {
    currentMask = maskType;
    
    // Update button states
    const buttons = document.querySelectorAll('.mask-button');
    buttons.forEach(button => button.classList.remove('active'));
    document.getElementById(`${maskType}Mask`).classList.add('active');
}

/**
 * Starts the AR experience by accessing the camera
 */
async function startAR() {
    try {
        // Request camera access with specified constraints
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: isFrontCamera ? 'user' : 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        // Set up video stream
        video.srcObject = stream;
        await video.play();
        
        // Show AR view and start face detection
        document.getElementById('arView').classList.remove('hidden');
        isARActive = true;
        detectFace();
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Could not access the camera. Please make sure you have granted camera permissions.');
    }
}

/**
 * Toggles between front and back cameras
 */
async function toggleCamera() {
    isFrontCamera = !isFrontCamera;
    if (isARActive) {
        stopAR();
        await startAR();
    }
}

/**
 * Captures the current AR view as a photo
 */
function takePhoto() {
    if (!isARActive) return;

    // Create a temporary canvas to combine video and overlay
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw the video frame and overlay
    tempCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
    tempCtx.drawImage(canvas, 0, 0);

    // Download the combined image
    const link = document.createElement('a');
    link.download = 'ar-photo.png';
    link.href = tempCanvas.toDataURL();
    link.click();
}

/**
 * Stops the AR experience and cleans up resources
 */
function stopAR() {
    // Stop camera and clear video stream
    if (camera) {
        camera.stop();
        camera = null;
    }
    if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }

    // Stop music and reset UI
    if (isMusicPlaying) {
        bgMusic.pause();
        isMusicPlaying = false;
        document.getElementById('toggleMusic').classList.remove('playing');
    }
    document.getElementById('arView').classList.add('hidden');
    isARActive = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Toggles background music playback
 */
function toggleMusic() {
    const musicButton = document.getElementById('toggleMusic');
    if (isMusicPlaying) {
        bgMusic.pause();
        musicButton.textContent = '🔊';
        musicButton.classList.remove('playing');
    } else {
        bgMusic.play().catch(error => {
            console.log('Error playing music:', error);
        });
        musicButton.textContent = '🔇';
        musicButton.classList.add('playing');
    }
    isMusicPlaying = !isMusicPlaying;
}

/**
 * Sets up face detection using MediaPipe
 */
function detectFace() {
    if (!isARActive) return;

    // Initialize camera with face detection
    camera = new Camera(video, {
        onFrame: async () => {
            if (isARActive && video.readyState === 4) {
                await faceMesh.send({image: video});
            }
        },
        width: 1280,
        height: 720
    });
    camera.start();
}

/**
 * Processes face tracking results and draws AR effects
 */
function onResults(results) {
    if (!isARActive) return;

    // Update canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Process detected faces
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        for (const landmarks of results.multiFaceLandmarks) {
            // Draw the selected mask
            switch(currentMask) {
                case 'ironMan':
                    drawIronManMask(landmarks);
                    break;
                case 'batman':
                    drawBatmanMask(landmarks);
                    break;
                case 'spiderMan':
                    drawSpiderManMask(landmarks);
                    break;
                case 'shakthiMan':
                    drawShakthiManMask(landmarks);
                    break;
            }
        }
    }

    // Update animation frame
    animationFrame = (animationFrame + 1) % 60;
}

/**
 * Draws the Iron Man mask on the face
 */
function drawIronManMask(landmarks) {
    // Get key facial landmarks for mask placement
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const nose = landmarks[1];
    const leftMouth = landmarks[61];
    const rightMouth = landmarks[291];
    const chin = landmarks[152];
    const leftTemple = landmarks[234];
    const rightTemple = landmarks[454];
    const forehead = landmarks[10];

    // Calculate face dimensions for proper scaling
    const faceWidth = Math.hypot(
        (rightTemple.x - leftTemple.x) * canvas.width,
        (rightTemple.y - leftTemple.y) * canvas.height
    ) * 1.5;

    const faceHeight = Math.hypot(
        (nose.x - chin.x) * canvas.width,
        (nose.y - chin.y) * canvas.height
    ) * 2.2;

    // Draw the main mask (red part)
    ctx.beginPath();
    ctx.moveTo(leftTemple.x * canvas.width, forehead.y * canvas.height);
    ctx.lineTo(rightTemple.x * canvas.width, forehead.y * canvas.height);
    ctx.lineTo(rightMouth.x * canvas.width, rightMouth.y * canvas.height);
    ctx.lineTo(leftMouth.x * canvas.width, leftMouth.y * canvas.height);
    ctx.closePath();
    ctx.fillStyle = '#FF0000'; // Iron Man red
    ctx.fill();

    // Draw the gold trim
    ctx.strokeStyle = '#FFD700'; // Gold color
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw the eyes (white part with angular shape)
    const eyeWidth = faceWidth * 0.15;
    const eyeHeight = faceWidth * 0.08;

    // Left eye
    ctx.beginPath();
    ctx.moveTo(
        leftEye.x * canvas.width - eyeWidth,
        leftEye.y * canvas.height - eyeHeight
    );
    ctx.lineTo(
        leftEye.x * canvas.width + eyeWidth,
        leftEye.y * canvas.height - eyeHeight
    );
    ctx.lineTo(
        leftEye.x * canvas.width + eyeWidth * 0.5,
        leftEye.y * canvas.height + eyeHeight
    );
    ctx.lineTo(
        leftEye.x * canvas.width - eyeWidth * 0.5,
        leftEye.y * canvas.height + eyeHeight
    );
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.moveTo(
        rightEye.x * canvas.width - eyeWidth,
        rightEye.y * canvas.height - eyeHeight
    );
    ctx.lineTo(
        rightEye.x * canvas.width + eyeWidth,
        rightEye.y * canvas.height - eyeHeight
    );
    ctx.lineTo(
        rightEye.x * canvas.width + eyeWidth * 0.5,
        rightEye.y * canvas.height + eyeHeight
    );
    ctx.lineTo(
        rightEye.x * canvas.width - eyeWidth * 0.5,
        rightEye.y * canvas.height + eyeHeight
    );
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Draw the arc reactor (chest piece)
    const reactorSize = faceWidth * 0.2;
    const reactorX = (leftTemple.x + rightTemple.x) * canvas.width / 2;
    const reactorY = (leftMouth.y + chin.y) * canvas.height / 2;

    // Outer ring
    ctx.beginPath();
    ctx.arc(reactorX, reactorY, reactorSize, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();

    // Inner ring
    ctx.beginPath();
    ctx.arc(reactorX, reactorY, reactorSize * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = '#FF0000';
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(reactorX, reactorY, reactorSize * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#00FFFF';
    ctx.fill();

    // Add pulsing effect to the arc reactor
    const pulseSize = Math.sin(animationFrame * 0.1) * 0.1 + 0.9;
    ctx.beginPath();
    ctx.arc(reactorX, reactorY, reactorSize * 0.4 * pulseSize, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.fill();

    // Draw the faceplate details
    // Gold lines around the eyes
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;

    // Left eye trim
    ctx.beginPath();
    ctx.moveTo(
        leftEye.x * canvas.width - eyeWidth * 1.2,
        leftEye.y * canvas.height - eyeHeight * 1.2
    );
    ctx.lineTo(
        leftEye.x * canvas.width + eyeWidth * 1.2,
        leftEye.y * canvas.height - eyeHeight * 1.2
    );
    ctx.lineTo(
        leftEye.x * canvas.width + eyeWidth * 0.6,
        leftEye.y * canvas.height + eyeHeight * 1.2
    );
    ctx.lineTo(
        leftEye.x * canvas.width - eyeWidth * 0.6,
        leftEye.y * canvas.height + eyeHeight * 1.2
    );
    ctx.closePath();
    ctx.stroke();

    // Right eye trim
    ctx.beginPath();
    ctx.moveTo(
        rightEye.x * canvas.width - eyeWidth * 1.2,
        rightEye.y * canvas.height - eyeHeight * 1.2
    );
    ctx.lineTo(
        rightEye.x * canvas.width + eyeWidth * 1.2,
        rightEye.y * canvas.height - eyeHeight * 1.2
    );
    ctx.lineTo(
        rightEye.x * canvas.width + eyeWidth * 0.6,
        rightEye.y * canvas.height + eyeHeight * 1.2
    );
    ctx.lineTo(
        rightEye.x * canvas.width - eyeWidth * 0.6,
        rightEye.y * canvas.height + eyeHeight * 1.2
    );
    ctx.closePath();
    ctx.stroke();
}

/**
 * Draws the Batman mask on the face
 */
function drawBatmanMask(landmarks) {
    // Get key facial landmarks for mask placement
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const nose = landmarks[1];
    const leftMouth = landmarks[61];
    const rightMouth = landmarks[291];
    const chin = landmarks[152];
    const leftTemple = landmarks[234];
    const rightTemple = landmarks[454];
    const forehead = landmarks[10];

    // Calculate face dimensions for proper scaling
    const faceWidth = Math.hypot(
        (rightTemple.x - leftTemple.x) * canvas.width,
        (rightTemple.y - leftTemple.y) * canvas.height
    ) * 1.5;

    // Draw the main mask (black part)
    ctx.beginPath();
    ctx.moveTo(leftTemple.x * canvas.width, forehead.y * canvas.height);
    ctx.lineTo(rightTemple.x * canvas.width, forehead.y * canvas.height);
    ctx.lineTo(rightMouth.x * canvas.width, rightMouth.y * canvas.height);
    ctx.lineTo(leftMouth.x * canvas.width, leftMouth.y * canvas.height);
    ctx.closePath();
    ctx.fillStyle = '#000000'; // Batman black
    ctx.fill();

    // Draw the bat ears
    const earHeight = faceWidth * 0.4;
    const earWidth = faceWidth * 0.15;

    // Left ear
    ctx.beginPath();
    ctx.moveTo(leftTemple.x * canvas.width, forehead.y * canvas.height);
    ctx.lineTo(leftTemple.x * canvas.width - earWidth, forehead.y * canvas.height - earHeight);
    ctx.lineTo(leftTemple.x * canvas.width + earWidth, forehead.y * canvas.height - earHeight/2);
    ctx.closePath();
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Right ear
    ctx.beginPath();
    ctx.moveTo(rightTemple.x * canvas.width, forehead.y * canvas.height);
    ctx.lineTo(rightTemple.x * canvas.width + earWidth, forehead.y * canvas.height - earHeight);
    ctx.lineTo(rightTemple.x * canvas.width - earWidth, forehead.y * canvas.height - earHeight/2);
    ctx.closePath();
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Draw the eyes (white part)
    const eyeWidth = faceWidth * 0.15;
    const eyeHeight = faceWidth * 0.08;

    // Left eye
    ctx.beginPath();
    ctx.ellipse(
        leftEye.x * canvas.width,
        leftEye.y * canvas.height,
        eyeWidth,
        eyeHeight,
        0,
        0,
        Math.PI * 2
    );
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.ellipse(
        rightEye.x * canvas.width,
        rightEye.y * canvas.height,
        eyeWidth,
        eyeHeight,
        0,
        0,
        Math.PI * 2
    );
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Draw the bat symbol
    const symbolSize = faceWidth * 0.3;
    const symbolX = (leftTemple.x + rightTemple.x) * canvas.width / 2;
    const symbolY = (forehead.y + nose.y) * canvas.height / 2;

    ctx.beginPath();
    ctx.moveTo(symbolX, symbolY - symbolSize/2);
    ctx.lineTo(symbolX - symbolSize/2, symbolY);
    ctx.lineTo(symbolX, symbolY + symbolSize/2);
    ctx.lineTo(symbolX + symbolSize/2, symbolY);
    ctx.closePath();
    ctx.fillStyle = '#FFFF00'; // Yellow bat symbol
    ctx.fill();
}

/**
 * Draws the Spider-Man mask on the face
 */
function drawSpiderManMask(landmarks) {
    // Get key facial landmarks for mask placement
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const nose = landmarks[1];
    const leftMouth = landmarks[61];
    const rightMouth = landmarks[291];
    const chin = landmarks[152];
    const leftTemple = landmarks[234];
    const rightTemple = landmarks[454];
    const forehead = landmarks[10];

    // Calculate face dimensions for proper scaling
    const faceWidth = Math.hypot(
        (rightTemple.x - leftTemple.x) * canvas.width,
        (rightTemple.y - leftTemple.y) * canvas.height
    ) * 1.5;

    // Draw the main mask (red part)
    ctx.beginPath();
    ctx.moveTo(leftTemple.x * canvas.width, forehead.y * canvas.height);
    ctx.lineTo(rightTemple.x * canvas.width, forehead.y * canvas.height);
    ctx.lineTo(rightMouth.x * canvas.width, rightMouth.y * canvas.height);
    ctx.lineTo(leftMouth.x * canvas.width, leftMouth.y * canvas.height);
    ctx.closePath();
    ctx.fillStyle = '#FF0000'; // Spider-Man red
    ctx.fill();

    // Draw the web pattern
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    // Draw web lines
    const webSpacing = faceWidth * 0.2;
    const centerX = (leftTemple.x + rightTemple.x) * canvas.width / 2;
    const centerY = (forehead.y + nose.y) * canvas.height / 2;

    // Vertical lines
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX + i * webSpacing, forehead.y * canvas.height);
        ctx.lineTo(centerX + i * webSpacing, chin.y * canvas.height);
        ctx.stroke();
    }

    // Horizontal lines
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(leftTemple.x * canvas.width, centerY + i * webSpacing);
        ctx.lineTo(rightTemple.x * canvas.width, centerY + i * webSpacing);
        ctx.stroke();
    }

    // Draw the eyes (white part with web pattern)
    const eyeWidth = faceWidth * 0.15;
    const eyeHeight = faceWidth * 0.08;

    // Left eye
    ctx.beginPath();
    ctx.ellipse(
        leftEye.x * canvas.width,
        leftEye.y * canvas.height,
        eyeWidth,
        eyeHeight,
        0,
        0,
        Math.PI * 2
    );
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.ellipse(
        rightEye.x * canvas.width,
        rightEye.y * canvas.height,
        eyeWidth,
        eyeHeight,
        0,
        0,
        Math.PI * 2
    );
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Draw web pattern on eyes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;

    // Left eye web
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(
            leftEye.x * canvas.width - eyeWidth,
            leftEye.y * canvas.height - eyeHeight + i * eyeHeight
        );
        ctx.lineTo(
            leftEye.x * canvas.width + eyeWidth,
            leftEye.y * canvas.height - eyeHeight + i * eyeHeight
        );
        ctx.stroke();
    }

    // Right eye web
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(
            rightEye.x * canvas.width - eyeWidth,
            rightEye.y * canvas.height - eyeHeight + i * eyeHeight
        );
        ctx.lineTo(
            rightEye.x * canvas.width + eyeWidth,
            rightEye.y * canvas.height - eyeHeight + i * eyeHeight
        );
        ctx.stroke();
    }
}

/**
 * Draws the Shakthi Man mask on the face
 */
function drawShakthiManMask(landmarks) {
    // Get key facial landmarks for mask placement
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const nose = landmarks[1];
    const leftMouth = landmarks[61];
    const rightMouth = landmarks[291];
    const chin = landmarks[152];
    const leftTemple = landmarks[234];
    const rightTemple = landmarks[454];
    const forehead = landmarks[10];

    // Calculate face dimensions for proper scaling
    const faceWidth = Math.hypot(
        (rightTemple.x - leftTemple.x) * canvas.width,
        (rightTemple.y - leftTemple.y) * canvas.height
    ) * 1.5;

    const faceHeight = Math.hypot(
        (nose.x - chin.x) * canvas.width,
        (nose.y - chin.y) * canvas.height
    ) * 2.2;

    // Draw the main mask (blue part)
    ctx.beginPath();
    ctx.moveTo(leftTemple.x * canvas.width, forehead.y * canvas.height);
    ctx.lineTo(rightTemple.x * canvas.width, forehead.y * canvas.height);
    ctx.lineTo(rightMouth.x * canvas.width, rightMouth.y * canvas.height);
    ctx.lineTo(leftMouth.x * canvas.width, leftMouth.y * canvas.height);
    ctx.closePath();
    ctx.fillStyle = '#0000FF'; // Shakthi Man blue
    ctx.fill();

    // Draw the eyes (white part)
    const eyeWidth = faceWidth * 0.15;
    const eyeHeight = faceWidth * 0.08;

    // Left eye
    ctx.beginPath();
    ctx.ellipse(
        leftEye.x * canvas.width,
        leftEye.y * canvas.height,
        eyeWidth,
        eyeHeight,
        0,
        0,
        Math.PI * 2
    );
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.ellipse(
        rightEye.x * canvas.width,
        rightEye.y * canvas.height,
        eyeWidth,
        eyeHeight,
        0,
        0,
        Math.PI * 2
    );
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Draw the lightning bolt symbol
    const boltSize = faceWidth * 0.3;
    const boltX = (leftTemple.x + rightTemple.x) * canvas.width / 2;
    const boltY = (forehead.y + nose.y) * canvas.height / 2;

    ctx.beginPath();
    ctx.moveTo(boltX, boltY - boltSize/2);
    ctx.lineTo(boltX + boltSize/4, boltY);
    ctx.lineTo(boltX - boltSize/4, boltY + boltSize/4);
    ctx.lineTo(boltX + boltSize/4, boltY + boltSize/2);
    ctx.lineTo(boltX, boltY + boltSize/4);
    ctx.lineTo(boltX + boltSize/4, boltY);
    ctx.closePath();
    ctx.fillStyle = '#FFFF00'; // Yellow lightning bolt
    ctx.fill();

    // Add glowing effect to the lightning bolt
    const glowSize = Math.sin(animationFrame * 0.1) * 5 + 10;
    ctx.beginPath();
    ctx.arc(boltX, boltY, glowSize, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.fill();
}

/**
 * Draws a particle effect at the specified position
 */
function drawParticle(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
}

function drawJewelNecklace(landmarks) {
    // Get key points for necklace placement
    const leftShoulder = landmarks[234]; // Left temple as shoulder reference
    const rightShoulder = landmarks[454]; // Right temple as shoulder reference
    const neck = landmarks[152]; // Chin as neck reference

    // Calculate necklace dimensions
    const necklaceWidth = Math.hypot(
        (rightShoulder.x - leftShoulder.x) * canvas.width,
        (rightShoulder.y - leftShoulder.y) * canvas.height
    ) * 1.2;

    const necklaceHeight = Math.hypot(
        (neck.x - leftShoulder.x) * canvas.width,
        (neck.y - leftShoulder.y) * canvas.height
    ) * 0.3;

    // Calculate necklace position
    const necklaceX = (leftShoulder.x + rightShoulder.x) * canvas.width / 2 - necklaceWidth / 2;
    const necklaceY = neck.y * canvas.height;

    // Draw the necklace chain
    ctx.beginPath();
    ctx.moveTo(necklaceX, necklaceY);
    ctx.quadraticCurveTo(
        necklaceX + necklaceWidth / 2,
        necklaceY + necklaceHeight,
        necklaceX + necklaceWidth,
        necklaceY
    );
    ctx.strokeStyle = '#FFD700'; // Gold color
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw jewels
    const numJewels = 5;
    const jewelColors = ['#FF0000', '#0000FF', '#00FF00', '#FF00FF', '#00FFFF'];
    const jewelSize = necklaceWidth * 0.08;

    for (let i = 0; i < numJewels; i++) {
        const t = i / (numJewels - 1);
        const jewelX = necklaceX + necklaceWidth * t;
        const jewelY = necklaceY + necklaceHeight * Math.sin(t * Math.PI);

        // Draw jewel
        ctx.beginPath();
        ctx.arc(jewelX, jewelY, jewelSize, 0, Math.PI * 2);
        ctx.fillStyle = jewelColors[i];
        ctx.fill();

        // Add sparkle effect
        const sparkleSize = jewelSize * 0.3;
        const sparkleAngle = animationFrame * 0.1 + i * Math.PI / 2;
        
        ctx.beginPath();
        ctx.arc(
            jewelX + Math.cos(sparkleAngle) * jewelSize * 0.5,
            jewelY + Math.sin(sparkleAngle) * jewelSize * 0.5,
            sparkleSize,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
    }
}

function drawDancingTeddy(landmarks) {
    // Get reference points for positioning
    const leftShoulder = landmarks[234]; // Left temple as shoulder reference
    const rightShoulder = landmarks[454]; // Right temple as shoulder reference
    const neck = landmarks[152]; // Chin as neck reference
    const forehead = landmarks[10]; // Forehead reference

    // Calculate teddy bear position (behind the head)
    const centerX = (leftShoulder.x + rightShoulder.x) * canvas.width / 2;
    // Position the teddy behind the head, using forehead as reference
    const centerY = forehead.y * canvas.height;

    // Calculate teddy bear size based on face width
    const faceWidth = Math.hypot(
        (rightShoulder.x - leftShoulder.x) * canvas.width,
        (rightShoulder.y - leftShoulder.y) * canvas.height
    );
    const teddySize = faceWidth * 0.6; // Slightly smaller to fit behind

    // Dancing animation
    const danceOffset = Math.sin(animationFrame * 0.2) * 5; // Reduced bounce
    const armWave = Math.sin(animationFrame * 0.3) * 10;
    const legWave = Math.sin(animationFrame * 0.25) * 8;

    // Draw teddy bear body (slightly transparent to show it's behind)
    ctx.globalAlpha = 0.8;
    
    // Draw teddy bear body
    ctx.beginPath();
    ctx.arc(centerX, centerY + danceOffset, teddySize * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#8B4513'; // Brown color
    ctx.fill();

    // Draw teddy bear head
    ctx.beginPath();
    ctx.arc(centerX, centerY - teddySize * 0.2 + danceOffset, teddySize * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#8B4513';
    ctx.fill();

    // Draw ears
    const earSize = teddySize * 0.15;
    // Left ear
    ctx.beginPath();
    ctx.arc(centerX - teddySize * 0.2, centerY - teddySize * 0.4 + danceOffset, earSize, 0, Math.PI * 2);
    ctx.fillStyle = '#8B4513';
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.arc(centerX + teddySize * 0.2, centerY - teddySize * 0.4 + danceOffset, earSize, 0, Math.PI * 2);
    ctx.fillStyle = '#8B4513';
    ctx.fill();

    // Draw face
    // Eyes
    ctx.beginPath();
    ctx.arc(centerX - teddySize * 0.1, centerY - teddySize * 0.25 + danceOffset, teddySize * 0.05, 0, Math.PI * 2);
    ctx.arc(centerX + teddySize * 0.1, centerY - teddySize * 0.25 + danceOffset, teddySize * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Nose
    ctx.beginPath();
    ctx.arc(centerX, centerY - teddySize * 0.15 + danceOffset, teddySize * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Draw arms
    // Left arm
    ctx.beginPath();
    ctx.moveTo(centerX - teddySize * 0.4, centerY + danceOffset);
    ctx.lineTo(centerX - teddySize * 0.6, centerY + teddySize * 0.2 + armWave + danceOffset);
    ctx.lineWidth = teddySize * 0.1;
    ctx.strokeStyle = '#8B4513';
    ctx.stroke();

    // Right arm
    ctx.beginPath();
    ctx.moveTo(centerX + teddySize * 0.4, centerY + danceOffset);
    ctx.lineTo(centerX + teddySize * 0.6, centerY + teddySize * 0.2 - armWave + danceOffset);
    ctx.lineWidth = teddySize * 0.1;
    ctx.strokeStyle = '#8B4513';
    ctx.stroke();

    // Draw legs
    // Left leg
    ctx.beginPath();
    ctx.moveTo(centerX - teddySize * 0.2, centerY + teddySize * 0.4 + danceOffset);
    ctx.lineTo(centerX - teddySize * 0.3, centerY + teddySize * 0.7 + legWave + danceOffset);
    ctx.lineWidth = teddySize * 0.1;
    ctx.strokeStyle = '#8B4513';
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(centerX + teddySize * 0.2, centerY + teddySize * 0.4 + danceOffset);
    ctx.lineTo(centerX + teddySize * 0.3, centerY + teddySize * 0.7 - legWave + danceOffset);
    ctx.lineWidth = teddySize * 0.1;
    ctx.strokeStyle = '#8B4513';
    ctx.stroke();

    // Add some sparkles around the teddy
    for (let i = 0; i < 5; i++) {
        const angle = (animationFrame * 0.1 + i * Math.PI * 2 / 5) % (Math.PI * 2);
        const sparkleX = centerX + Math.cos(angle) * teddySize * 0.8;
        const sparkleY = centerY + Math.sin(angle) * teddySize * 0.8 + danceOffset;
        drawParticle(sparkleX, sparkleY, teddySize * 0.05);
    }

    // Reset transparency
    ctx.globalAlpha = 1.0;
} 
