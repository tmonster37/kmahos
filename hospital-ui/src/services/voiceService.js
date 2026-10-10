// Dịch vụ Phát thanh & Giọng đọc gọi số tự động tại Bệnh viện
// Tích hợp Web Audio API (chuông Ding-Dong) & Web Speech API (Tiếng Việt)

export const playChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return Promise.resolve();

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // First tone (Ding - high pitch 587.33 Hz - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Second tone (Dong - lower pitch 440.00 Hz - A4)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(440.0, now + 0.25);
    gain2.gain.setValueAtTime(0.35, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 1.2);

    return new Promise(resolve => setTimeout(resolve, 1100));
  } catch (err) {
    console.warn("Web Audio API not supported or blocked:", err);
    return Promise.resolve();
  }
};

export const speakPatientCall = async ({ queueCode, queueNumber, patientName, roomName, departmentName, isPriority }) => {
  await playChime();

  if (!('speechSynthesis' in window)) {
    console.warn("Speech Synthesis is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel(); // Dừng câu đang đọc dở nếu có

  let numberSpoken = queueCode || (isPriority ? `Ưu tiên ${queueNumber}` : `số ${queueNumber}`);
  let text = `Xin mời bệnh nhân ${isPriority ? "ưu tiên" : ""} ${patientName || ""}, số thứ tự ${numberSpoken}`;
  if (roomName) {
    text += `, vào phòng ${roomName}`;
  }
  if (departmentName) {
    text += `, khoa ${departmentName}`;
  }
  text += `, để khám bệnh.`;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  utterance.rate = 0.95; // Tốc độ đĩnh đạc, rõ ràng chuẩn y tế
  utterance.pitch = 1.05; // Cao độ nhẹ nhàng, lịch sự

  // Tìm voice tiếng Việt nếu hệ điều hành có sẵn
  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
  if (viVoice) {
    utterance.voice = viVoice;
  }

  window.speechSynthesis.speak(utterance);
};
