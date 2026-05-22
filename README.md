# Tether

> A social music platform that transforms passive streaming into an immersive, shared experience — with real-time synchronized sessions and vibe-based discovery.

Tether bridges the gap between isolated listening and human connection by creating a living social graph of musical presence, perfectly synced playback, and an adaptive UI that responds to your social context in real time.

🔗 **Live Demo:** [tether.app](https://tether.app) *(Pending / Private)*
🔗 **Repository:** [github.com/DMDTague/tether](https://github.com/DMDTague/tether)

---

## Table of Contents

- [Overview](#overview)
- [Technologies](#technologies)
- [Features](#features)
- [Architecture](#architecture)
- [How I Built It](#how-i-built-it)
- [What I Learned](#what-i-learned)
- [Future Work](#future-work)
- [Why This Matters](#why-this-matters)

---

## Overview

Tether solves the isolation of modern music consumption by making listening a shared, synchronized social ritual.

The goal was to turn a user's phone into a **social barometer** — displaying real-time musical presence, matching users based on *vibe vectors* (mathematical representations of musical energy), and allowing friends to listen together in perfect sync like a shared digital AUX cord. The result is a production-ready mobile application that makes digital connection feel tangible, ambient, and deeply personal.

---

## Technologies

### Backend
- **Python / FastAPI** — core API and WebSocket architecture
- **PostgreSQL + SQLAlchemy ORM** — persistent data storage
- **Redis** — ephemeral presence, caching, and real-time state
- **WebSockets** — bidirectional real-time sync engine
- **Spotify Web API** — audio features, playback metadata, and control
- **OpenWeatherMap API** — environmental data for Time Capsule lock conditions

### Frontend
- **React Native (Expo SDK 51)** — cross-platform mobile development
- **TypeScript** — type safety throughout
- **Expo Router** — file-based navigation
- **React Native Reanimated 3** — UI-thread animations at 60fps
- **Shopify React Native Skia** — GPU-accelerated SKSL fragment shaders

### Infrastructure
- **Docker** — containerized backend deployment
- **Render / Railway** — scalable cloud hosting with auto-reconnect
- **Expo EAS** — managed iOS/Android builds and App Store submission

---

## Features

| Feature | Description |
|---|---|
| 🎧 **Real-Time Sessions** | Listen with friends in perfect millisecond sync — host-controlled playback with automatic drift correction |
| 🌊 **Vibe-Based Discovery** | Cosine similarity matching on 4-dimensional audio vectors (valence, energy, danceability, acousticness) |
| 🎨 **Adaptive Backdrop** | GPU-rendered Perlin noise aurora that responds live to your current vibe vector and session colors |
| ✨ **Haptic Pulses** | Send physical vibrations and visual sparks to friends anywhere in the world during a shared session |
| 📳 **NFC Tap to Tether** | Instantly connect with someone in person by tapping phones via iOS Core NFC |
| 🧱 **Memory Anchors** | Completed sessions become persistent social artifacts with mood tags, health bars, and geographic metadata |
| ⏳ **Time Capsules** | Send a locked track to a friend — sealed until midnight, rainfall, a specific date, or a geofence is triggered |
| 👻 **Ghost Mode** | Listen privately without broadcasting presence or track data to your social graph |

---

## Architecture

### 1. Data & Real-Time Layer
- **PostgreSQL** manages user profiles, social graphs, sessions, anchors, and capsules
- **Redis** handles high-frequency ephemeral data — who is online, current vibe vectors, presence state
- A typed **WebSocket protocol** (`WSClientMessage` / `WSServerMessage`) broadcasts playback state, knock requests, pulse events, and presence updates globally across all connected clients

### 2. Mobile Client
- Interfaces with the **Spotify Web API** (PKCE OAuth) to fetch playback metadata and control sync
- A custom **Vibe Engine** translates raw Spotify audio features into 4-dimensional vectors, outputting color palettes and SKSL shader parameters
- The **BackdropGenerator** renders a live 4-octave FBM Perlin noise shader with uniforms driven directly by the active vibe vector — all on the GPU thread
- Local audio position is calculated against a **server-side epoch timestamp** to detect and correct network drift automatically

### 3. Deployment
- Backend deployed via **Docker on Render** with exponential backoff reconnection
- Mobile distributed via **Expo EAS** for streamlined iOS builds and App Store submission
- **OTA updates** via `expo-updates` for post-launch hotfixes without App Store review cycles

---

## How I Built It

- Designed a **WebSocket synchronization engine** that measures server vs. client clock drift and corrects playback position to maintain sub-500ms accuracy across all listeners
- Engineered a **Vibe Engine** (`vibe_engine.py`) that maps Spotify audio features to cosine similarity vectors, HSL color palettes, and SKSL shader uniforms
- Wrote custom **SKSL fragment shaders** (4-octave simplex noise FBM + film grain overlay) compiled at runtime via `Skia.RuntimeEffect.Make()`
- Built a **Billboard chart scraper** to hydrate track data without hitting Spotify API rate limits
- Implemented layered **React Contexts** (`AuthContext`, `WSContext`, `VibeContext`) to distribute real-time state cleanly across the entire component tree
- Integrated **iOS Core NFC** for the physical "Tap to Tether" onboarding ritual and **Android NDEF** equivalent
- Designed an **ad-gate tollbooth model** (`useAdPass` + Google Mobile Ads SDK) to gate session access while preserving a premium user path

---

## What I Learned

- Managing **network latency and clock drift** in real-time streaming environments — and building self-correcting sync logic that degrades gracefully
- Translating **mathematical audio vectors** into GPU-accelerated visual graphics that respond to social context, not just user input
- Building an architecture that **survives mobile backgrounding** — WebSocket drop-offs, Spotify token expiry, and automatic reconnection without session loss
- Balancing **Spotify API rate limits** with aggressive Redis caching, background workers, and local clock interpolation
- Designing a mobile UI where the **visual layer is ambient communication** — reducing cognitive load while increasing emotional resonance

---

## Future Work

- **Wavelength** — proximity-based discovery matching users by musical taste within an adjustable radius (up to 100 miles)
- **Group Sessions** — 3+ user synchronized listening with collaborative real-time queueing
- **Vibe Rooms** — public, mood-tagged listening spaces (chill / hype / study / late-night)
- **Apple Music + YouTube Music** integration to expand beyond Spotify
- **iOS Live Activities** — Dynamic Island widget for session tracking outside the app

---

## Why This Matters

Tether proves that technology can **enhance rather than replace** genuine human connection.

It transforms the isolated, algorithmic nature of modern streaming back into a **social ritual** — where what you're hearing is a signal, and who you're hearing it with matters. The invisible features (matching energy instead of demographics, ambient presence instead of notifications) create the kind of serendipitous discovery that platforms optimized purely for engagement have trained out of us.

End-to-end, it merges **complex backend synchronization** with **fluid, GPU-accelerated mobile engineering** into something that feels less like software and more like a shared space.

---

## Summary

Tether is a complete, production-ready mobile application — converting raw streaming metadata and real-time WebSocket events into a seamless, highly visual social experience.

**Core skills demonstrated:**

- Full-stack mobile development (React Native / Python / FastAPI)
- Real-time WebSocket engineering and drift-corrected sync logic
- GPU-accelerated UI design (Skia SKSL shaders / Reanimated 3)
- System architecture and distributed state management
- Third-party API integration with rate limit mitigation strategies
