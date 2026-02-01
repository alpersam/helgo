# Helgo - Zürich Micro-Guide

A playful Switzerland micro-guide mobile app for tourists and locals. Helgo helps you decide where to go RIGHT NOW by combining food/places + sky + city "vibes".

## Features

- **Chat-based interface**: Ask Helgo what you're in the mood for
- **Smart recommendations**: Get exactly 3 curated suggestions based on your query
- **Mini-itineraries**: Each suggestion includes an ANCHOR place + SATELLITE BONUS
- **Creative metrics**: Fog Escape, Reflection Potential, Night Glow, Green Pocket, Wind Shelter
- **Main Character Score**: 0-100 score showing how "cinematic" your visit will be
- **Live weather integration**: Uses Open-Meteo API for real-time conditions
- **TikTok & Maps**: Quick links to explore places further

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for testing)

### Installation

```bash
# Navigate to the project
cd helgo

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running the App

After running `npx expo start`, you'll see a QR code in your terminal:

- **iOS**: Scan the QR code with your Camera app
- **Android**: Scan the QR code with the Expo Go app
- **Web**: Press `w` to open in browser
- **Simulator**: Press `i` for iOS simulator or `a` for Android emulator

## Project Structure

```
helgo/
├── App.tsx                    # App entry point
├── src/
│   ├── components/
│   │   ├── ChatBubble.tsx     # Chat message bubbles
│   │   ├── PlaceCard.tsx      # Itinerary result cards
│   │   ├── MetricRow.tsx      # Creative metric display
│   │   └── index.ts
│   ├── data/
│   │   └── PlaceDB.json       # Curated Zürich places (~30)
│   ├── lib/
│   │   ├── recommend.ts       # Query parsing & itinerary generation
│   │   ├── weather.ts         # Open-Meteo API + sun calculations
│   │   ├── metrics.ts         # Creative metrics computation
│   │   ├── mainCharacter.ts   # Main Character Score logic
│   │   └── index.ts
│   ├── screens/
│   │   ├── ChatScreen.tsx     # Main chat interface
│   │   └── index.ts
│   └── types/
│       └── index.ts           # TypeScript type definitions
└── package.json
```

## Example Queries

- "I want mexican in a hip area"
- "Cute café and a walk after"
- "I have 2 hours, where should I go?"
- "Best view right now"
- "Something quiet and romantic"
- "Sushi near the lake"

## Tech Stack

- **React Native** with Expo (TypeScript)
- **No login** required
- **No backend** - local logic for V1
- **Open-Meteo API** for weather (no API key needed)

## Creative Metrics Explained

1. **Fog Escape** 🌤: If cloud cover is high AND place elevation > user location → "Above-fog escape"
2. **Reflection Potential** 🪞: If recent precipitation AND cool temps → "Reflection chance: high"
3. **Night Glow** 🌙: If evening AND tags include "oldtown" or "city" → "Night glow: alive"
4. **Green Pocket** 🌿: If tags include park/lake/green → "Green reset nearby"
5. **Wind Shelter** 🧥: If windy AND tags include "oldtown" or "narrow" → "Feels sheltered"

## License

MIT
