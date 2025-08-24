# URL Expansion & Resolution

This service expands short URLs to their final destination without performing
external network requests. A small in-memory table defines known shortlink
redirects. Each call to `POST /resolve/url` traverses the redirect chain and
returns the expanded URL along with the intermediate hops.
