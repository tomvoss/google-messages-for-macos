# Google Messages for macOS

A native-like macOS wrapper for Google Messages that properly handles window closing behavior.

## Features

- Prevents the app from quitting when the window is closed on macOS (behaves like native apps)
- Persists window size and position between sessions
- Ensures the window stays within visible screen bounds (even after display changes)
- Restores window when clicking the app icon in the dock

## Why This Exists

Google Messages is a great service, but when used as a PWA on macOS, clicking the close button quits the app completely instead of minimizing to the dock like native macOS apps. This Electron wrapper solves that problem by intercepting the close event and simply hiding the window instead.

## Installation

### Download Pre-built App

Download the latest release from the [Releases](https://github.com/tomvoss/google-messages-for-macos/releases) page.

### Build from Source

#### Prerequisites

- Bun (recommended, no Node.js required)
- Or Node.js 16+ with npm or yarn

#### Steps

1. Clone this repository:

```bash
git clone https://github.com/tomvoss/google-messages-for-macos.git
cd google-messages-for-macos
```

2. Install dependencies:

```bash
# Using bun (recommended)
bun install

# Using npm
npm install

# Using yarn
yarn
```

3. Run the app in development mode:

```bash
# Using bun (recommended)
bun start

# Using npm
npm start

# Using yarn
yarn start
```

4. Build the app for distribution:

```bash
# Using bun (recommended)
bun run build:mac

# Using npm
npm run build:mac

# Using yarn
yarn build:mac
```

The built application will be available in the `dist` directory.

## Development

### Project Structure

- `main.js` - Main Electron process
- `package.json` - Project configuration
- `assets/` - Icons and other assets

## Technical Details

The application works by:

1. Intercepting the window close event on macOS
2. Preventing the default behavior (quitting)
3. Saving the window state
4. Hiding the window instead of closing it
5. Restoring the window when clicking the dock icon

This creates a user experience consistent with native macOS applications.

## License

MIT
