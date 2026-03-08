# broker/app.py
import asyncio
import json
import logging
import os
from logging.handlers import RotatingFileHandler
from typing import Dict, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import PlainTextResponse
import uvicorn

from config import HOST, PORT, VERBOSE, LOG_DIR, ID_RE

app = FastAPI(title="OSC-over-WebSocket Broker")

rooms: Dict[str, Set[WebSocket]] = {}
rooms_lock = asyncio.Lock()

logger = logging.getLogger("broker")
logger.setLevel(logging.DEBUG if VERBOSE else logging.INFO)
formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

if VERBOSE:
    os.makedirs(LOG_DIR, exist_ok=True)
    fh = RotatingFileHandler(
        os.path.join(LOG_DIR, "broker.log"),
        maxBytes=10_000_000,
        backupCount=5,
    )
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


async def broadcast_text_to_room(room_id: str, message: str, sender: WebSocket):
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
        await asyncio.gather(*coros, return_exceptions=True)


async def broadcast_bytes_to_room(room_id: str, payload: bytes, sender: WebSocket):
    async with rooms_lock:
        conns = rooms.get(room_id, set()).copy()
    if not conns:
        return

    coros = []
    for ws in conns:
        if ws is sender:
            continue
        coros.append(ws.send_bytes(payload))

    if coros:
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

    async with rooms_lock:
        if id not in rooms:
            rooms[id] = set()
        rooms[id].add(ws)

    logger.info(f"[JOIN] room={id} client={client}")

    try:
        while True:
            message = await ws.receive()

            # disconnect
            if message.get("type") == "websocket.disconnect":
                break

            text_data = message.get("text")
            bytes_data = message.get("bytes")

            # text frame
            if text_data is not None:
                try:
                    obj = json.loads(text_data)
                except json.JSONDecodeError:
                    logger.warning(f"[BAD JSON] room={id} client={client} payload={text_data!r}")
                    continue

                if VERBOSE:
                    logger.debug(f"[MSG RECV TEXT] room={id} client={client} json={obj}")

                ok, why = validate_osc_payload(obj)
                if not ok:
                    logger.warning(f"[INVALID MSG] room={id} client={client} reason={why} json={obj}")
                    try:
                        await ws.send_text(json.dumps({"type": "error", "reason": why}))
                    except Exception:
                        pass
                    continue

                await broadcast_text_to_room(id, json.dumps(obj), sender=ws)
                logger.info(f"[BCAST TEXT] room={id} from={client} type={obj.get('type')}")
                continue

            # binary frame
            if bytes_data is not None:
                if VERBOSE:
                    logger.debug(
                        f"[MSG RECV BIN] room={id} client={client} bytes={len(bytes_data)}"
                    )

                await broadcast_bytes_to_room(id, bytes_data, sender=ws)
                logger.info(f"[BCAST BIN] room={id} from={client} bytes={len(bytes_data)}")
                continue

            logger.warning(f"[UNKNOWN FRAME] room={id} client={client} message={message}")

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.exception(f"[ERROR] room={id} client={client} exc={exc}")
    finally:
        async with rooms_lock:
            if id in rooms and ws in rooms[id]:
                rooms[id].remove(ws)
                if not rooms[id]:
                    rooms.pop(id, None)

        logger.info(f"[LEAVE] room={id} client={client}")


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=HOST,
        port=PORT,
        log_level="debug" if VERBOSE else "info",
        reload=False,
    )
