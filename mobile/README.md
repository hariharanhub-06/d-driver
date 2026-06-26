# Onlive Mobile (Expo / React Native)

Native app for the Onlive school-bus platform. Single role-based app — login
decides the UI. **v1 ships the Parent role**; Driver / Bus-staff / Admin-lite are
designed to slot onto the same shell in later phases. The master/dev super-admin
does **not** use the app (web console only).

It talks to the existing backend REST + Socket.IO API at `/api/v1` — no backend
changes are required for v1 (two small additive endpoints are optional: a push-token
store and account deletion).

## Stack
- Expo SDK 56, React Native 0.85 (new architecture), TypeScript, expo-router (file routes under `src/app`)
- `react-native-maps` + OpenStreetMap raster tiles (no Google/Mapbox key); OSRM for distance + ETA
- `expo-secure-store` (tokens), TanStack Query (data), `socket.io-client` (live location)
- Hand-rolled token theme (`src/theme/ThemeProvider`) — light/dark + per-school brand colour
- Bilingual EN/Tamil (`src/lib/i18n`), Expo push notifications (guarded)

## Run (dev)
```
cp .env.example .env            # set EXPO_PUBLIC_API_URL to your backend
npm install
npx expo start                  # use a Dev Client build (maps + push need native modules)
```
> Maps and push require a **dev/custom build**, not Expo Go.

## Build & ship (EAS)
```
npm i -g eas-cli
eas login && eas init           # fills extra.eas.projectId
eas build --profile development --platform android   # dev client
eas build --profile preview --platform all           # internal QA (TestFlight / Play internal)
eas build --profile production --platform all
eas submit --profile production --platform ios|android
```

## Before store submission
- Replace placeholder app icons in `assets/images/` with branded Onlive icons (1024² no-alpha for iOS).
- Host a privacy policy and link it (Profile -> Privacy Policy + store listings).
- Fill Apple App Privacy + Google Play Data Safety (location used in-app/not shared, name/email/phone, push token).
- Backend: deploy `DELETE /users/me` (account deletion - Apple gate) and `POST /notifications/push-token` (push).

## Key paths
- `src/lib/tracking.ts` — distance / OSRM ETA / "trip started" recency (kept identical to web `src/lib/tracking.ts`)
- `src/lib/api.ts` — axios client (single-flight refresh, FIRST_LOGIN gate) + typed endpoints
- `src/hooks/useBusLocation.ts`, `src/hooks/useEta.ts` — live position + throttled ETA
- `src/app/(parent)/` — dashboard (trip details), tracking (map + ETA), profile
