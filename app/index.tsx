// Remove the Redirect component import as it's no longer needed here.
// import { Redirect } from 'expo-router';

export default function Index() {
  // Return null because the root layout (app/_layout.tsx) is responsible
  // for determining the initial route based on the authentication state.
  // This component doesn't need to render anything itself.
  return null;
}

// The routing logic has been moved to app/_layout.tsx to handle