# Traefik

Routing is configured via Docker labels on services in:

- `docker-compose.yml` (local `proxy` profile → `api.localhost`)
- `docker-compose.prod.yml` (Let's Encrypt on `API_DOMAIN`)

No static Traefik config file is required for the default setup.
