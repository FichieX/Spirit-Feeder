#!/bin/bash
# Spirit Feeder: starts the server and Expo the right way, and checks your phone can reach them.
# Put this file in the Spirit-Feeder folder (next to main.py), then run:  bash start_dev.sh
# Stop everything with Ctrl+C.

cd "$(dirname "$0")" || exit 1
if [ ! -f main.py ] || [ ! -d mobile ]; then
  echo "❌ Put start_dev.sh in your Spirit-Feeder folder (the one with main.py and mobile/)."
  exit 1
fi

OS_TYPE=$(uname -s)

IP=""
if [ "$OS_TYPE" = "Darwin" ]; then
  IP=$(ipconfig getifaddr en0 2>/dev/null)
  [ -z "$IP" ] && IP=$(ipconfig getifaddr en1 2>/dev/null)
else
  IP=$(hostname -I | awk '{print $1}')
fi

if [ -z "$IP" ]; then
  echo "❌ You are not connected to Wi-Fi (or a hotspot). Connect, then run this again."
  exit 1
fi
echo "🖥  Device IP address: $IP"

OLD=$(lsof -ti tcp:8000,8081,8082 2>/dev/null)
if [ -n "$OLD" ]; then
  echo "🧹 Stopping old server/Expo still running..."
  kill $OLD 2>/dev/null; sleep 1
fi

for ENVF in mobile/.env mobile/.env.local mobile/.env.development mobile/.env.development.local; do
  if [ -f "$ENVF" ] && grep -q EXPO_PUBLIC_API_URL "$ENVF"; then
    echo "⚠️  $ENVF forces the server address: $(grep EXPO_PUBLIC_API_URL "$ENVF")"
    echo "    That overrides the automatic address. Remove it if you're testing on your own Wi-Fi:"
    if [ "$OS_TYPE" = "Darwin" ]; then
      echo "    sed -i '' '/EXPO_PUBLIC_API_URL/d' $ENVF"
    else
      echo "    sed -i '/EXPO_PUBLIC_API_URL/d' $ENVF"
    fi
  fi
done

if [ "$OS_TYPE" = "Darwin" ]; then
  FW=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null)
  case "$FW" in *enabled*) echo "⚠️  Your Mac's firewall is ON. If the phone can't connect, turn it off in System Settings → Network → Firewall.";; esac
fi

if [ -f "mobile/src/api/auth.ts" ]; then
  if [ "$OS_TYPE" = "Darwin" ]; then
    sed -i '' "s|export const API_URL = 'http://.*:8000';|export const API_URL = 'http://$IP:8000';|g" mobile/src/api/auth.ts 2>/dev/null || true
  else
    sed -i "s|export const API_URL = 'http://.*:8000';|export const API_URL = 'http://$IP:8000';|g" mobile/src/api/auth.ts 2>/dev/null || true
  fi
  echo "✅ Updated mobile/src/api/auth.ts to http://$IP:8000"
fi

VENV_PATH=""
if [ -d "venv" ]; then
  VENV_PATH="venv"
elif [ -d ".venv" ]; then
  VENV_PATH=".venv"
else
  echo "❌ No venv or .venv folder here. Make it once:"
  echo "   python3 -m venv venv && source venv/bin/activate && pip install fastapi \"uvicorn[standard]\" sqlalchemy email-validator python-dotenv"
  exit 1
fi

source "$VENV_PATH/bin/activate"
LOG=/tmp/spirit-feeder-server.log
uvicorn main:app --host 0.0.0.0 --port 8000 > "$LOG" 2>&1 &
SERVER=$!
trap 'echo; echo "👋 Stopping the server"; kill $SERVER 2>/dev/null' EXIT

OK=""
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://$IP:8000/docs")
  [ "$CODE" = "200" ] && OK=1 && break
  if ! kill -0 $SERVER 2>/dev/null; then break; fi
  sleep 0.5
done
if [ -z "$OK" ]; then
  echo "❌ The server didn't start. Here's what it said:"
  tail -25 "$LOG"
  exit 1
fi
echo "✅ Server is running:  http://$IP:8000   (log: $LOG)"
echo ""
echo "📱 On your phone:"
echo "   1. Same Wi-Fi as this machine (not 5G/4G)."
echo "   2. Quick test: open  http://$IP:8000/docs  in your mobile browser."
echo "   3. Scan the NEW QR code below with Expo Go or Camera app."
echo ""

cd mobile && REACT_NATIVE_PACKAGER_HOSTNAME=$IP npx expo start --lan -c
