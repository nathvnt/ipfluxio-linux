# backend/check_caps.py
import socket
try:
    s = socket.socket(socket.AF_PACKET, socket.SOCK_RAW)
    s.bind(("lo", 0))
    print("OK")
except PermissionError:
    print("NO")
