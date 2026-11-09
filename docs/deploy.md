# Deploy

Production runs on Google Cloud, in one project, in `me-central1` (Doha, the
nearest region to Saudi Arabia that a normal account can use; Dammam,
`me-central2`, needs billing through CNTXT):

```
browser --HTTPS--> Firebase Hosting   https://<project id>.web.app   (frontend/dist)
   |
   +----HTTPS--> Cloud Run service kfupm-facility-booking   (the API, port 8080)
                   |-- Unix socket --> Cloud SQL for PostgreSQL kfupm-facility-booking-db
                   |-- at start -----> Secret Manager: db-connection, jwt-signing-key
                   +-- image from ---> Artifact Registry kfupm-facility-booking/api

GitHub Actions (deploy.yml) --Workload Identity Federation--> push image, update service
```

- `ResourceManager.Api/Dockerfile` builds the image, with the repository root
  as the build context. The image runs the API on port 8080 as a non-root user.
- `.github/workflows/deploy.yml` runs only when started by hand. It pushes
  `me-central1-docker.pkg.dev/<project id>/kfupm-facility-booking/api:<commit sha>`
  and points the Cloud Run service at it. Nothing else about the service
  changes. Then it builds the frontend against the service's URL and uploads
  it to Firebase Hosting. The tests run in the CI workflow on every push to
  `main`.
- `frontend/firebase.json` serves `frontend/dist` and sends every path to
  `index.html`, because the app routes in the browser.
- Pending migrations are applied when the container starts
  (`Database:MigrateOnStartup` defaults to true). That is safe because the
  service is capped at one instance.
- The startup probe calls `/health/ready`, which answers 200 when the
  database answers. The liveness probe calls `/health/live`, which checks
  nothing, so a database outage does not restart the container over and over.

The first migration runs `CREATE EXTENSION btree_gist`. Cloud SQL allows it
for any user with the `cloudsqlsuperuser` role, which every user created in
the console has.

## Names and settings

| Thing | Name | Settings |
|---|---|---|
| Region | `me-central1` | Also in `deploy.yml` |
| Artifact Registry repository | `kfupm-facility-booking` | Docker, `me-central1`. Immutable tags off: with them on, cleanup cannot delete tagged images, and a re-run of the same commit cannot push. Cleanup policies, in "Delete artifacts" mode: `delete-all` (conditional delete, tag state any) and `keep-3` (keep the 3 most recent versions). Each build is one version, because the workflow turns off the provenance attestation |
| Cloud SQL instance | `kfupm-facility-booking-db` | PostgreSQL 17, Enterprise edition, Sandbox preset, shared core (1 vCPU, 0.614 GB), 10 GB HDD, single zone, public IP with no authorized networks, no automated backups |
| Database | `resource_manager` | |
| Database user | `resourcemanager` | Built-in authentication, password of letters and digits only |
| Secret | `db-connection` | `Host=/cloudsql/<project id>:me-central1:kfupm-facility-booking-db;Database=resource_manager;Username=resourcemanager;Password=<password>` |
| Secret | `jwt-signing-key` | Output of `openssl rand -base64 48` |
| Runtime service account | `kfupm-api-runtime` | Roles: Cloud SQL Client, Secret Manager Secret Accessor |
| Cloud Run service | `kfupm-facility-booking` | See below. Also in `deploy.yml` |
| Deploy service account | `github-deployer` | Roles on the project: Artifact Registry Writer, Cloud Run Developer, Firebase Hosting Admin, Service Usage Viewer (the Firebase CLI checks that the Hosting API is on before it deploys). Service Account User on `kfupm-api-runtime` only |
| Workload Identity pool | `github` | Provider `github-actions`, see below |
| Firebase Hosting site | `<project id>` | Serves `https://<project id>.web.app` and `https://<project id>.firebaseapp.com` |

The connection string has no `SSL Mode`. The Unix socket goes to the Cloud
SQL Auth Proxy that Cloud Run runs next to the container, and the proxy
encrypts the connection to the instance.

### Cloud Run service

- Container image: the one the workflow pushed. Container port `8080`.
- Ingress: All. Authentication: allow public access.
- CPU 1, memory 512 MiB, CPU only during requests. Minimum instances 0,
  maximum instances 1.
- Security: service account `kfupm-api-runtime`.
- Cloud SQL connections: `<project id>:me-central1:kfupm-facility-booking-db`.
- Startup probe: HTTP `/health/ready`, port 8080, initial delay 10 s,
  period 10 s, timeout 5 s, failure threshold 10.
- Liveness probe: HTTP `/health/live`, port 8080, period 10 s, timeout 5 s,
  failure threshold 3.

| Variable | Source | Value |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | secret `db-connection`, latest | |
| `Authentication__Schemes__Bearer__SigningKeys__0__Value` | secret `jwt-signing-key`, latest | Base64, 32 or more bytes. Production refuses to start without one |
| `Authentication__Schemes__Bearer__ValidIssuer` | plain | `kfupm-facility-booking`. Production refuses to start without one |
| `Authentication__Schemes__Bearer__SigningKeys__0__Issuer` | plain | Same as `ValidIssuer` |
| `Authentication__Schemes__Bearer__ValidAudiences__0` | plain | `kfupm-facility-booking-web`. Production refuses to start without one |
| `Cors__AllowedOrigins__0` | plain | `https://<project id>.web.app`. Production refuses to start without one |
| `Cors__AllowedOrigins__1` | plain | `https://<project id>.firebaseapp.com` |
| `ForwardedHeaders__KnownNetworks__0` | plain | `0.0.0.0/0` |
| `ForwardedHeaders__KnownNetworks__1` | plain | `::/0` |
| `Database__SeedSampleData` | plain, optional | `true` seeds the sample facilities and users |
| `ApiDocs__Enabled` | plain, optional | `true` serves the OpenAPI document and the Scalar docs |
| `Bootstrap__AdminKfupmId` | plain, optional | The KFUPM id that registers as an admin. Without it, nobody can become an admin |
| `RateLimiting__Auth__PermitLimit` | not set; default `5` | Login and register attempts per client address per minute |
| `Database__MigrateOnStartup` | not set; default `true` | |
| `ASPNETCORE_HTTP_PORTS` | `Dockerfile` | `8080` |
| `ASPNETCORE_ENVIRONMENT` | .NET image default | `Production` |

`ForwardedHeaders__KnownNetworks` trusts `X-Forwarded-For` from every sender.
A Cloud Run service has no network path except through Google's front end,
so every sender is that front end. Google does not document the address the
front end connects from, which is why no narrower range is set. The API
takes only the last entry of the header. Google does not document either
that its front end appends the client address as the last entry; step 10 of
the setup checks both.

`ASPNETCORE_HTTPS_PORT` is not set, on purpose. Outside Development the app
calls `UseHttpsRedirection`, and without a known HTTPS port that does nothing.
With one set, it would redirect every request, because every request reaches
the container as plain HTTP: Cloud Run ends TLS in front of it.

### Workload Identity Federation

The workflow signs in as `github-deployer` with a token GitHub issues to the
run. No Google key is stored anywhere.

- Pool `github`, provider `github-actions`, type OpenID Connect, issuer
  `https://token.actions.githubusercontent.com`.
- Attribute mapping: `google.subject` = `assertion.sub`,
  `attribute.repository` = `assertion.repository`.
- Attribute condition:
  `assertion.repository_id == '796713235' && assertion.ref == 'refs/heads/main'`.
  The repository id does not change if the repository is renamed.
- On `github-deployer`, grant Workload Identity User to
  `principalSet://iam.googleapis.com/projects/<project number>/locations/global/workloadIdentityPools/github/attribute.repository/MoFadel26/kfupm-facility-booking`.

The workflow reads three repository variables (Settings > Secrets and
variables > Actions > Variables). None of them is secret.

| Variable | Value |
|---|---|
| `GCP_PROJECT_ID` | The project id |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<project number>/locations/global/workloadIdentityPools/github/providers/github-actions` |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | `github-deployer@<project id>.iam.gserviceaccount.com` |

## One-time setup

1. Create the Google Cloud account (free trial) and a project. Add a budget
   with email alerts.
2. Enable the APIs: Cloud Run Admin, Artifact Registry, Cloud SQL Admin,
   Secret Manager, IAM Service Account Credentials, Security Token Service.
3. Create the Artifact Registry repository.
4. Create the Cloud SQL instance, then the database and the user. The
   instance takes about 10 minutes.
5. Create the two secrets.
6. Create `kfupm-api-runtime` and give it its roles.
7. Create `github-deployer`, the Workload Identity pool and provider, and
   the three repository variables.
8. Run the workflow on `main`:

   ```sh
   gh workflow run deploy.yml --ref main
   gh run watch
   ```

   The image job pushes the first image. The deploy job fails this one time,
   because the service does not exist until step 9.

9. Create the Cloud Run service from that image with the settings above.
   The first start applies the migrations. Check it with
   `curl https://<service url>/health/ready`, which answers `Healthy`.
   Then re-run the failed deploy job so the run goes green:
   `gh run rerun --failed`.

10. Check that the sign-in rate limit tells clients apart and cannot be
    dodged. From one machine, send six failed logins inside a minute, each
    with a different made-up `X-Forwarded-For`:

    ```sh
    for i in 1 2 3 4 5 6; do
      curl -s -o /dev/null -w '%{http_code}\n' -X POST https://<service url>/api/auth/login \
        -H "X-Forwarded-For: 203.0.113.$i" \
        -H 'Content-Type: application/json' -d '{"kfupmId":"0","password":"x"}'
    done
    ```

    The sixth answers `429`; if it answers `401`, the API is reading an
    address the client chose, so remove the two `KnownNetworks` variables.
    Then, within that minute, log in from a different network (a phone off
    Wi-Fi). It should answer `401` or `200`, not `429`.

11. Add Firebase to the project (console.firebase.google.com > Add project >
    pick the existing project), then build and deploy the frontend from
    `frontend/`:

    ```sh
    npm ci
    VITE_API_BASE_URL=https://<service url> npm run build
    npx firebase-tools@15 login
    npx firebase-tools@15 deploy --only hosting --project <project id>
    ```

    Open `https://<project id>.web.app` and sign in.

From then on, running the workflow deploys the API and the frontend at the
commit it runs on.

## Cost

The free trial gives $300 for 90 days. Cloud SQL is the only part that
charges from the first hour, about $10 a month for the settings above,
whether or not anyone uses it; stopping the instance stops the compute
charge. Cloud Run, Artifact Registry (0.5 GB), Secret Manager and Firebase
Hosting stay inside their free monthly amounts at this traffic. When the
trial ends, the resources stop until the account is upgraded to a paid one.

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
