// HTML elementlerini seç
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const scoreElement = document.getElementById('score');

// Oyun değişkenleri
let score = 0;
let balloons = [];
let fingerPosition = { x: 0, y: 0 };
let isHandPresent = false;

// Balon ayarları
const balloonRadius = 30;
const balloonCount = 5;

// Ekran boyutunu ayarla
canvasElement.width = window.innerWidth;
canvasElement.height = window.innerHeight;

// 1. Balon Oluşturma Fonksiyonu
function createBalloon() {
    balloons.push({
        x: Math.random() * (canvasElement.width - balloonRadius * 2) + balloonRadius,
        y: canvasElement.height + balloonRadius * 2, // Ekranın altından başla
        speed: Math.random() * 2 + 1, // Rastgele hız
        color: `hsl(${Math.random() * 360}, 70%, 60%)` // Rastgele renk
    });
}

// Başlangıçta balonları oluştur
for (let i = 0; i < balloonCount; i++) {
    setTimeout(createBalloon, i * 1000);
}

// 2. Çarpışma Kontrolü (El balona değdi mi?)
function checkCollision(handX, handY) {
    for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        
        // Mesafe hesaplama (Pitagor teorisi)
        const dx = handX - b.x;
        const dy = handY - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Eğer el balona yarıçapından daha yakınsa
        if (distance < balloonRadius) {
            // Balonu patlat!
            balloons.splice(i, 1);
            score++;
            scoreElement.innerText = score;
            // Yeni balon oluştur
            createBalloon();
        }
    }
}

// 3. MediaPipe El Takibi Sonuçlarını İşleme (Asıl Döngü)
function onResults(results) {
    // Canvas'ı temizle
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Gerekirse kamerayı ayna efektiyle çiz (MediaPipe bazen ters verir)
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    
    // Kamerada el var mı?
    isHandPresent = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

    if (isHandPresent) {
        for (const landmarks of results.multiHandLandmarks) {
            // Sadece İşaret Parmağı Ucunu (Tip - Index 8) takip et
            const indexFingerTip = landmarks[8];
            
            // Koordinatları canvas boyutuna çevir (Ayna efektini hesaba kat)
            fingerPosition.x = (1 - indexFingerTip.x) * canvasElement.width;
            fingerPosition.y = indexFingerTip.y * canvasElement.height;

            // Parmak ucuna bir imleç çiz
            canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            canvasCtx.beginPath();
            canvasCtx.arc(fingerPosition.x, fingerPosition.y, 10, 0, 2 * Math.PI);
            canvasCtx.fill();
            
            // Çarpışma kontrolünü yap
            checkCollision(fingerPosition.x, fingerPosition.y);
        }
    }
    
    // Balonları hareket ettir ve çiz
    canvasCtx.restore(); // Çizimi ayna efektinden çıkar
    
    for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        b.y -= b.speed; // Yukarı uçur

        // Balonu çiz
        canvasCtx.fillStyle = b.color;
        canvasCtx.beginPath();
        canvasCtx.arc(b.x, b.y, balloonRadius, 0, 2 * Math.PI);
        canvasCtx.fill();
        
        // Balonun ipini çiz
        canvasCtx.strokeStyle = '#fff';
        canvasCtx.lineWidth = 2;
        canvasCtx.beginPath();
        canvasCtx.moveTo(b.x, b.y + balloonRadius);
        canvasCtx.lineTo(b.x, b.y + balloonRadius + 20);
        canvasCtx.stroke();

        // Ekrandan çıkan balonu sil ve yenisini oluştur
        if (b.y < -balloonRadius * 2) {
            balloons.splice(i, 1);
            createBalloon();
        }
    }
}

// 4. MediaPipe Hands Ayarları
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1, // Sadece 1 el takip et (Performans için)
    modelComplexity: 0, // En düşük hassasiyet (Hız için)
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
hands.onResults(onResults);

// 5. Kamerayı Başlat
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: window.innerWidth,
    height: window.innerHeight,
    facingMode: 'environment' // 'environment' = Arka Kamera, 'user' = Ön Kamera
});
camera.start();
