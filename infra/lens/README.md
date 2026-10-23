# Lens

Local deployment settings checked against https://docs.anvia.dev/lens/install-and-setup.
The Compose and environment templates have not been verified against upstream.
Lens is pinned to `0.16.0` as requested. This stack uses port 80,
separate from the API on port 3000 and Vite on port 5173.

The local `.env` contains independent generated secrets and is ignored by the
repository. For a fresh checkout, copy `.env.example` to `.env` and fill each
secret with a different `openssl rand -hex 32` value.

Start as documented in the guide:

```sh
cd infra/lens
docker compose up -d
docker compose ps
```

Alternatively, run `bash infra/lens/start.sh` from the repository root to
validate the Compose configuration before starting.

The included `docker-compose.yml` was copied from the existing local deployment
at `/home/ricofa/ai-product/assign-research-agent/lens/docker-compose.yml` because
upstream downloads were unavailable. It has not been compared with the latest
upstream template at
https://raw.githubusercontent.com/anvia-hq/lens/main/docker-compose.yml.
The `.env.example` was written from the guide's local settings excerpt; it is
not a downloaded copy of the full upstream environment template. Compatibility
of this Compose copy with the pinned release has not been verified by running
the containers.

The launcher validates the included configuration and starts the services.
It requires Docker Compose and network access to pull images. In WSL, enable
Docker Desktop integration for this distro first.

Open http://localhost and create the first account, which becomes the workspace
owner. Create a project and an ingestion key in its Connect page to obtain the
application's public and secret key pair.

Inspect or stop the stack:

```sh
cd infra/lens
docker compose ps -a
docker compose logs --tail=100 migrate api worker web
docker compose down
```

The migration service must exit with code 0. The other services should be
healthy. `down` preserves named data volumes; retain those volumes and `.env`
between restarts.
