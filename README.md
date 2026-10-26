# EchoNotch — AI Acoustic Tinnitus & Sensory Overload Live DSP Shield

Built for the **Devpost Build With AI: Basics** hackathon using the official **Devpost Learn Skill Pack** (`challengepost/learn-ai-basics`).

## Planning Documents (Learn Skill Pack)
- [Scope Document](./devpost/scope.md) (also available at [`/scope.md`](./scope.md))
- [Product Requirements Document (PRD)](./devpost/prd.md) (also available at [`/prd.md`](./prd.md))
- [Technical Specification](./devpost/spec.md) (also available at [`/spec.md`](./spec.md))

## What It Does
EchoNotch translates natural-language auditory symptoms and live room microphone frequency scans into a real-time, 60fps **Web Audio API digital signal processor (DSP)**. It synthesizes procedural Brown, Pink, and Velvet noise while carving a surgical dual-stage spectral notch ($Q = \sqrt{2^B}/(2^B - 1)$) around the user's exact tinnitus ringing frequency ($f_0$) to induce lateral inhibition in the auditory cortex.

## How to Run Locally
No build step or paid API key required:
```bash
npx serve .