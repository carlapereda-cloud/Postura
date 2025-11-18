// --- FUNCIÓN DE CÁLCULO DE ÁNGULO ---
function calculateAngle(a, b, c) {
    // a, b, c son objetos con {x, y}
    // b es el "vértice" del ángulo (ej. el hombro)

    // Calcula los radianes
    let radians = Math.atan2(c.y - b.y, c.x - b.x) - 
                  Math.atan2(a.y - b.y, a.x - b.x);
    
    // Convierte a grados
    let angle = Math.abs(radians * 180.0 / Math.PI);

    // El ángulo debe estar entre 0 y 180
    if (angle > 180.0) {
        angle = 360 - angle;
    }

    return angle;
}
// --- 1. CONFIGURACIÓN INICIAL ---

// Obtenemos los elementos del HTML
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

// Esta función se ejecutará CADA VEZ que MediaPipe detecte una postura
function onResults(results) {
  
  // Obtenemos el elemento de texto
  const statusEl = document.getElementById('posture-status');

  // Limpiamos el canvas
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Dibujamos la IMAGEN de la cámara
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  // Verificamos si hay landmarks (puntos del cuerpo)
  if (!results.poseLandmarks) {
    statusEl.innerHTML = "No se detecta a nadie";
    statusEl.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    canvasCtx.restore();
    return; // Salimos de la función si no hay nadie
  }

  // --- SI HAY LANDMARKS, CONTINUAMOS ---

  // Dibujamos el esqueleto
  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
  drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });
  
  // --- LÓGICA DE POSTURA AVANZADA ---
  try {
    const landmarks = results.poseLandmarks;

    // --- 1. OBTENER PUNTOS CLAVE (LADO IZQUIERDO) ---
    // (Usamos el lado izquierdo, asumiendo que la persona está de perfil izquierdo)
    const leftEar = landmarks[7];
    const leftShoulder = landmarks[11];
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];

    // --- 2. VERIFICAR VISIBILIDAD ---
    // Si no podemos ver los puntos clave, no podemos calcular.
    const visibilityThreshold = 0.3;
    if (leftShoulder.visibility < visibilityThreshold || 
        leftHip.visibility < visibilityThreshold || 
        leftKnee.visibility < visibilityThreshold) {
      
      statusEl.innerHTML = "Colócate de lado...";
      statusEl.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      canvasCtx.restore();
      return; // Salimos si no se ven los puntos
    }

    // --- 3. CALCULAR ÁNGULOS ---
    
    // Ángulo de la cadera (para saber si está sentado)
    const angleHip = calculateAngle(leftShoulder, leftHip, leftKnee);
    
    // Ángulo de la rodilla (para saber si está sentado)
    const angleKnee = calculateAngle(leftHip, leftKnee, leftAnkle);
    
    // Ángulo de la espalda (para saber si está encorvado)
    const angleBack = calculateAngle(leftEar, leftShoulder, leftHip);

    
    // --- 4. APLICAR LÓGICA DE ESTADOS (LA CLAVE) ---

    // Umbrales (puedes ajustarlos)
    const sittingHipAngle = 130;  // Ángulo máximo de cadera para "sentado"
    const sittingKneeAngle = 130; // Ángulo máximo de rodilla para "sentado"
    const standingHipAngle = 160; // Ángulo mínimo de cadera para "de pie"
    const standingKneeAngle = 160;// Ángulo mínimo de rodilla para "de pie"
    const goodPostureAngle = 165; // Ángulo mínimo de espalda para "buena postura"

    // Estado 1: ¿Está de pie?
    if (angleHip > standingHipAngle && angleKnee > standingKneeAngle) {
      statusEl.innerHTML = "ESTADO: DE PIE";
      statusEl.style.backgroundColor = "rgba(0, 150, 255, 0.5)"; // Azul

    // Estado 2: ¿Está sentado?
    } else if (angleHip < sittingHipAngle && angleKnee < sittingKneeAngle) {
      // Si está sentado, AHORA SÍ revisamos la espalda
      if (angleBack < goodPostureAngle) {
        statusEl.innerHTML = "POSTURA: INCORRECTA (Encorvado)";
        statusEl.style.backgroundColor = "rgba(255, 0, 0, 0.5)"; // Rojo
      } else {
        statusEl.innerHTML = "POSTURA: CORRECTA";
        statusEl.style.backgroundColor = "rgba(0, 255, 0, 0.5)"; // Verde
      }
    
    // Estado 3: Ni sentado ni de pie (en transición)
    } else {
      statusEl.innerHTML = "ESTADO: Transición...";
      statusEl.style.backgroundColor = "rgba(128, 128, 128, 0.5)"; // Gris
    }

  } catch (error) {
    console.error("Error al analizar la postura:", error);
    statusEl.innerHTML = "Error de cálculo";
  }
  
  canvasCtx.restore();
}
// --- 4. INICIALIZAR MEDIAPIPE ---

// Creamos una nueva instancia del detector de postura
const pose = new Pose({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});

// Configuramos las opciones del detector
pose.setOptions({
  modelComplexity: 2,      // 0, 1, ó 2. Más alto = más preciso pero más lento.
  smoothLandmarks: true,   // Suaviza el movimiento de los puntos
  enableSegmentation: false, // Nosotros no necesitamos esto
  minDetectionConfidence: 0.5, // Confianza mínima para detectar una persona
  minTrackingConfidence: 0.5   // Confianza mínima para seguir a la persona
});

// Le decimos a MediaPipe que use nuestra función 'onResults'
pose.onResults(onResults);

// --- 5. INICIALIZAR LA CÁMARA ---

// Usamos la utilidad de cámara de MediaPipe para manejar la webcam
const camera = new Camera(videoElement, {
  onFrame: async () => {
    // Cada vez que la cámara tiene un nuevo fotograma, 
    // se lo enviamos a MediaPipe para que lo analice.
    await pose.send({image: videoElement});
  },
  width: 1280,
  height: 720
});

// Iniciamos la cámara

camera.start();





