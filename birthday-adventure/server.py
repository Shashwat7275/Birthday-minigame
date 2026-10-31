#!/usr/bin/env python3
"""
Local Development & Packaging Server for "A Little Universe Made for You"
Serves the static game files and provides a helper POST endpoint
(/api/save-default-config) so the Admin Panel can write your personalized
configuration directly into E:\\birthday-adventure\\js\\defaultConfig.js.
"""
import http.server
import json
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))


class BirthdayGameHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def do_POST(self):
        if self.path == "/api/test-report":
            length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(length).decode("utf-8")
            with open(os.path.join(ROOT_DIR, "test-report.json"), "w", encoding="utf-8") as f:
                f.write(raw_body)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return
        if self.path == "/api/save-default-config":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw_body = self.rfile.read(length).decode("utf-8")
                parsed = json.loads(raw_body)

                target_path = os.path.join(ROOT_DIR, "js", "defaultConfig.js")
                js_content = (
                    "/**\n"
                    " * Personalized Configuration Bundle - Saved via Creator Studio Admin Panel\n"
                    " */\n"
                    "(function (global) {\n"
                    "  global.DEFAULT_GAME_CONFIG = "
                    + json.dumps(parsed, indent=2, ensure_ascii=False)
                    + ";\n"
                    "})(window);\n"
                )
                with open(target_path, "w", encoding="utf-8") as f:
                    f.write(js_content)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True}).encode("utf-8"))
            except Exception as exc:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(exc)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), BirthdayGameHandler) as httpd:
        print(f"Serving Birthday Adventure Game at http://127.0.0.1:{PORT}")
        print(f"Admin Panel (Creator Studio) at http://127.0.0.1:{PORT}/admin.html")
        httpd.serve_forever()
