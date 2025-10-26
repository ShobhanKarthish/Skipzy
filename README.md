# Skipzy - Attendance Management App

A React Native app built with Expo for managing student attendance.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- A Supabase account and project

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Get your project URL and anon key from the Supabase dashboard (Settings > API)
3. Create a `.env` file in the root directory:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** Replace `your-project.supabase.co` and `your-anon-key-here` with your actual Supabase credentials.

### 3. Set Up Database Tables

Create the following tables in your Supabase database:

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  attendance_target INTEGER DEFAULT 75,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Start the Development Server

```bash
npm start
```

Or for specific platforms:

```bash
npm run android  # For Android
npm run ios      # For iOS
npm run web      # For Web
```

## Troubleshooting

### JSON Parse Error

If you encounter a "JSON Parse error: Unexpected character: P" error:

1. **Check your `.env` file exists** in the root directory
2. **Verify your Supabase credentials** are correct
3. **Ensure the URL starts with `https://`**
4. **Restart the Expo development server** after creating/modifying the `.env` file:
   - Press `Ctrl+C` to stop the server
   - Run `npm start` again

### ENOENT: InternalBytecode.js Error

This is a Metro bundler error that occurs when there's an issue with the JavaScript bundle. It's usually a symptom of the configuration error above. Fix the Supabase configuration and restart the server.

## Project Structure

```
skipzy/
├── app/              # App screens and routes
├── components/       # Reusable UI components
├── lib/             # Utilities and services
│   ├── supabase.ts  # Supabase client configuration
│   └── supabaseService.ts  # Auth and data services
├── types/           # TypeScript type definitions
└── assets/          # Images and other assets
```

## Features

- User authentication (Sign up, Sign in, Password reset)
- Attendance tracking
- User profile management
- Dark mode support

## Technologies

- React Native
- Expo
- TypeScript
- Supabase (Authentication & Database)
- React Navigation
