# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**42-BusGraber Mobile** is a React Native mobile app built with Expo for the 1337 campus bus booking system at bus-med.1337.ma. It replaces the original Python CLI tool with a fully-featured mobile UI.

**Platform Support:**
- ✅ Android (Native app via APK)
- ✅ iOS (Native app)
- ❌ Web (CORS restrictions prevent authentication)

### Authentication Method

The app uses a **WebView-based OAuth flow** to capture the `le_token` cookie directly from the official bus website. This approach:
- Opens a WebView to `https://bus-med.1337.ma`
- User logs in via 42 Intra OAuth in the WebView
- The app monitors cookies and extracts `le_token` when present
- Token is saved to SecureStore (encrypted device storage)
- Subsequent API calls use the stored cookie

This is necessary because:
1. The API requires cookie-based authentication (`le_token`)
2. Browser security prevents JavaScript from manually setting Cookie headers on cross-origin requests
3. The WebView runs in the app's context, allowing cookie access via native APIs

## Development Commands

This project uses Expo SDK 52 with React Native 0.76.

```bash
# Install dependencies
npm install

# Start development server
npm start
# or
npx expo start

# Run on Android
npx expo run:android
# or for development client
npx expo start --android

# Run on iOS (Mac only)
npx expo run:ios
# or for development client
npx expo start --ios

# Build for production (uses EAS)
npx eas build -p android --profile preview --local

# Lint
npm run lint
```

**Prerequisites:**
- Node.js 18+
- Java 21 (configured in .bashrc: `export JAVA_HOME=/usr/lib/jvm/java-21-openjdk`)
- Android SDK (for Android builds)

## Mobile Architecture

### Project Structure

```
42BusGraberMobile/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Authenticated tab screens
│   │   ├── _layout.tsx          # Tab navigation layout
│   │   ├── index.tsx            # Current departures (home tab)
│   │   ├── upcoming.tsx         # Upcoming departures
│   │   ├── tickets.tsx          # My tickets
│   │   ├── auto-grab.tsx        # Auto-grab feature
│   │   └── scheduled.tsx        # Scheduled bookings
│   ├── booking/                  # Booking flow
│   │   └── index.tsx            # Ticket booking screen
│   ├── _layout.tsx              # Root layout with auth guard
│   ├── login.tsx                # Login screen with WebView option
│   └── +not-found.tsx           # 404 screen
├── components/                   # Reusable UI components
│   ├── ui/                      # UI primitives
│   │   ├── icon-symbol.tsx      # Cross-platform icons
│   │   ├── DepartureCard.tsx    # Bus departure card
│   │   ├── LoadingOverlay.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── EmptyState.tsx
│   │   └── ErrorBoundary.tsx    # Error handling
│   └── forms/                   # Form components
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts
│   ├── useBooking.ts
│   ├── useAutoGrab.ts
│   └── useScheduledBooking.ts
├── stores/                       # Zustand state management
│   └── authStore.ts             # Auth state with persistence
├── api/                          # API client and types
│   ├── client.ts                # Axios instance with interceptors
│   ├── auth.ts                  # Auth API functions
│   ├── types.ts                 # TypeScript types
│   └── debug.ts                 # Debugging utilities
├── utils/                        # Utilities
│   ├── constants.ts             # Colors, spacing, etc.
│   ├── time.ts                  # Date formatting
│   └── notifications.ts         # Push notifications
├── app.json                     # Expo configuration
├── package.json                 # Dependencies
└── tsconfig.json                # TypeScript config
```

### Key Components

#### Authentication Flow (app/login.tsx + WebView)

The login flow uses a **WebView OAuth approach**:

1. **Initial Screen**: Shows "Login with WebView" button
2. **WebView Opens**: Loads `https://bus-med.1337.ma`
3. **User Logs In**: Completes OAuth with 42 Intra credentials
4. **Cookie Extraction**: Native code extracts `le_token` from WebView cookies
5. **Token Storage**: Saved to Expo SecureStore (encrypted)
6. **API Usage**: Token sent via Cookie header on all API calls

**Implementation:**
- Android: Uses `CookieManager` to extract cookies
- iOS: Uses `WKWebsiteDataStore` to read cookies
- Fallback: Manual token entry if extraction fails

#### API Client (api/client.ts)

`apiClient` is an Axios instance configured for cookie-based auth:

```typescript
// Cookie header set automatically from SecureStore on native
// WebView handles cookies natively for web (not supported)
const apiClient = axios.create({
  baseURL: 'https://bus-med.1337.ma/api',
  timeout: 10000,
});
```

**Request Interceptor:**
- Reads token from SecureStore (native only)
- Sets `Cookie: le_token=<TOKEN>` header
- Web logins are blocked (browser security prevents Cookie headers)

**Response Interceptor:**
- Handles 401 errors (clears token, redirects to login)
- Logs API errors for debugging

#### State Management (stores/authStore.ts)

Uses Zustand with persistence:

```typescript
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: User | null;
  error: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
}
```

Persisted in AsyncStorage (non-sensitive) + SecureStore (token).

#### Token Storage (api/client.ts)

Platform-specific storage:

```typescript
export const authStorage = {
  setToken: async (token: string) => {
    // Native: Expo SecureStore (encrypted)
    await SecureStore.setItemAsync('le_token', token);
  },
  getToken: async () => {
    return await SecureStore.getItemAsync('le_token');
  },
  removeToken: async () => {
    await SecureStore.deleteItemAsync('le_token');
  },
};
```

### API Types

```typescript
interface User {
  id: number;
  login: string;
  first_name: string;
  last_name: string;
}

interface Departure {
  id: number;
  departure_time: string;
  route: {
    name: string;
    bus: { name: string; capacity: number };
  };
  locked: boolean;
  nbr_to_home: number;
  nbr_to_campus: number;
}

interface Ticket {
  id: number;
  hash: string;
  position: number;
  to_campus: boolean;
}
```

### Configuration

1. **First Run**: User taps "Login with WebView"
2. **OAuth Flow**: 42 Intra OAuth in embedded WebView
3. **Token Extraction**: Native cookie APIs extract `le_token`
4. **Auto-save**: Token saved to SecureStore automatically

### External Dependencies

- `expo` - Expo SDK 52
- `expo-router` - File-based routing
- `expo-secure-store` - Encrypted token storage
- `zustand` - State management
- `axios` - HTTP client
- `react-native-paper` - UI components
- `@react-native-async-storage/async-storage` - Non-sensitive persistence

### API Endpoints

Base URL: `https://bus-med.1337.ma/api`

- `GET /auth/isAuth` - Token validation (requires le_token cookie)
- `GET /auth/42` - OAuth redirect
- `GET /auth/42/callback?code={code}` - OAuth callback
- `GET /departure/current` - Current departures
- `GET /departure/upcoming` - Full day schedule
- `GET /tickets/booked/departure/{id}` - Tickets for a departure
- `POST /tickets/book` - Book ticket
- `PATCH /tickets/{id}/cancel` - Cancel ticket

Authentication: Cookie-based (`le_token` cookie sent with all requests)

---

## WebView Login Implementation

### Android (Kotlin)

Uses `CookieManager` to extract cookies after OAuth login:

```kotlin
val cookieManager = CookieManager.getInstance()
val cookies = cookieManager.getCookie("https://bus-med.1337.ma")
// Parse le_token from cookies
```

### iOS (Swift)

Uses `WKWebsiteDataStore` to read cookies:

```swift
let dataStore = WKWebsiteDataStore.default()
dataStore.httpCookieStore.getAllCookies { cookies in
    if let token = cookies.first(where: { $0.name == "le_token" })?.value {
        // Send back to React Native
    }
}
```

### React Native Integration

```typescript
// Using expo-web-view or custom native module
<WebView
  source={{ uri: 'https://bus-med.1337.ma' }}
  onLoadEnd={() => {
    // Extract cookies via native module
    NativeModules.CookieExtractor.extract()
      .then(token => login(token));
  }}
/>
```

### Security Notes

- Token stored in SecureStore/Keychain, not AsyncStorage
- WebView cache cleared after extraction
- Token expiration handled (401 → redirect to login)
- HTTPS enforced for all API calls

---

## Legacy Python CLI

See the `cli-backup/` directory for the original Python implementation. This is kept for reference but is no longer actively used. The Python CLI required manual token extraction from browser dev tools.

### Key differences from mobile app:
- **Python**: Cookie-based auth via `requests` library
- **Mobile**: Cookie-based auth via WebView extraction + SecureStore
- **Neither** can use web browser due to CORS restrictions

---

## Troubleshooting

### "Refused to set unsafe header Cookie"
- **Issue**: Testing in web browser
- **Fix**: Use Android/iOS native app, web is unsupported

### "401 Unauthorized"
- **Cause**: Token missing or expired
- **Fix**: Re-login, check SecureStore access

### "Network Error"
- **Check**: API URL reachable? (`https://bus-med.1337.ma`)
- **Check**: Token format correct? (JWT format)
- **Check**: Cookie header being sent? (view logs)

---

## Recent Implementation Updates (2026-04-11)

### Silent Background Polling

All data fetching now uses **dual-mode refreshing**:

1. **Initial Load** - Shows loading spinners, full data fetch on mount
2. **Background Polling** - Silent updates every 10 seconds without UI interruption

**Files:**
- `stores/departuresStore.ts` - Added `silentRefreshCurrent()` and `silentRefreshUpcoming()`
- `stores/ticketsStore.ts` - Added `silentRefresh()`
- `app/(tabs)/index.tsx`, `tickets.tsx`, `upcoming.tsx` - Implemented polling with proper cleanup

**Implementation Pattern:**
```typescript
const intervalRef = useRef<NodeJS.Timeout | null>(null);

// Stop any existing intervals
const stopPolling = useCallback(() => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
}, []);

// Start background polling
const startPolling = useCallback(() => {
  stopPolling(); // Clear existing first
  intervalRef.current = setInterval(() => {
    silentRefresh();
  }, 10000);
}, [stopPolling, silentRefresh]);

// On mount: load + start polling
useEffect(() => {
  loadData();
  startPolling();
  return () => stopPolling();
}, []);

// On manual refresh: restart polling
const onRefresh = useCallback(async () => {
  await loadData();
  startPolling();
}, [loadData, startPolling]);
```

### Cascading Filters (Auto-Grab Feature)

The auto-grab screen (`app/(tabs)/auto-grab.tsx`) implements **hour → route → bus** cascading filters:

1. **Select Hour** → Extracts available hours from current/upcoming departures
2. **Select Route** → Shows only routes available at selected hour
3. **Select Bus** → Shows only buses serving selected route at selected hour

**Features:**
- "🔄 All Routes" option when multiple routes available
- "🔄 All Buses" option when multiple buses available
- Auto-selects first valid option when filters change
- Handles midnight (00:00) properly

### Ticket Hash Fix

Fixed ticket hash display in `api/tickets.ts`:
- Uses `Map<number, Ticket>` to deduplicate tickets by ID
- Merges data from both departure-level and detailed ticket fetches
- Keeps best version (prioritizes entries with hash field populated)

### Wheel Picker Component

Custom `PickerWheel` component with:
- Smooth scroll snapping (`snapToInterval`)
- Momentum scroll end detection (`onMomentumScrollEnd`)
- Visual highlighting of centered item
- Proper cleanup with `useRef` for scroll tracking

---

## Complete Project Structure

```
42BusGraberMobile/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Authenticated tab screens
│   │   ├── _layout.tsx      # Tab navigation layout
│   │   ├── index.tsx        # Current departures (home)
│   │   ├── upcoming.tsx     # Upcoming departures
│   │   ├── tickets.tsx      # My tickets
│   │   ├── auto-grab.tsx    # Auto-grab with cascading filters
│   │   └── scheduled.tsx    # Scheduled bookings (if exists)
│   ├── booking/
│   │   └── index.tsx        # Booking confirmation
│   ├── _layout.tsx          # Root layout with auth guard
│   ├── login.tsx            # Login with WebView
│   └── +not-found.tsx
├── components/
│   ├── ui/
│   │   ├── icon-symbol.tsx  # SF Symbols compatibility
│   │   ├── DepartureCard.tsx
│   │   ├── LoadingOverlay.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── EmptyState.tsx
│   │   └── ErrorBoundary.tsx
│   └── forms/               # Form components
├── hooks/
│   ├── useAuth.ts
│   ├── useBooking.ts
│   ├── useAutoGrab.ts       # Auto-grab logic
│   └── useScheduledBooking.ts
├── stores/                   # Zustand stores
│   ├── authStore.ts
│   ├── departuresStore.ts    # Current/upcoming + silent refresh
│   └── ticketsStore.ts       # My tickets + silent refresh
├── api/
│   ├── client.ts
│   ├── auth.ts
│   ├── tickets.ts            # Fixed hash merging logic
│   ├── departures.ts
│   └── types.ts
├── utils/
│   ├── constants.ts
│   ├── time.ts
│   └── notifications.ts
└── app.json
```
