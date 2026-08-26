from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent

class MemeHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Serve files from this website folder.
        clean = path.split('?', 1)[0].split('#', 1)[0]
        return str(ROOT / clean.lstrip('/'))

    def send_error(self, code, message=None, explain=None):
        error_file = ROOT / f"{code}.html"
        if not error_file.exists():
            error_file = ROOT / "404.html"
            code = 404
        body = error_file.read_bytes()
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

if __name__ == "__main__":
    host, port = "127.0.0.1", 5500
    print(f"MemeStudio local server: http://{host}:{port}/")
    print("Missing URLs will use the custom 404 page.")
    ThreadingHTTPServer((host, port), MemeHandler).serve_forever()
