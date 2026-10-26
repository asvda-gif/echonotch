# Technical Specification: EchoNotch

## 1. Architecture Overview
EchoNotch is a client-side, zero-build-dependency web application (`index.html`, `styles.css`, `app.js`) powered by the browser's native **Web Audio API** and **HTML5 2D Canvas**.

## 2. Web Audio API DSP Signal Chain
1. **Procedural Noise Generator (`AudioBufferSourceNode`):**
   - Synthesizes 5-second seamless stereo loop buffers in RAM using Voss-McCartney Pink Noise ($1/f$) and leaky-integrator Brown Noise ($1/f^2$) algorithms—requiring zero external MP3 assets.
2. **Low-Frequency HVAC Suppressor (`BiquadFilterNode` - `highpass`):**
   - Attenuates sub-bass HVAC compressor rumble below the prescribed cutoff ($60\text{ Hz} - 250\text{ Hz}$).
3. **Dual-Stage Cascaded Surgical Notch (`BiquadFilterNode` x2 - `notch`):**
   - Two biquad notch filters connected in series at center frequency $f_0$ to achieve a steep $>36\text{ dB}$ attenuation floor.
   - Given user-selected bandwidth $B$ in octaves ($0.25$ to $1.0$), the filter quality factor $Q$ is computed deterministically as:
     $$Q = \frac{\sqrt{2^B}}{2^B - 1}$$
4. **Binaural Entrainment Sub-Graph (`OscillatorNode` L/R + `StereoPannerNode`):**
   - Left ear receives base carrier ($200\text{ Hz}$); right ear receives $200\text{ Hz} + \Delta f$ ($10\text{ Hz}$ Alpha relaxation, $14\text{ Hz}$ SMR focus, or $40\text{ Hz}$ Gamma cognition) at subtle sub-perceptual gain.
5. **Master Limiter & FFT Tap (`GainNode` -> `AnalyserNode` -> `destination`):**
   - `AnalyserNode` (`fftSize = 2048`) feeds a `requestAnimationFrame` loop rendering the live logarithmic frequency spectrum ($20\text{ Hz} - 20,000\text{ Hz}$) and overlaying the calculated notch boundaries $[f_0 \cdot 2^{-B/2}, f_0 \cdot 2^{B/2}]$.

## 3. Verification Plan
- Verify clicking each of the 3 preset pills updates the prescription telemetry and moves the red notch canyon on the canvas.
- Verify clicking "Engage Acoustic Shield" produces audible notched noise and animates the 60fps cyan spectrum trace with a visible dip inside the crimson notch band.
- Verify clicking "Export Therapy Card" downloads a valid `.html` portable acoustic report.