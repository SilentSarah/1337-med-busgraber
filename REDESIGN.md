# 42-BusGraber Mobile UI Redesign Plan

## Overview

**Objective**: Redesign the app with a clean, minimalist aesthetic using a Teal/Cyan color palette, removing all emojis, and applying moderate visual detail while preserving all existing functionality.

**Design Direction**:
- **Palette**: Teal/Cyan primary with emerald accents
- **Style**: Moderate detail—light borders, soft backgrounds, clear sections
- **Icons**: SF Symbols only, no emojis

---

## Color Palette

### Dark Mode (Primary Theme)

| Role | Hex | Usage |
|------|-----|-------|
| **Background** | `#0F1419` | Screen background |
| **Surface** | `#1C2128` | Cards, elevated surfaces |
| **Surface Elevated** | `#262C36` | Modals, dropdowns |
| **Primary** | `#14B8A6` | Teal—buttons, accents |
| **Primary Hover** | `#0D9488` | Pressed states |
| **Primary Light** | `#2DD4BF` | Highlights |
| **Secondary** | `#06B6D4` | Cyan—secondary actions |
| **Success** | `#10B981` | Available, success states |
| **Warning** | `#F59E0B` | Limited availability |
| **Error** | `#EF4444` | Full, errors |
| **Text Primary** | `#F1F5F9` | Main text |
| **Text Secondary** | `#94A3B8` | Secondary text |
| **Text Muted** | `#64748B` | Hints, disabled |
| **Border** | `#2D3748` | Subtle borders |

### Light Mode (Optional)

| Role | Hex |
|------|-----|
| **Background** | `#F8FAFC` |
| **Surface** | `#FFFFFF` |
| **Primary** | `#0D9488` |
| **Text Primary** | `#0F172A` |
| **Text Secondary** | `#475569` |
| **Border** | `#E2E8F0` |

---

## Design Tokens

```typescript
// utils/constants.ts

export const COLORS = {
  // Backgrounds
  background: '#0F1419',
  surface: '#1C2128',
  surfaceElevated: '#262C36',

  // Primary - Teal
  primary: '#14B8A6',
  primaryHover: '#0D9488',
  primaryLight: '#2DD4BF',
  primaryMuted: '#14B8A620',

  // Secondary - Cyan
  secondary: '#06B6D4',
  secondaryHover: '#0891B2',

  // Text
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Borders
  border: '#2D3748',
  borderLight: '#374151',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',

  // Availability
  available: '#10B981',
  limited: '#F59E0B',
  full: '#EF4444',
  locked: '#64748B',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

export const BORDER_RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
};
```

---

## Component Redesign

### 1. Tab Bar & Navigation

**File**: `app/(tabs)/_layout.tsx`

**Changes**:
- Remove emojis from `headerTitle` props
- Update tab bar colors to teal palette
- Simplify header styling

```typescript
// Tab bar styling
tabBarStyle: {
  backgroundColor: '#0F1419',
  borderTopColor: '#2D3748',
  borderTopWidth: 0.5,
  height: 58,
  paddingBottom: 4,
  paddingTop: 6,
}

tabBarActiveTintColor: '#14B8A6'
tabBarInactiveTintColor: '#64748B'

// Header titles (remove emojis)
- headerTitle: '🚌 Current Departures'
+ headerTitle: 'Departures'

- headerTitle: '📅 Upcoming'
+ headerTitle: 'Schedule'

- headerTitle: '🎫 My Tickets'
+ headerTitle: 'Tickets'

- headerTitle: '🎯 Auto-Grab'
+ headerTitle: 'Auto-Grab'

- headerTitle: '📋 Scheduled'
+ headerTitle: 'Scheduled'
```

---

### 2. DepartureCard Component

**File**: `components/ui/DepartureCard.tsx`

**Visual Changes**:
- Light border (`#2D3748`) on cards
- Status pill: small colored dot + text label
- Progress bar: 4px height, rounded, subtle background
- Direction indicators: simplified icon layout
- Action buttons: rounded (`BORDER_RADIUS.lg` = 16px)

**Layout Structure**:
```
┌─────────────────────────────────────────┐
│ [Route Pill]                ● OPEN      │
│                                         │
│ BUS 01                        12/20     │
│                                         │
│ ┌────────────┐      Departs in 15 min  │
│ │    18:00   │      ████████░░░  60%   │
│ │  DEPARTURE │                         │
│ └────────────┘                         │
│                                         │
│ ○ Home: 5          ○ Campus: 7         │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │           BOOK NOW                  ││
│ └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Key Changes**:

```typescript
// Status badge - replace heavy styling with simple pill
<View className="flex-row items-center px-3 py-1.5 rounded-full bg-surface border border-border">
  <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: getStatusColor() }} />
  <Text className="text-xs font-semibold" style={{ color: getStatusColor() }}>
    {statusLabels[status]}
  </Text>
</View>

// Progress bar - thinner, cleaner
<View className="h-1 bg-surface rounded-full overflow-hidden">
  <View
    className="h-full rounded-full"
    style={{ width: `${percentage}%`, backgroundColor: getStatusColor() }}
  />
</View>

// Direction section - simplified
<View className="flex-row justify-around py-3 border-t border-border">
  <View className="flex-row items-center">
    <IconSymbol name="house" size={16} color="#64748B" />
    <Text className="text-sm text-secondary ml-2">{nbr_to_home} to home</Text>
  </View>
  <View className="flex-row items-center">
    <IconSymbol name="building.2" size={16} color="#64748B" />
    <Text className="text-sm text-secondary ml-2">{nbr_to_campus} to campus</Text>
  </View>
</View>
```

---

### 3. Screen Headers

**Files**: All screen files in `app/(tabs)/`

**Unified Header Pattern**:

```typescript
<View className="px-5 pt-4 pb-3 bg-surface border-b border-border">
  <Text className="text-2xl font-bold text-foreground">
    Screen Title
  </Text>
  <Text className="text-sm text-secondary mt-1">
    Subtitle description
  </Text>
</View>
```

**Changes per screen**:
- Remove count badges from headers
- Use consistent padding (px-5 pt-4 pb-3)
- Simplify title hierarchy

---

### 4. Login Screen

**File**: `app/login.tsx`

**Changes**:
- Remove all emojis (🚌, 🔒)
- Replace with SF Symbol icons
- Update colors to teal palette
- Add subtle gradient background
- Modernize card styling

**Layout**:
```
┌─────────────────────────────────────────┐
│                                         │
│        [Bus Icon - SF Symbol]           │
│                                         │
│          42 Bus Graber                  │
│     Fast bus booking for 1337           │
│                                         │
│   ┌───────────────────────────────────┐ │
│   │                                   │ │
│   │        [Shield Icon]              │ │
│   │        Secure Login               │ │
│   │                                   │ │
│   │   Login with your 42 Intra        │ │
│   │       credentials                 │ │
│   │                                   │ │
│   │   ┌─────────────────────────────┐ │ │
│   │   │    Login with 42 Intra      │ │ │
│   │   └─────────────────────────────┘ │ │
│   │                                   │ │
│   │          ─── OR ───              │ │
│   │                                   │ │
│   │   ┌─────────────────────────────┐ │ │
│   │   │   Enter Token Manually      │ │ │
│   │   └─────────────────────────────┘ │ │
│   │                                   │ │
│   └───────────────────────────────────┘ │
│                                         │
│     Your data stays on bus-med.ma       │
│                                         │
└─────────────────────────────────────────┘
```

---

### 5. Empty States

**File**: Create `components/ui/EmptyState.tsx` (unified component)

**Replace all emoji-based empty states with icon-based**:

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { IconSymbol } from './icon-symbol';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
}) => (
  <View className="flex-1 items-center justify-center py-12 px-6">
    <View className="w-20 h-20 rounded-full bg-surface items-center justify-center mb-4 border border-border">
      <IconSymbol name={icon} size={32} color="#64748B" />
    </View>
    <Text className="text-xl font-bold text-foreground mb-2">{title}</Text>
    <Text className="text-sm text-secondary text-center max-w-xs">{message}</Text>
    {action && <View className="mt-6">{action}</View>}
  </View>
);
```

**Usage in screens**:

```typescript
// Departures
<EmptyState
  icon="bus"
  title="No Departures"
  message="No bus departures available at this time"
/>

// Tickets
<EmptyState
  icon="ticket"
  title="No Tickets"
  message="You haven't booked any tickets yet"
/>

// Upcoming
<EmptyState
  icon="calendar"
  title="No Schedule"
  message="No upcoming departures scheduled for today"
/>

// Scheduled
<EmptyState
  icon="clock"
  title="No Scheduled Bookings"
  message="Add scheduled bookings to automatically grab tickets"
/>
```

---

### 6. Tickets Screen

**File**: `app/(tabs)/tickets.tsx`

**Card Changes**:
- Remove emoji icons
- Use SF Symbols: `bus.fill`, `clock`, `number`
- Simplify status badges
- Add subtle border to cards

```typescript
// Replace emoji with icon
- <Text className="text-base">🏠</Text>
+ <IconSymbol name="house.fill" size={16} color="#64748B" />

// Status chip styling
<Chip variant="soft" color={item.to_campus ? 'accent' : 'success'} size="sm">
  <Chip.Label>{item.to_campus ? 'To Campus' : 'To Home'}</Chip.Label>
</Chip>
```

---

### 7. Auto-Grab Screen

**File**: `app/(tabs)/auto-grab.tsx`

**Changes**:
- Redesign active monitoring state
- Circular progress indicator
- Simplify picker wheel styling
- Status visualization with icons

**Monitoring State**:

```typescript
// Active state card
<Card variant="default" className="p-6 items-center">
  <View
    className="w-24 h-24 rounded-full items-center justify-center mb-4"
    style={{ backgroundColor: statusColor + '20' }}
  >
    <IconSymbol
      name={status === 'success' ? 'checkmark.circle.fill' : 'timer'}
      size={48}
      color={statusColor}
    />
  </View>

  <Text className="text-2xl font-bold mb-2" style={{ color: statusColor }}>
    {statusText}
  </Text>

  <View className="flex-row justify-around w-full">
    <View className="items-center">
      <Text className="text-xs text-secondary mb-1">Attempts</Text>
      <Text className="text-2xl font-bold text-foreground">{attempts}</Text>
    </View>
    <View className="items-center">
      <Text className="text-xs text-secondary mb-1">Elapsed</Text>
      <Text className="text-2xl font-bold text-foreground">{elapsed}</Text>
    </View>
  </View>
</Card>
```

---

### 8. Booking Screen

**File**: `app/booking/index.tsx`

**Changes**:
- Success confirmation with icon
- Simplified direction selection
- Loading overlay redesign

```typescript
// Success state
<View className="w-24 h-24 rounded-full items-center justify-center mb-6 bg-success/20">
  <IconSymbol name="checkmark.circle.fill" size={48} color="#10B981" />
</View>

// Direction buttons
<Button
  variant={direction === 'home' ? 'primary' : 'outline'}
  size="lg"
  className="flex-1"
  onPress={() => setDirection('home')}
>
  <IconSymbol
    name="house.fill"
    size={20}
    color={direction === 'home' ? '#fff' : '#64748B'}
  />
  <Button.Label className={direction === 'home' ? 'text-white' : 'text-secondary'}>
    To Home
  </Button.Label>
</Button>
```

---

## Implementation Phases

### Phase 1: Design Tokens

| File | Action |
|------|--------|
| `utils/constants.ts` | Replace COLORS, add SHADOWS |
| `constants/theme.ts` | Update to match new palette |

### Phase 2: Core Components

| File | Action |
|------|--------|
| `components/ui/DepartureCard.tsx` | Redesign card layout |
| `components/ui/EmptyState.tsx` | Create unified component |

### Phase 3: Navigation

| File | Action |
|------|--------|
| `app/(tabs)/_layout.tsx` | Tab bar colors, remove emojis |

### Phase 4: Screens

| File | Action |
|------|--------|
| `app/(tabs)/index.tsx` | Header, empty state |
| `app/(tabs)/tickets.tsx` | Cards, icons |
| `app/(tabs)/upcoming.tsx` | Cards, header |
| `app/(tabs)/auto-grab.tsx` | Picker, status |
| `app/(tabs)/scheduled.tsx` | Cards, modal |
| `app/login.tsx` | Full redesign |
| `app/booking/index.tsx` | Success state |

### Phase 5: Supporting

| File | Action |
|------|--------|
| `components/WebViewLogin.tsx` | Match color scheme |
| `app/manual-login.tsx` | Consistent styling |

---

## Verification Checklist

After implementation, verify:

- [ ] All emojis removed from UI
- [ ] Teal/cyan colors applied consistently
- [ ] Light borders on cards (not heavy)
- [ ] SF Symbols icons used throughout
- [ ] Empty states unified with icon-based design
- [ ] Tab bar styled correctly
- [ ] All functionality preserved
- [ ] No visual regressions

---

## Summary

This redesign achieves:

1. **Professional Teal/Cyan Palette** — Calming, transit-appropriate colors
2. **Clean Typography** — No emojis, SF Symbols for all icons
3. **Moderate Visual Detail** — Light borders, soft backgrounds, clear hierarchy
4. **Consistent Spacing** — Unified margins and padding
5. **Preserved Functionality** — All existing features intact
