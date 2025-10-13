# broker/app.py
import asyncio
import json
import logging
import os
from logging.handlers import RotatingFileHandler
from typing import Dict, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.responses import PlainTextResponse
import uvicorn

from config import HOST, PORT, VERBOSE, LOG_DIR, ID_RE

app = FastAPI(title="OSC-over-WebSocket Broker")

# rooms: mapping room_id -> set of WebSocket connections
rooms: Dict[str, Set[WebSocket]] = {}
rooms_lock = asyncio.Lock()  # protect rooms structure

logger = logging.getLogger("broker")
logger.setLevel(logging.DEBUG if VERBOSE else logging.INFO)
formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

if VERBOSE:
    os.makedirs(LOG_DIR, exist_ok=True)
    fh = RotatingFileHandler(os.path.join(LOG_DIR, "broker.log"), maxBytes=10_000_00, backupCount=5)
    fh.setFormatter(formatter)
    logger.addHandler(fh)

ch = logging.StreamHandler()
ch.setFormatter(formatter)
logger.addHandler(ch)


@app.get("/health")
async def health():
    return PlainTextResponse("ok")


def validate_id(room_id: str) -> bool:
    return bool(ID_RE.match(room_id))


async def broadcast_to_room(room_id: str, message: str, sender: WebSocket):
    """
    Broadcast message (a JSON string) to all other sockets in the room.
    Uses asyncio.gather to avoid blocking on any slow client.
    """
    async with rooms_lock:
        conns = rooms.get(room_id, set()).copy()
    if not conns:
        return

    coros = []
    for ws in conns:
        if ws is sender:
            continue
        coros.append(ws.send_text(message))
    if coros:
        # run concurrently and ignore individual failures (they will raise and be handled elsewhere)
        await asyncio.gather(*coros, return_exceptions=True)


def validate_osc_payload(obj: dict) -> (bool, str):
    if "type" not in obj:
        return False, "missing 'type'"
    if obj["type"] == "osc":
        if "path" not in obj:
            return False, "osc missing 'path'"
        if "args" not in obj or not isinstance(obj["args"], list):
            return False, "osc missing 'args' (must be list)"
        for i, a in enumerate(obj["args"]):
            if not isinstance(a, dict) or "t" not in a or "v" not in a:
                return False, f"arg[{i}] invalid; must be {{'t':..., 'v':...}}"
            if a["t"] not in ("f", "i", "s"):
                return False, f"arg[{i}] invalid type token {a['t']}"
            # basic type-check
            if a["t"] == "f":
                try:
                    float(a["v"])
                except Exception:
                    return False, f"arg[{i}] expected float convertible"
            if a["t"] == "i":
                try:
                    int(a["v"])
                except Exception:
                    return False, f"arg[{i}] expected int convertible"
            if a["t"] == "s":
                if not isinstance(a["v"], str):
                    return False, f"arg[{i}] expected string"
    return True, ""


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, id: str = Query(...)):
    client = f"{ws.client.host}:{ws.client.port if ws.client.port else ''}"
    if not validate_id(id):
        await ws.close(code=4000)
        logger.warning(f"[REJECT] invalid id={id} client={client}")
        return

    await ws.accept()
    # register
    async with rooms_lock:
        if id not in rooms:
            rooms[id] = set()
        rooms[id].add(ws)
    logger.info(f"[JOIN] room={id} client={client}")

    try:
        while True:
            data = await ws.receive_text()
            # parse JSON only; ignore binary
            try:
                obj = json.loads(data)
            except json.JSONDecodeError:
                logger.warning(f"[BAD JSON] room={id} client={client} payload={data!r}")
                # Optionally notify sender; but spec says ignore invalid JSON
                continue

            if VERBOSE:
                logger.debug(f"[MSG RECV] room={id} client={client} json={obj}")

            ok, why = validate_osc_payload(obj)
            if not ok:
                logger.warning(f"[INVALID MSG] room={id} client={client} reason={why} json={obj}")
                # optionally send error back
                try:
                    await ws.send_text(json.dumps({"type": "error", "reason": why}))
                except Exception:
                    pass
                continue

            # Broadcast to other clients in the same room
            await broadcast_to_room(id, json.dumps(obj), sender=ws)
            logger.info(f"[BCAST] room={id} from={client} type={obj.get('type')}")
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.exception(f"[ERROR] room={id} client={client} exc={exc}")
    finally:
        # unregister
        async with rooms_lock:
            if id in rooms and ws in rooms[id]:
                rooms[id].remove(ws)
                if not rooms[id]:
                    rooms.pop(id, None)
        logger.info(f"[LEAVE] room={id} client={client}")


if __name__ == "__main__":
    uvicorn.run("app:app", host=HOST, port=PORT, log_level="debug" if VERBOSE else "info", reload=False)

