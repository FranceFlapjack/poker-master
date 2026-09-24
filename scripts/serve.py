#!/usr/bin/env python3
"""Dev server: like `python3 -m http.server` but with caching disabled, so edits show on reload."""
import http.server, sys, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a): pass
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8002
print(f'serving on http://localhost:{port}')
http.server.ThreadingHTTPServer(('', port), H).serve_forever()
