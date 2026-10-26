/**
 * EchoNotch — AI Acoustic Tinnitus & Sensory Overload Live DSP Shield
 * Built with the Devpost Learn Skill Pack workflow (scope.md -> prd.md -> spec.md)
 */

const PRESETS = {
  tinnitus_hvac: {
    title: "Left-Ear High-Tonal Notch + HVAC Cut",
    symptomText:
      "High-pitched ringing in my left ear around 6200 Hz combined with a low 110 Hz air-conditioner hum. Need calm, zero-fatigue focus for coding.",
    centerFreq: 6200,
    octaveWidth: 1.0,
    noiseType: "brown",
    highpassFreq: 120,
    binauralBeat: 14,
    rationale:
      "Carving a 1.0-octave spectral canyon between 4,384 Hz and 8,768 Hz removes acoustic energy at your 6,200 Hz tinnitus pitch while stimulating adjacent cochlear hair cells—driving lateral inhibition in the auditory cortex. A 120 Hz high-pass filter strips out low-frequency HVAC compressor fatigue."
  },
  office_overload: {
    title: "Open-Office Speech Mask + 4.1 kHz Notch",
    symptomText:
      "Mid-high 4100 Hz ringing from headphone fatigue plus distracting open-office conversation chatter around me. Need balanced vocal masking.",
    centerFreq: 4100,
    octaveWidth: 1.0,
    noiseType: "pink",
    highpassFreq: 90,
    binauralBeat: 10,
    rationale:
      "Pink noise (1/f spectrum) matches human vocal formants to mask surrounding speech, while a dual-stage notch centered at 4,100 Hz prevents aggravation of noise-induced cochlear sensitivity. Paired with 10 Hz Alpha binaural entrainment to lower sensory cortisol."
  },
  high_pitch_cram: {
    title: "Ultra-High 8.0 kHz Surgical Notch + Deep Focus",
    symptomText:
      "Sharp 8000 Hz crystalline ear whine late at night during exam prep, plus transformer coil whine and fan rumble.",
    centerFreq: 8000,
    octaveWidth: 0.5,
    noiseType: "velvet",
    highpassFreq: 160,
    binauralBeat: 14,
    rationale:
      "Applies a tight 0.5-octave surgical notch (Q = 2.87) centered at 8,000 Hz over soothing Velvet pulse noise, preserving warm mid-band acoustic density while eliminating high-frequency neural excitation during late-night study."
  }
};

// Application State
const state = {
  isPlaying: false,
  centerFreq: 6200,
  octaveWidth: 1.0,
  noiseType: "brown",
  highpassFreq: 120,
  binauralBeat: 14,
  volume: 0.65,
  rxTitle: PRESETS.tinnitus_hvac.title,
  rxRationale: PRESETS.tinnitus_hvac.rationale,
  rxSource: "Deterministic Acoustic Engine",
  sessionSeconds: 0
};

// Web Audio API Nodes
let audioCtx = null;
let noiseSource = null;
let highpassFilter = null;
let notchFilter1 = null;
let notchFilter2 = null;
let masterGain = null;
let analyser = null;
let binauralLeftOsc = null;
let binauralRightOsc = null;
let binauralGain = null;
let timerInterval = null;

// DOM Elements
const canvas = document.getElementById("spectrumCanvas");
const ctx = canvas.getContext("2d");

function calculateQFromOctaves(octaves) {
  const pow = Math.pow(2, octaves);
  return Math.sqrt(pow) / (pow - 1);
}

function getNotchBounds(centerFreq, octaves) {
  const halfFactor = Math.pow(2, octaves / 2);
  return {
    low: Math.round(centerFreq / halfFactor),
    high: Math.round(centerFreq * halfFactor),
    q: calculateQFromOctaves(octaves)
  };
}

// Create Procedural Noise Buffer (Brown, Pink, or Velvet)
function createNoiseBuffer(context, type) {
  const bufferSize = context.sampleRate * 5; // 5-second seamless buffer
  const buffer = context.createBuffer(2, bufferSize, context.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const output = buffer.getChannelData(ch);

    if (type === "brown") {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.2; // Normalize gain
      }
    } else if (type === "pink") {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
        b6 = white * 0.115926;
      }
    } else {
      // Soft Velvet / Warm Rain texture
      let smooth = 0;
      for (let i = 0; i < bufferSize; i++) {
        const impulse = Math.random() < 0.12 ? (Math.random() * 2 - 1) : 0;
        smooth = 0.96 * smooth + 0.04 * ( (Math.random() * 2 - 1) * 0.5 + impulse );
        output[i] = smooth * 2.4;
      }
    }
  }
  return buffer;
}

function initAudioEngine() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    document.getElementById("sampleRateReadout").textContent =
      audioCtx.sampleRate.toLocaleString() + " Hz";
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function startAcousticShield() {
  initAudioEngine();
  stopAudioNodes();

  const bounds = getNotchBounds(state.centerFreq, state.octaveWidth);

  // 1. Procedural Noise Generator
  noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = createNoiseBuffer(audioCtx, state.noiseType);
  noiseSource.loop = true;

  // 2. High-Pass HVAC Rumble Filter
  highpassFilter = audioCtx.createBiquadFilter();
  highpassFilter.type = "highpass";
  highpassFilter.frequency.setValueAtTime(state.highpassFreq, audioCtx.currentTime);
  highpassFilter.Q.setValueAtTime(0.707, audioCtx.currentTime);

  // 3. Dual Cascaded Surgical Notch Filters (>36 dB suppression canyon)
  notchFilter1 = audioCtx.createBiquadFilter();
  notchFilter1.type = "notch";
  notchFilter1.frequency.setValueAtTime(state.centerFreq, audioCtx.currentTime);
  notchFilter1.Q.setValueAtTime(bounds.q, audioCtx.currentTime);

  notchFilter2 = audioCtx.createBiquadFilter();
  notchFilter2.type = "notch";
  notchFilter2.frequency.setValueAtTime(state.centerFreq, audioCtx.currentTime);
  notchFilter2.Q.setValueAtTime(bounds.q, audioCtx.currentTime);

  // 4. Master Safe-Fade Gain
  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(
    Math.max(0.02, state.volume * 0.6),
    audioCtx.currentTime + 0.65
  );

  // 5. FFT Analyser
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.82;

  // Connect Primary DSP Graph
  noiseSource.connect(highpassFilter);
  highpassFilter.connect(notchFilter1);
  notchFilter1.connect(notchFilter2);
  notchFilter2.connect(masterGain);
  masterGain.connect(analyser);
  analyser.connect(audioCtx.destination);

  noiseSource.start(0);

  // 6. Optional Binaural Entrainment Sub-Graph
  setupBinauralNodes();

  state.isPlaying = true;
  updateTransportUI();
  startSessionTimer();
}

function setupBinauralNodes() {
  if (!audioCtx || !masterGain) return;
  if (binauralLeftOsc) {
    try { binauralLeftOsc.stop(); binauralRightOsc.stop(); } catch (e) {}
    binauralLeftOsc = null;
    binauralRightOsc = null;
  }

  if (state.binauralBeat > 0) {
    const baseCarrier = 210; // Warm sub-carrier Hz
    binauralGain = audioCtx.createGain();
    binauralGain.gain.setValueAtTime(0.035, audioCtx.currentTime);

    const leftPanner = audioCtx.createStereoPanner();
    leftPanner.pan.setValueAtTime(-0.85, audioCtx.currentTime);

    const rightPanner = audioCtx.createStereoPanner();
    rightPanner.pan.setValueAtTime(0.85, audioCtx.currentTime);

    binauralLeftOsc = audioCtx.createOscillator();
    binauralLeftOsc.type = "sine";
    binauralLeftOsc.frequency.setValueAtTime(baseCarrier, audioCtx.currentTime);

    binauralRightOsc = audioCtx.createOscillator();
    binauralRightOsc.type = "sine";
    binauralRightOsc.frequency.setValueAtTime(
      baseCarrier + state.binauralBeat,
      audioCtx.currentTime
    );

    binauralLeftOsc.connect(leftPanner).connect(binauralGain);
    binauralRightOsc.connect(rightPanner).connect(binauralGain);
    binauralGain.connect(masterGain);

    binauralLeftOsc.start();
    binauralRightOsc.start();
  }
}

function stopAudioNodes() {
  if (noiseSource) {
    try { noiseSource.stop(); noiseSource.disconnect(); } catch (e) {}
    noiseSource = null;
  }
  if (binauralLeftOsc) {
    try { binauralLeftOsc.stop(); binauralRightOsc.stop(); } catch (e) {}
    binauralLeftOsc = null;
    binauralRightOsc = null;
  }
}

function stopAcousticShield() {
  stopAudioNodes();
  state.isPlaying = false;
  updateTransportUI();
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateLiveDSPParameters() {
  const bounds = getNotchBounds(state.centerFreq, state.octaveWidth);

  if (state.isPlaying && audioCtx) {
    const now = audioCtx.currentTime;
    if (notchFilter1 && notchFilter2) {
      notchFilter1.frequency.setTargetAtTime(state.centerFreq, now, 0.03);
      notchFilter2.frequency.setTargetAtTime(state.centerFreq, now, 0.03);
      notchFilter1.Q.setTargetAtTime(bounds.q, now, 0.03);
      notchFilter2.Q.setTargetAtTime(bounds.q, now, 0.03);
    }
    if (highpassFilter) {
      highpassFilter.frequency.setTargetAtTime(state.highpassFreq, now, 0.03);
    }
    if (masterGain) {
      masterGain.gain.setTargetAtTime(Math.max(0.02, state.volume * 0.6), now, 0.05);
    }
  }

  // Update DOM Telemetry
  document.getElementById("notchFreqBadge").textContent =
    state.centerFreq.toLocaleString() + " Hz";
  document.getElementById("freqSlider").value = state.centerFreq;
  document.getElementById("overlayNotchBand").textContent =
    `${bounds.low.toLocaleString()} Hz – ${bounds.high.toLocaleString()} Hz`;
  document.getElementById("overlayQFactor").textContent =
    `${bounds.q.toFixed(3)} (${state.octaveWidth.toFixed(1)} Oct)`;
  document.getElementById("highpassValue").textContent = `${state.highpassFreq} Hz`;
  document.getElementById("highpassSlider").value = state.highpassFreq;

  // Update Right Panel Telemetry
  document.getElementById("rxTitle").textContent = state.rxTitle;
  document.getElementById("rxRationale").textContent = state.rxRationale;
  document.getElementById("rxSourceTag").textContent = state.rxSource;
  document.getElementById("tCenterFreq").textContent =
    `${state.centerFreq.toLocaleString()} Hz`;
  document.getElementById("tStopBand").textContent =
    `${(bounds.low / 1000).toFixed(2)}k – ${(bounds.high / 1000).toFixed(2)}k Hz`;
  document.getElementById("tCascade").textContent =
    `Dual Biquad (Q=${bounds.q.toFixed(2)})`;
  document.getElementById("tEntrainment").textContent =
    state.binauralBeat > 0 ? `${state.binauralBeat} Hz Stereo` : "Disabled";
}

function updateTransportUI() {
  const btn = document.getElementById("toggleShieldBtn");
  const icon = document.getElementById("shieldBtnIcon");
  const text = document.getElementById("shieldBtnText");
  const badge = document.getElementById("engineStatusBadge");

  if (state.isPlaying) {
    btn.classList.add("btn-Primary-active");
    icon.innerHTML = "&#9632;";
    text.textContent = "DISENGAGE ACOUSTIC SHIELD";
    badge.textContent = "DSP ACTIVE (60FPS)";
    badge.className = "chip-value status-active";
  } else {
    btn.classList.remove("btn-Primary-active");
    icon.innerHTML = "&#9654;";
    text.textContent = "ENGAGE ACOUSTIC SHIELD";
    badge.textContent = "STANDBY";
    badge.className = "chip-value status-standby";
  }
}

function startSessionTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    state.sessionSeconds++;
    const mins = String(Math.floor(state.sessionSeconds / 60)).padStart(2, "0");
    const secs = String(state.sessionSeconds % 60).padStart(2, "0");
    document.getElementById("sessionTimer").textContent = `${mins}:${secs}`;
  }, 1000);
}

// Brief, Volume-Capped Reference Tone Audition (1.5 seconds)
function auditionReferenceTone() {
  initAudioEngine();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(state.centerFreq, audioCtx.currentTime);

  // Hard-capped gentle gain (-20 dBFS) with soft envelope
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.45);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 1.5);

  const statusEl = document.getElementById("micStatusText");
  statusEl.textContent = `Auditioning gentle ${state.centerFreq} Hz reference tone (1.5s)...`;
  statusEl.style.color = "#00f5d4";
  setTimeout(() => {
    statusEl.textContent = `Locked on ${state.centerFreq} Hz. Engage shield to carve spectral notch.`;
    statusEl.style.color = "";
  }, 1550);
}

// Live Microphone Room Scanner (with instant simulation fallback if mic blocked)
async function scanRoomMicrophone() {
  const statusEl = document.getElementById("micStatusText");
  statusEl.textContent = "Sampling room acoustic spectrum...";
  statusEl.style.color = "#ffb703";

  try {
    initAudioEngine();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const micSource = audioCtx.createMediaStreamSource(stream);
    const micAnalyser = audioCtx.createAnalyser();
    micAnalyser.fftSize = 2048;
    micSource.connect(micAnalyser);

    const data = new Uint8Array(micAnalyser.frequencyBinCount);
    setTimeout(() => {
      micAnalyser.getByteFrequencyData(data);
      let maxVal = -1;
      let maxBin = 20;
      const minBin = Math.floor((300 * micAnalyser.fftSize) / audioCtx.sampleRate);
      const maxSearchBin = Math.floor((11000 * micAnalyser.fftSize) / audioCtx.sampleRate);

      for (let i = minBin; i < maxSearchBin; i++) {
        if (data[i] > maxVal) {
          maxVal = data[i];
          maxBin = i;
        }
      }

      stream.getTracks().forEach((t) => t.stop());
      const detectedHz = Math.round(
        ((maxBin * audioCtx.sampleRate) / micAnalyser.fftSize) / 25
      ) * 25;
      state.centerFreq = Math.min(12000, Math.max(400, detectedHz || 5800));
      state.rxSource = "Live Microphone FFT Peak Lock";
      updateLiveDSPParameters();

      statusEl.textContent = `Mic Peak Locked: Dominant irritant detected near ${state.centerFreq} Hz.`;
      statusEl.style.color = "#00f5d4";
    }, 900);
  } catch (err) {
    // Graceful deterministic fallback for demo environments without mic access
    const simulatedPeaks = [5450, 6200, 4800, 7100];
    const picked = simulatedPeaks[Math.floor(Math.random() * simulatedPeaks.length)];
    state.centerFreq = picked;
    state.highpassFreq = 140;
    state.rxSource = "Simulated Room Telemetry Lock";
    updateLiveDSPParameters();

    statusEl.textContent = `Demo Telemetry Lock: Simulated tonal spike at ${picked} Hz + 140 Hz HVAC hum.`;
    statusEl.style.color = "#00f5d4";
  }
}

// AI Symptom Parser (Supports optional Gemini API Key + Instant Deterministic Solver)
async function synthesizePrescription() {
  const text = document.getElementById("symptomInput").value.trim();
  const apiKey = document.getElementById("geminiApiKey").value.trim();
  const btn = document.getElementById("prescribeBtn");

  btn.disabled = true;
  btn.textContent = "Synthesizing DSP Parameters...";

  if (apiKey) {
    try {
      const prompt = `You are an acoustic DSP engineer. Based on this user's symptom description: "${text}", return ONLY valid JSON with keys: {"title": string, "centerFreq": number between 200 and 12000, "octaveWidth": 0.5 or 1.0 or 1.5, "noiseType": "brown" or "pink" or "velvet", "highpassFreq": number between 40 and 300, "binauralBeat": 0 or 10 or 14, "rationale": 2-sentence clinical DSP explanation}.`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );
      const data = await res.json();
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        applyParsedPrescription(parsed, "Gemini Live Acoustic Agent");
        btn.disabled = false;
        btn.textContent = "Synthesize AI Acoustic Prescription";
        return;
      }
    } catch (e) {
      console.warn("Falling back to deterministic acoustic engine:", e);
    }
  }

  // Deterministic Natural-Language Acoustic Solver
  const lower = text.toLowerCase();
  const hzMatch = lower.match(/(\d{3,5})\s*(?:hz|hertz)/i);
  const khzMatch = lower.match(/(\d+(?:\.\d+)?)\s*khz/i);

  let detectedFreq = state.centerFreq;
  if (hzMatch) {
    detectedFreq = Math.min(12000, Math.max(200, parseInt(hzMatch[1], 10)));
  } else if (khzMatch) {
    detectedFreq = Math.min(12000, Math.max(200, Math.round(parseFloat(khzMatch[1]) * 1000)));
  } else if (lower.includes("high") || lower.includes("sharp") || lower.includes("whine")) {
    detectedFreq = 7400;
  } else if (lower.includes("mid") || lower.includes("office") || lower.includes("voice")) {
    detectedFreq = 4200;
  }

  const noiseType =
    lower.includes("voice") || lower.includes("chatter") || lower.includes("office")
      ? "pink"
      : lower.includes("night") || lower.includes("exam") || lower.includes("sleep")
      ? "velvet"
      : "brown";

  const highpassFreq =
    lower.includes("ac") || lower.includes("hvac") || lower.includes("rumble") || lower.includes("fan")
      ? 140
      : 90;

  const octaveWidth = lower.includes("sharp") || lower.includes("surgical") ? 0.5 : 1.0;
  const binauralBeat = lower.includes("calm") || lower.includes("anx") ? 10 : 14;
  const bounds = getNotchBounds(detectedFreq, octaveWidth);

  applyParsedPrescription(
    {
      title: `Custom ${detectedFreq.toLocaleString()} Hz Spectral Notch + ${noiseType.toUpperCase()} Shield`,
      centerFreq: detectedFreq,
      octaveWidth,
      noiseType,
      highpassFreq,
      binauralBeat,
      rationale: `Extracted target irritant at ${detectedFreq.toLocaleString()} Hz. Configured dual-stage biquad notch across ${bounds.low.toLocaleString()}–${bounds.high.toLocaleString()} Hz (Q=${bounds.q.toFixed(2)}) over ${noiseType} carrier noise, with a ${highpassFreq} Hz high-pass filter to eliminate environmental rumble.`
    },
    "Deterministic Acoustic NLP Engine"
  );

  btn.disabled = false;
  btn.textContent = "Synthesize AI Acoustic Prescription";
}

function applyParsedPrescription(rx, sourceLabel) {
  state.centerFreq = Math.round(rx.centerFreq / 25) * 25;
  state.octaveWidth = Number(rx.octaveWidth) || 1.0;
  state.noiseType = rx.noiseType || "brown";
  state.highpassFreq = Number(rx.highpassFreq) || 120;
  state.binauralBeat = Number(rx.binauralBeat ?? 14);
  state.rxTitle = rx.title;
  state.rxRationale = rx.rationale;
  state.rxSource = sourceLabel;

  document.getElementById("bandwidthSelect").value = String(state.octaveWidth);
  syncSegmentedButtons();
  updateLiveDSPParameters();

  if (state.isPlaying) {
    startAcousticShield();
  }
}

function syncSegmentedButtons() {
  document.querySelectorAll("#noiseTypeGroup .seg-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.noise === state.noiseType);
  });
  document.querySelectorAll("#binauralGroup .seg-btn").forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.binaural) === state.binauralBeat);
  });
}

// 60FPS Real-Time Logarithmic Spectrum & Notch Visualizer
function freqToX(freq, width) {
  const minLog = Math.log10(150);
  const maxLog = Math.log10(14000);
  const clamped = Math.max(150, Math.min(14000, freq));
  return ((Math.log10(clamped) - minLog) / (maxLog - minLog)) * width;
}

function xToFreq(x, width) {
  const minLog = Math.log10(150);
  const maxLog = Math.log10(14000);
  const logFreq = minLog + (x / width) * (maxLog - minLog);
  return Math.pow(10, logFreq);
}

let phaseTick = 0;
function renderSpectrumLoop() {
  phaseTick += 0.04;
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  // 1. Background Frequency Grid
  ctx.strokeStyle = "rgba(30, 45, 69, 0.55)";
  ctx.lineWidth = 1;
  const gridFreqs = [200, 500, 1000, 2000, 4000, 6000, 8000, 12000];
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#64748b";

  gridFreqs.forEach((f) => {
    const x = freqToX(f, width);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height - 22);
    ctx.stroke();
    const label = f >= 1000 ? `${f / 1000}k` : `${f}`;
    ctx.fillText(label, x - 10, height - 7);
  });

  // 2. Draw Shaded Crimson Notch Suppression Canyon
  const bounds = getNotchBounds(state.centerFreq, state.octaveWidth);
  const xLow = freqToX(bounds.low, width);
  const xCenter = freqToX(state.centerFreq, width);
  const xHigh = freqToX(bounds.high, width);

  const gradNotch = ctx.createLinearGradient(0, 0, 0, height - 22);
  gradNotch.addColorStop(0, "rgba(255, 51, 102, 0.28)");
  gradNotch.addColorStop(1, "rgba(255, 51, 102, 0.04)");
  ctx.fillStyle = gradNotch;
  ctx.fillRect(xLow, 0, Math.max(6, xHigh - xLow), height - 22);

  // Center Tinnitus Target Line (f0)
  ctx.strokeStyle = "#ff3366";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(xCenter, 0);
  ctx.lineTo(xCenter, height - 22);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#ff3366";
  ctx.fillText(`f0: ${state.centerFreq} Hz`, Math.min(width - 85, Math.max(8, xCenter - 34)), 52);

  // 3. Draw Active Spectrum Curve (Live FFT when playing, Preview Curve in standby)
  ctx.beginPath();
  const baselineY = height - 24;

  let fftData = null;
  if (state.isPlaying && analyser) {
    fftData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(fftData);
  }

  for (let x = 0; x < width; x += 3) {
    const freq = xToFreq(x, width);

    // Analytical Notch Transfer Magnitude
    const normDist = Math.log2(freq / state.centerFreq) / (state.octaveWidth / 2);
    const notchDepth = 1 - 0.86 * Math.exp(-Math.pow(normDist, 2) * 2.2);
    const hpRoll = freq < state.highpassFreq ? Math.pow(freq / state.highpassFreq, 2.5) : 1.0;

    let mag = 0;
    if (fftData && audioCtx) {
      const bin = Math.min(
        fftData.length - 1,
        Math.max(1, Math.round((freq * analyser.fftSize) / audioCtx.sampleRate))
      );
      mag = (fftData[bin] / 255) * 0.85;
      // Blend with analytical filter envelope for ultra-crisp visual feedback
      mag = mag * 0.65 + 0.55 * notchDepth * hpRoll * 0.35;
    } else {
      // Standby Preview Envelope
      const tilt = state.noiseType === "brown" ? 0.68 - 0.18 * Math.log10(freq / 200) : 0.58;
      const ripple = 0.02 * Math.sin(x * 0.08 + phaseTick);
      mag = Math.max(0.05, (tilt + ripple) * notchDepth * hpRoll * 0.55);
    }

    const y = baselineY - mag * (height - 75);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.strokeStyle = state.isPlaying ? "#00f5d4" : "rgba(0, 245, 212, 0.55)";
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Fill under spectrum curve
  ctx.lineTo(width, baselineY);
  ctx.lineTo(0, baselineY);
  ctx.closePath();
  const fillGrad = ctx.createLinearGradient(0, 40, 0, baselineY);
  fillGrad.addColorStop(
    0,
    state.isPlaying ? "rgba(0, 245, 212, 0.25)" : "rgba(0, 245, 212, 0.08)"
  );
  fillGrad.addColorStop(1, "rgba(0, 245, 212, 0.0)");
  ctx.fillStyle = fillGrad;
  ctx.fill();

  requestAnimationFrame(renderSpectrumLoop);
}

// Export Standalone Offline Therapy Card (.html)
function exportOfflineCard() {
  const bounds = getNotchBounds(state.centerFreq, state.octaveWidth);
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><title>EchoNotch Acoustic Prescription — ${state.centerFreq} Hz</title>
<style>
  body { font-family: monospace; background: #070b12; color: #f0f6fc; padding: 2rem; max-width: 680px; margin: auto; }
  .card { border: 2px solid #00f5d4; background: #0f1623; padding: 1.5rem; border-radius: 12px; }
  h1 { color: #00f5d4; margin-top: 0; }
  .stat { background: #162032; padding: 0.75rem; margin: 0.5rem 0; border-left: 4px solid #ff3366; }
</style>
</head>
<body>
  <div class="card">
    <h1>EchoNotch Acoustic Therapy Prescription</h1>
    <p><strong>Prescription Profile:</strong> ${state.rxTitle}</p>
    <div class="stat"><strong>Target Notch Center (f0):</strong> ${state.centerFreq} Hz</div>
    <div class="stat"><strong>Suppressed Stop-Band:</strong> ${bounds.low} Hz – ${bounds.high} Hz (${state.octaveWidth} Octave, Q=${bounds.q.toFixed(3)})</div>
    <div class="stat"><strong>Carrier Texture & High-Pass:</strong> ${state.noiseType.toUpperCase()} Noise | ${state.highpassFreq} Hz HVAC Cut</div>
    <div class="stat"><strong>Binaural Entrainment:</strong> ${state.binauralBeat} Hz</div>
    <p>${state.rxRationale}</p>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `echonotch-rx-${state.centerFreq}hz.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// Wire DOM Events
document.querySelectorAll(".pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    const preset = PRESETS[pill.dataset.preset];
    if (preset) {
      document.getElementById("symptomInput").value = preset.symptomText;
      applyParsedPrescription(preset, "Clinical Preset Profile");
    }
  });
});

document.getElementById("prescribeBtn").addEventListener("click", synthesizePrescription);

document.getElementById("freqSlider").addEventListener("input", (e) => {
  state.centerFreq = Number(e.target.value);
  updateLiveDSPParameters();
});

document.getElementById("bandwidthSelect").addEventListener("change", (e) => {
  state.octaveWidth = Number(e.target.value);
  updateLiveDSPParameters();
});

document.getElementById("volumeSlider").addEventListener("input", (e) => {
  state.volume = Number(e.target.value) / 100;
  document.getElementById("volumeValue").textContent = `${e.target.value}%`;
  updateLiveDSPParameters();
});

document.getElementById("highpassSlider").addEventListener("input", (e) => {
  state.highpassFreq = Number(e.target.value);
  updateLiveDSPParameters();
});

document.querySelectorAll("#noiseTypeGroup .seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.noiseType = btn.dataset.noise;
    syncSegmentedButtons();
    if (state.isPlaying) startAcousticShield();
  });
});

document.querySelectorAll("#binauralGroup .seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.binauralBeat = Number(btn.dataset.binaural);
    syncSegmentedButtons();
    updateLiveDSPParameters();
    if (state.isPlaying) setupBinauralNodes();
  });
});

document.getElementById("toggleShieldBtn").addEventListener("click", () => {
  if (state.isPlaying) stopAcousticShield();
  else startAcousticShield();
});

document.getElementById("auditionToneBtn").addEventListener("click", auditionReferenceTone);
document.getElementById("scanMicBtn").addEventListener("click", scanRoomMicrophone);
document.getElementById("exportCardBtn").addEventListener("click", exportOfflineCard);

// Initialize Telemetry & Start 60fps Oscilloscope
updateLiveDSPParameters();
requestAnimationFrame(renderSpectrumLoop);