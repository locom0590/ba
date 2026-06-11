const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const scoreElement = document.getElementById('score');

let score = 0;
let balloons = [];
const balloonRadius = 45; // Telefon ekranında rahat dokunabilmek için ideal boyut
const maxBalloons = 5;

// Ekran boyutunu ayarla
function resizeCanvas() {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Balon Oluşturucu
function createBalloon() {
    if (balloons.length >= maxBalloons) return;
    balloons.push({
        x: Math.random() * (canvasElement.width - balloonRadius * 2) + balloonRadius,
        y: canvasElement.height + balloonRadius * 2,
        speed: Math.random() * 1.5 + 1, // Masada takip edebilmek için ideal hız
        color: `hsl(${Math.random() * 360}, 80%, 60%)`
    });
}

// İlk balonları zamanla bırak
for (let i = 0; i < maxBalloons; i++) {
    setTimeout(createBalloon, i * 1200);
}

// Patlatma Kontrolü (Mesafe Bazlı)
function checkCollision(fingerX, fingerY) {
    for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        const dx = fingerX - b.x;
        const dy = fingerY - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < balloonRadius + 15) { // 15 piksel esneklik payı
            balloons.splice(i, 1);
            score++;
            scoreElement.innerText = score;
            createBalloon();
        }
    }
}

// Yapay Zeka Sonuç Döngüsü
function onResults(results) {
    // Sadece balonları çizmek için ekranı temizle (Arka plan şeffaf kalır, kamera görünür)
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Eğer kamera kadrajında el varsa koordinatları hesapla
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            // İşaret Parmağı Ucu (Landmark 8)
            const indexFinger = landmarks[8];
            
            // Arka kamera normal açısında koordinat eşleme
            const fingerX = indexFinger.x * canvasElement.width;
            const fingerY = indexFinger.y * canvasElement.height;

            // Arka planda elin buraya değip değmediğini kontrol et (Ekrana hiçbir şey çizme)
            checkCollision(fingerX, fingerY);
        }
    }

    // Balonları Çiz ve Yukarı Kaydır
    for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        b.y -= b.speed;

        // Balon gövdesi
        canvasCtx.fillStyle = b.color;
        canvasCtx.beginPath();
        canvasCtx.arc(b.x, b.y, balloonRadius, 0, 2 * Math.PI);
        canvasCtx.fill();

        // Balon ipi
        canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        canvasCtx.lineWidth = 2;
        canvasCtx.beginPath();
        canvasCtx.moveTo(b.x, b.y + balloonRadius);
        canvasCtx.lineTo(b.x, b.y + balloonRadius + 30);
        canvasCtx.stroke();

        // Ekrandan uçup giden balonları sil, yenisini yap
        if (b.y < -balloonRadius * 2) {
            balloons.splice(i, 1);
            createBalloon();
        }
    }
}

// MediaPipe Kurulumu
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424515/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0, // En hızlı mobil mod
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
hands.onResults(onResults);

// Arka Kamerayı Başlat
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480,
    facingMode: 'environment' // Kesinlikle Arka Kamera
});
camera.start();
