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
  
  // Obtenemos el elemento de texto (que añadimos en el HTML)
  const statusEl = document.getElementById('posture-status');

  // Limpiamos el canvas antes de dibujar
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Dibujamos la IMAGEN de la cámara en el canvas
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  // Dibujamos el ESQUELETO (si se detecta)
  if (results.poseLandmarks) {
    // Dibujamos las conexiones (líneas)
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
    // Dibujamos los puntos (landmarks)
    drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });
  

    // --- ¡AQUÍ EMPIEZA NUESTRA NUEVA LÓGICA DE POSTURA! ---

    try {
        const landmarks = results.poseLandmarks;

        // 1. Obtenemos los 3 puntos que necesitamos (del lado izquierdo)
        const leftEar = landmarks[7];     // Oreja
        const leftShoulder = landmarks[11]; // Hombro
        const leftHip = landmarks[23];      // Cadera

        // 2. Verificamos si todos los puntos son "visibles"
        // Si no estás de lado, o muy lejos, la IA podría no verlos.
        const visibilityThreshold = 0.5; // (un 50% de confianza)

        if (leftEar.visibility > visibilityThreshold && 
            leftShoulder.visibility > visibilityThreshold && 
            leftHip.visibility > visibilityThreshold) 
        {
            
            // 3. ¡Calculamos el ángulo!
            // Usamos el hombro (leftShoulder) como el vértice.
            const postureAngle = calculateAngle(leftEar, leftShoulder, leftHip);

            // 4. Analizamos el ángulo y mostramos el mensaje
            if (postureAngle > 165) { // 165 grados es un buen inicio
                statusEl.innerHTML = "POSTURA: CORRECTA";
                statusEl.style.backgroundColor = "rgba(0, 255, 0, 0.5)"; // Verde
            } else {
                statusEl.innerHTML = "POSTURA: INCORRECTA";
                statusEl.style.backgroundColor = "rgba(255, 0, 0, 0.5)"; // Rojo
            }
        
        } else {
            // Si no se ven los puntos, no podemos calcular
            statusEl.innerHTML = "Colócate de lado...";
            statusEl.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // Neutral
        }

    } catch (error) {
        // En caso de que algo falle
        console.error("Error al analizar la postura:", error);
    }
    // --- FIN DE LA NUEVA LÓGICA ---

  } else {
    // Si no se detecta a nadie
    statusEl.innerHTML = "No se detecta a nadie";
    statusEl.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
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
  modelComplexity: 1,      // 0, 1, ó 2. Más alto = más preciso pero más lento.
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


