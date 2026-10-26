# Product Requirements Document (PRD): EchoNotch

## 1. Target User & Use Case
- **Who it is for:** Students, solo developers, and neurodivergent workers experiencing tonal ear ringing (tinnitus) or environmental auditory fatigue during deep-work sessions.
- **Core User Journey:** Select a symptom profile or type a description -> Calibrate exact ringing frequency ($f_0$) or scan room noise -> Engage live notched DSP therapy -> Verify the spectral notch visually on the live FFT canvas -> Export preset.

## 2. Screen Layout & Visual Design Direction
- **Aesthetic:** Studio Hardware Telemetry / Darkroom Oscilloscope (designed specifically to avoid generic AI light-mode cards).
- **Color Palette:**
  - Deep Obsidian Slate (`#090D16` and `#111827`) for zero eye strain.
  - Phosphor Cyan (`#00F5D4`) for active FFT spectrum waves and primary DSP controls.
  - Surgical Crimson (`#FF3366`) for the notched frequency suppression band.
  - Amber Telemetry (`#FFB703`) for room resonance alerts and safety limiters.
- **Three-Column Single-Screen Workbench:**
  1. **Left Column (Diagnostic & Calibration):** 3 One-Click Scenario Pills, Natural-Language Symptom Input, Optional Gemini API Key toggle, Interactive Tinnitus Frequency Slider ($200\text{ Hz} - 12,000\text{ Hz}$) with brief "Audition Reference Tone" button, and Room Mic Spike Scanner.
  2. **Center Column (Live 60fps FFT Oscilloscope & Transport):** Real-time HTML5 Canvas frequency spectrum showing the active audio curve, the shaded red Notch Suppression Zone around $f_0$, Master Safe-Fade Volume, Noise Color selector (Brown / Pink / Warm Rain), and Primary Engage/Disengage toggle.
  3. **Right Column (DSP Filter Graph & Telemetry):** Live mathematical readouts (Center Frequency $f_0$, Notch Octave Width, Calculated $Q$-Factor, HVAC High-Pass Cutoff, Binaural Beat Offset $\Delta f$), Clinical Lateral Inhibition explanation, and "Export Offline Therapy Card" button.

## 3. Edge Cases & Safety Guardrails
- **Hearing Protection Soft-Start:** Audio gain never starts abruptly; engaging the shield ramps volume smoothly over 800ms and hard-caps reference tone gain at `-18 dBFS`.
- **No-Microphone Fallback:** If microphone permission is denied or unavailable during a demo, a "Simulate Room HVAC + 6.2kHz Spike" button populates realistic spectral telemetry.
- **Zero-Key Reliability:** Works 100% offline/keyless via the deterministic Acoustic NLP & Physics Engine while supporting optional Gemini API enrichment.