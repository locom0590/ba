// HTML elementlerini seç
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const scoreElement = document.getElementById('score');

// Oyun değişkenleri
let score = 0;
let balloons = [];
const balloonRadius = 40; // Biraz daha büyük balonlar
const balloonCount = 6;

// Ekran boyutunu ayarla
canvasElement.width = window.innerWidth;
canvasElement.height = window.innerHeight;

// 1. Balon Oluşturma Fonksiyonu
function createBalloon() {
    balloons.push({
        x: Math.random() * (canvasElement.width - balloonRadius * 2) + balloonRadius,
        y: canvasElement.height + balloonRadius * 2,
        speed: Math.random() * 2 + 0.5, // Daha yavaş uçan balonlar
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
    });
}

// Başlangıçta balonları oluştur
for (let i = 0; i < balloonCount; i++) {
    setTimeout(createBalloon, i * 1500);
}

// 2. Çarpışma Kontrolü (El balona değdi mi?)
function checkCollision(handX, handY) {
    for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        
        // Mesafe hesaplama
        const dx = handX - b.x;
        const dy = handY - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Eğer el balona yarıçapından daha yakınsa
        if (distance < balloonRadius) {
            balloons.splice(i, 1);
            score++;
            scoreElement.innerText = score;
            createBalloon();
        }
    }
}

// 3. MediaPipe El Takibi Sonuçlarını İşleme (GÜNCELLENDİ)
function onResults(results) {
    // Canvas'ı temizle (Sadece balonları çizmek için)
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // GÖRÜNÜRLÜK: Artık `results.image`'i (kamerayı) canvas'a çizmiyoruz.
    // Çünkü `video` elementi arka planda (style.css z-index: 1) zaten canlı yayını gösteriyor.
    // Gözünüz canlı kamera görüntüsündeki elinizi görüyor.

    // Kamerada el var mı?
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            
            // Sadece İşaret Parmağı Ucunu (Tip - Index 8) takip et
            const indexFingerTip = landmarks[8];
            
            // Koordinatları canvas boyutuna çevir (Ayna efekti kapalı!)
            const fingerX = indexFingerTip.x * canvasElement.width;
            const fingerY = indexFingerTip.y * canvasElement.height;

            // --- BURASI DEĞİŞTİ ---
            // Önceki kodda buraya kırmızı bir nokta çiziyorduk.
            // Şimdi çizmiyoruz. Eliniz canlı kamera görüntüsünde doğal olarak görünüyor.
            // Sadece elinizin nerede olduğunu hesaplayıp çarpışmayı kontrol ediyoruz.
            
            checkCollision(fingerX, fingerY);
        }
    }
    
    canvasCtx.restore(); // Çizimi ayna efektinden çıkar (zaten kapalı ama güvenli)
    
    // 4. Sadece Balonları Hareket Ettir ve Çiz (Arka plan şeffaf kalıyor)
    for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        b.y -= b.speed;

        canvasCtx.fillStyle = b.color;
        canvasCtx.beginPath();
        canvasCtx.arc(b.x, b.y, balloonRadius, 0, 2 * Math.PI);
        canvasCtx.fill();
        
        canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Şeffaf ip
        canvasCtx.lineWidth = 1;
        canvasCtx.beginPath();
        canvasCtx.moveTo(b.x, b.y + balloonRadius);
        canvasCtx.lineTo(b.x, b.y + balloonRadius + 25);
        canvasCtx.stroke();

        if (b.y < -balloonRadius * 2) {
            balloons.splice(i, 1);
            createBalloon();
        }
    }
}

// 5. MediaPipe Hands Ayarları
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0,
    minDetectionConfidence: 0.6, // Biraz daha hassas el bulma
    minTrackingConfidence: 0.6
});
hands.onResults(onResults);

// 6. Kamerayı Başlat (Arka Kamera)
const camera = new Camera(videoElement, {
    onFrame: async () => {
        // MediaPipe'a görüntüyü gönder (Takip için)
        // Ama MediaPipe'ın çizim yapmasına izin vermiyoruz (onResults içinde)
        await hands.send({image: videoElement});
    },
    width: window.innerWidth,
    height: window.innerHeight,
    facingMode: 'environment' // Arka Kamera
});
camera.start();
