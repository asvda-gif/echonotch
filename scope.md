# Project Scope: EchoNotch — Live DSP Tinnitus & Sensory Overload Shield

## 1. The Core Problem
Students, coders, and knowledge workers with tonal tinnitus (ringing in the ears) or auditory hypersensitivity struggle to focus in environments with harsh ambient spikes (HVAC hum, fluorescent whine, open offices). Standard white-noise websites play static audio loops that still stimulate the ringing frequency, while clinical notched-noise therapies require expensive subscriptions.

## 2. The Kernel (What We Are Building Now)
A single-screen, zero-backend browser workbench that translates natural-language symptom descriptions and live frequency calibration into a real-time **Web Audio API digital signal processing (DSP) graph**:
- **Input & Calibration:** Natural-language symptom prompt, 3 one-click clinical presets, live microphone FFT ambient spike detection (with a no-mic simulation fallback), and a pure-tone tinnitus frequency matcher ($200\text{ Hz} - 12,000\text{ Hz}$).
- **Core Engine:** Procedural Pink, Brown, and Velvet noise synthesis routed through a cascaded dual-stage surgical `BiquadFilterNode` notch filter ($Q$ calculated dynamically from octave width) plus low-frequency HVAC rumble suppression and optional binaural alpha/SMR focus entrainment.
- **Visual Proof:** A 60fps HTML5 Canvas FFT spectrum analyzer visually displaying the live audio frequency curve alongside the shaded red spectral notch canyon.

## 3. Strictly Out of Scope (Saved for Later)
- User authentication, login walls, or cloud databases.
- Long-term multi-week clinical audiogram history charts.
- Native iOS/Android background wrappers.

## 4. Definition of Done
A user can open the app, click a preset or enter their ringing frequency, press "Engage Acoustic Shield," immediately hear the custom notched soundscape fade in safely, watch the live 60fps spectrum carve out the target frequency band on screen, and export their custom therapy configuration as a standalone file.