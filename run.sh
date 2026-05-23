#!/bin/bash
# DocTransAgent — Unified Next.js full-stack launch
# Next.js :3000 handles all traffic; rewrites /api/* → FastAPI :8000 (internal)

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "╔══════════════════════════════════════════════╗"
echo "║   DocTransAgent — Unified Launch            ║"
echo "║   Next.js Full-Stack + GMI Cloud Engine     ║"
echo "╚══════════════════════════════════════════════╝"

# .env
if [ ! -f "$DIR/backend/.env" ]; then
    cp "$DIR/backend/.env.example" "$DIR/backend/.env"
    echo "⚠  Created backend/.env — edit it to add your GMI_API_KEY"
    echo "   (Demo mode will work without a real key)"
fi

# Deps
echo "[1/3] Backend deps..."
cd "$DIR/backend" && pip install -q -r requirements.txt
echo "[2/3] Frontend deps..."
cd "$DIR/frontend" && npm install --silent

# Start FastAPI (internal, port 8000)
echo "[3/3] Starting services..."
cd "$DIR/backend"
python3 -m uvicorn app:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
sleep 2

# Start Next.js (public, port 3000)
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Ready: http://localhost:3000              ║"
echo "║   All /api/* proxied to FastAPI internally  ║"
echo "║   Press Ctrl+C to stop                      ║"
echo "╚══════════════════════════════════════════════╝"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
