#!/usr/bin/env python3
# broker/test_send.py
import asyncio
import json
import sys
import websockets

async def main():
    if len(sys.argv) < 2:
        print("Usage: test_send.py <room-id> [json]")
        return
    room = sys.argv[1]
    if len(sys.argv) > 2:
        payload = json.loads(sys.argv[2])
    else:
        payload = {
            "type": "osc",
            "path": "/demo/value",
            "args": [{"t": "f", "v": 0.5}]
        }
    uri = f"ws://localhost:8000/ws?id={room}"
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps(payload))
        print(f"Sent: {payload}")

if __name__ == "__main__":
    asyncio.run(main())

