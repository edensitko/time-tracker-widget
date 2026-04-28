#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"
NODE="$(which node)"

if [ -z "$NODE" ]; then
  echo "Error: node not found. Install Node.js first."
  exit 1
fi

PLIST="$HOME/Library/LaunchAgents/com.timetracker.server.plist"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.timetracker.server</string>

  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$DIR/server.js</string>
  </array>

  <key>WorkingDirectory</key>
  <string>$DIR</string>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>$DIR/server.log</string>

  <key>StandardErrorPath</key>
  <string>$DIR/server.log</string>
</dict>
</plist>
EOF

# Create empty state if missing
if [ ! -f "$DIR/state.json" ]; then
  echo '{"projects":[],"sessions":[],"activeSession":null,"selectedProjectId":null}' > "$DIR/state.json"
fi

# Install widget
cp "$DIR/time-tracker.jsx" "$HOME/Library/Application Support/Übersicht/widgets/"

# Load server
launchctl unload "$PLIST" 2>/dev/null
launchctl load "$PLIST"

echo "✓ Server started (auto-starts on login)"
echo "✓ Widget installed in Übersicht"
echo "✓ Web app: http://127.0.0.1:57321"
