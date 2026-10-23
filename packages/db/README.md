# @harness/db

PostgreSQL access for the workspace uses Drizzle ORM. The schema includes
Anvia's durable agent-memory tables.

Start the existing local PostgreSQL 16 service from the workspace root:

```sh
docker compose -f docker-compose.dev.yaml up -d
```

Apply the checked-in database migrations:

```sh
pnpm --filter @harness/db db:migrate
```

For the development Docker Compose service, set `DATABASE_URL` in the workspace
root `.env` to `postgresql://postgres:postgres@localhost:5433/harness`. Docker
publishes PostgreSQL's container port `5432` on host port `5433`.

After changing `src/schema.ts`, generate a migration and then apply it:

```sh
pnpm --filter @harness/db db:generate
pnpm --filter @harness/db db:migrate
```
