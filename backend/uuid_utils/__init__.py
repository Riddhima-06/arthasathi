import uuid
from uuid import *
import time
import os

__version__ = "0.10.0"

def uuid7():
    timestamp_ms = time.time_ns() // 1_000_000
    time_bytes = timestamp_ms.to_bytes(6, byteorder="big")
    rand_bytes = os.urandom(10)
    raw = bytearray(time_bytes + rand_bytes)
    raw[6] = (raw[6] & 0x0F) | 0x70
    raw[8] = (raw[8] & 0x3F) | 0x80
    return uuid.UUID(bytes=bytes(raw))

def uuid8():
    return uuid.uuid4()
