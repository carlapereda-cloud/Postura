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

// --- 2. LÓGICA DE MEDIAPIPE ---

// Esta función se ejecutará CADA VEZ que MediaPipe detecte una postura
function onResults(results) {
  // Limpiamos el canvas antes de dibujar
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Dibujamos la IMAGEN de la cámara en el canvas
  // 'results.image' es la imagen de la cámara
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  // Dibujamos el ESQUELETO (los puntos y líneas)
  if (results.poseLandmarks) {
    // Dibujamos las conexiones (líneas)
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
    // Dibujamos los puntos (landmarks)
    drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });
  }
  canvasCtx.restore();

  // --- 3. AQUÍ VA EL ANÁLISIS DE POSTURA ---
  // Este es el siguiente paso: analizar los 'results.poseLandmarks'
  // (Lo vemos en la sección "Siguiente Nivel")
  if (results.poseLandmarks) {
    // Ejemplo: Obtener la coordenada Y del hombro izquierdo
    // const leftShoulder = results.poseLandmarks[11]; // El punto 11 es el hombro izq.
    // console.log("Hombro Izquierdo (Y):", leftShoulder.y);
  }

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
