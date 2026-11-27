"""Read-only production verification. No tokens, cookies, POSTs or payment attempts."""
import ssl
import urllib.error
import urllib.request
import sys

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(
    NoRedirect(), urllib.request.HTTPSHandler(context=ssl.create_default_context())
)

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "AD507-ReadOnly-Security-Verification/1.0"})
    try:
        response = opener.open(req, timeout=15)
    except urllib.error.HTTPError as exc:
        response = exc
    with response:
        return response.status, response.headers

def check(label, url, statuses, required=None):
    try:
        status, headers = get(url)
        failures = []
        if status not in statuses:
            failures.append("unexpected HTTP status")
        for name, expected in (required or {}).items():
            if expected.lower() not in headers.get(name, "").lower():
                failures.append("missing or unexpected " + name)
        print(f"{label}: HTTP {status}; " + (", ".join(failures) if failures else "PASS"))
        return not failures
    except (OSError, urllib.error.URLError, ValueError) as exc:
        print(f"{label}: verification failed ({type(exc).__name__})")
        return False

baseline = {"Strict-Transport-Security": "max-age=", "X-Content-Type-Options": "nosniff"}
private = dict(baseline, **{"Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY"})
results = [
    check("Panama legal HTTPS", "https://direcciones507.com/legal/terms/", {200}),
    check("LATAM health", "https://direcciones.lat/health", {200}, baseline),
    check("LATAM legal", "https://direcciones.lat/legal/terms", {200}, baseline),
    check("Panama account HTTPS", "https://cuenta.direcciones507.com/health", {200}, baseline),
    check("Radar HTTPS", "https://radar.direcciones.lat/", {200, 301, 302, 307, 308}, baseline),
    check("Anonymous ADMIN denied", "https://direcciones.lat/v1/admin/stats", {401, 403}, private),
]
sys.exit(0 if all(results) else 1)
