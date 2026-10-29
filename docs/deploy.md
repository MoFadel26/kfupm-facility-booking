# Deploy

Production is one container on Azure Container Apps, in front of Azure
Database for PostgreSQL Flexible Server 16. The container serves the API
only. The React app in `frontend/` is not deployed by any of this; it is
hosted on its own origin and calls the API through CORS.

- `ResourceManager.Api/Dockerfile` builds the image, with the repository root
  as the build context. The .NET SDK publishes the API, and the image runs it
  on port 8080 as a non-root user.
- `.github/workflows/deploy.yml` runs only when started by hand. It pushes
  `ghcr.io/mofadel26/kfupm-facility-booking:<commit sha>` and points the
  container app at it. It does not run on push, so nothing is deployed until
  the setup below is done and someone runs it. The tests run in the CI
  workflow on every push to `main`, not in this one.
- `infra/deploy.sh` creates or updates the Azure resources. It is safe to
  run again. Region and names are variables at its top; the resource group
  and app name are repeated in the workflow and must match.
- Pending migrations are applied when the container starts
  (`Database:MigrateOnStartup` defaults to true). That is safe because the app
  never runs as more than one replica.
- `/health/ready` answers 200 when the database answers, 503 when not. The
  startup and readiness probes call it. `/health/live` checks nothing; the
  liveness probe calls it, so a database outage takes the replica out of
  rotation instead of restarting it over and over.

The first migration runs `CREATE EXTENSION btree_gist` for the reservation
overlap constraint. Flexible Server only allows extensions on its
`azure.extensions` list, so `infra/deploy.sh` sets that list to `BTREE_GIST`
before the app starts.

## Configuration

Every setting the container reads comes from its environment. Nothing secret
is in `appsettings*.json` or in the image.

| Variable | Set by | Value |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | `infra/deploy.sh`, as the Container Apps secret `db-connection` | Npgsql connection string with `SSL Mode=VerifyFull` |
| `Cors__AllowedOrigins__0` | `infra/deploy.sh`, from `CORS_ORIGIN` | The frontend's origin. Production refuses to start without one |
| `Authentication__Schemes__Bearer__ValidIssuer` | `infra/deploy.sh`, from `JWT_ISSUER` | Issuer the API puts in the tokens it issues and expects in access tokens. Production refuses to start without one |
| `Authentication__Schemes__Bearer__ValidAudiences__0` | `infra/deploy.sh`, from `JWT_AUDIENCE` | Audience the API puts in its tokens and expects. Production refuses to start without one |
| `Authentication__Schemes__Bearer__SigningKeys__0__Issuer` | `infra/deploy.sh`, from `JWT_ISSUER` | Issuer the signing key belongs to |
| `Authentication__Schemes__Bearer__SigningKeys__0__Value` | `infra/deploy.sh`, from `JWT_SIGNING_KEY`, as the Container Apps secret `jwt-signing-key` | Base64, 32 or more bytes. Signs and checks access tokens. Production refuses to start without one |
| `Database__SeedSampleData` | `infra/deploy.sh`, from `SEED_SAMPLE_DATA`, only if set | `true` seeds the sample facilities and users. Default `false` |
| `ApiDocs__Enabled` | `infra/deploy.sh`, from `API_DOCS`, only if set | `true` serves the OpenAPI document and the Scalar docs. Default `false` |
| `Bootstrap__AdminKfupmId` | `infra/deploy.sh`, from `ADMIN_KFUPM_ID`, only if set | The KFUPM id that registers as an admin. Without it, nobody can become an admin |
| `Database__MigrateOnStartup` | not set; default `true` | Applies pending migrations before the app starts |
| `ASPNETCORE_HTTP_PORTS` | `Dockerfile` | `8080` |
| `ASPNETCORE_ENVIRONMENT` | .NET image default | `Production` |

`ASPNETCORE_HTTPS_PORT` is not set, on purpose. Outside Development the app
calls `UseHttpsRedirection`, and without a known HTTPS port that does nothing.
With one set, it would redirect every request, because every request reaches
the container as plain HTTP: the ingress ends TLS, and the probes call port
8080 directly. The ingress has `allowInsecure: false`, so it redirects HTTP
to HTTPS at the edge.

`infra/deploy.sh` itself reads:

| Variable | Required | Value |
|---|---|---|
| `PG_ADMIN_PASSWORD` | always | 16 or more letters and digits. Use the same value on every run; the server is set to it |
| `IMAGE` | first run | Image to run. Later runs keep the running one unless this is set |
| `CORS_ORIGIN` | always | The frontend's origin, e.g. `https://example.com`. `http://localhost:5173` until the frontend is hosted |
| `JWT_ISSUER` | always | Becomes the valid issuer and the signing key's issuer |
| `JWT_AUDIENCE` | always | Becomes the valid audience |
| `JWT_SIGNING_KEY` | always | Base64, 32 or more bytes (`openssl rand -base64 48`). Use the same value on every run, or tokens signed with the old key stop working |
| `SEED_SAMPLE_DATA` | no, but pass it on every run once set | Becomes `Database__SeedSampleData`. A run without it turns it off |
| `API_DOCS` | no, but pass it on every run once set | Becomes `ApiDocs__Enabled`. A run without it turns it off |
| `ADMIN_KFUPM_ID` | no, but pass it on every run once set | Becomes `Bootstrap__AdminKfupmId`. A run without it turns it off |

The script replaces the app's secrets and environment on every run, which is
why the optional values have to be passed again.

The workflow reads three repository secrets: `AZURE_CLIENT_ID`,
`AZURE_TENANT_ID` and `AZURE_SUBSCRIPTION_ID`. They identify the Azure
identity it signs in as through OpenID Connect; no Azure password is stored
anywhere.

## One-time setup

Needs the Azure CLI and the GitHub CLI, both signed in.

1. Pick the subscription and create the resource group:

   ```sh
   az login
   az account set --subscription "<subscription name or id>"
   az group create --name kfupm-facility-booking-rg --location centralindia
   ```

2. Create the identity the workflow signs in as, trust GitHub's tokens for
   runs on `main`, and give it Contributor on the resource group only. The
   subject carries the account and repository IDs (`@101219769`,
   `@796713235`) because that is the form GitHub puts in the token; the
   failed `azure/login` step prints it as "subject claim" if it differs.

   ```sh
   SUBSCRIPTION_ID=$(az account show --query id -o tsv)
   TENANT_ID=$(az account show --query tenantId -o tsv)
   APP_ID=$(az ad app create --display-name kfupm-facility-booking-github --query appId -o tsv)
   az ad sp create --id "$APP_ID"
   az ad app federated-credential create --id "$APP_ID" --parameters '{
     "name": "github-main",
     "issuer": "https://token.actions.githubusercontent.com",
     "subject": "repo:MoFadel26@101219769/kfupm-facility-booking@796713235:ref:refs/heads/main",
     "audiences": ["api://AzureADTokenExchange"]
   }'
   az role assignment create --assignee "$APP_ID" --role Contributor \
     --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/kfupm-facility-booking-rg"
   gh secret set AZURE_CLIENT_ID --body "$APP_ID"
   gh secret set AZURE_TENANT_ID --body "$TENANT_ID"
   gh secret set AZURE_SUBSCRIPTION_ID --body "$SUBSCRIPTION_ID"
   ```

3. Run the workflow on `main` and wait for it:

   ```sh
   gh workflow run deploy.yml --ref main
   gh run watch
   ```

   The image job pushes the first image. The deploy job fails this one
   time, because the container app does not exist until step 5.

4. Make the image public so Container Apps can pull it without a
   credential. Open
   `https://github.com/users/MoFadel26/packages/container/kfupm-facility-booking/settings`,
   then "Change visibility" and choose Public. GitHub has no CLI or API for
   this. The image contains no secrets.

5. Create the database, the Container Apps environment and the app:

   ```sh
   export PG_ADMIN_PASSWORD=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 32)
   echo "$PG_ADMIN_PASSWORD"    # store it; every later run needs the same value
   export JWT_SIGNING_KEY=$(openssl rand -base64 48)
   echo "$JWT_SIGNING_KEY"      # store it; every later run needs the same value
   export IMAGE=ghcr.io/mofadel26/kfupm-facility-booking:$(git rev-parse origin/main)
   export CORS_ORIGIN=http://localhost:5173
   export JWT_ISSUER=<issuer>
   export JWT_AUDIENCE=<audience>
   export SEED_SAMPLE_DATA=true   # optional
   export API_DOCS=true           # optional
   export ADMIN_KFUPM_ID=<KFUPM id>   # optional; registers as an admin
   infra/deploy.sh
   ```

   The last line it prints is the app's URL. The first start applies the
   migrations, so the first request can take a minute. Check it with
   `curl https://<app url>/health/ready`, which answers `Healthy`.

6. Re-run the deploy job from step 3 so the run goes green. It sets the
   image that is already running.

   ```sh
   gh run rerun --failed
   ```

From then on, running the workflow deploys the commit it runs on.

## Running the image locally

```sh
docker network create rm
docker run -d --name rm-pg --network rm \
  -e POSTGRES_PASSWORD=local -e POSTGRES_DB=resource_manager postgres:16
docker build -f ResourceManager.Api/Dockerfile -t kfupm-facility-booking .
docker run --rm --name rm-api --network rm -p 127.0.0.1:8080:8080 \
  -e ConnectionStrings__DefaultConnection="Host=rm-pg;Database=resource_manager;Username=postgres;Password=local" \
  -e Cors__AllowedOrigins__0=http://localhost:5173 \
  -e Authentication__Schemes__Bearer__ValidIssuer=<issuer> \
  -e Authentication__Schemes__Bearer__ValidAudiences__0=<audience> \
  -e Authentication__Schemes__Bearer__SigningKeys__0__Issuer=<issuer> \
  -e Authentication__Schemes__Bearer__SigningKeys__0__Value="$(openssl rand -base64 48)" \
  -e Database__SeedSampleData=true \
  kfupm-facility-booking
```

Then `curl http://127.0.0.1:8080/health/ready` answers `Healthy`. The run
logs a warning that it failed to determine the HTTPS port for redirect; that
is the redirect doing nothing, as intended.
