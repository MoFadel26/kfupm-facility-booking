#!/usr/bin/env bash
# Creates or updates everything the API runs on in Azure. Safe to re-run:
# each resource is created only if it is missing, and the container app's
# configuration is applied again from the values below.
#
# Needs the az CLI, logged in (az login), and in the environment:
#   PG_ADMIN_PASSWORD  letters and digits only, 16 or more characters. Pass
#                      the same one every run; the server is set to it.
#   IMAGE              the image to run. Required on the first run, when the
#                      container app does not exist. Later runs keep the image
#                      that is running, which the deploy workflow sets.
#   CORS_ORIGIN        the origin the frontend is served from, e.g.
#                      https://example.com. Production refuses to start
#                      without one.
#   JWT_ISSUER         the issuer the API puts in the tokens it issues and
#                      expects in access tokens. Also the issuer of the
#                      signing key.
#   JWT_AUDIENCE       the audience the API puts in its tokens and expects.
#   JWT_SIGNING_KEY    base64, 32 or more bytes (openssl rand -base64 48).
#                      Signs and checks access tokens. Stored as a Container
#                      Apps secret.
#   SEED_SAMPLE_DATA   optional; true seeds the sample facilities and users.
#   API_DOCS           optional; true serves the OpenAPI document and the
#                      Scalar docs.
#   ADMIN_KFUPM_ID     optional; the KFUPM id that registers as an admin.
#
# The configuration below replaces the app's secrets and environment on every
# run, so pass the optional values on every run once set: a run without them
# turns them off.
#
# docs/deploy.md gives the order this fits into.
set -euo pipefail

LOCATION=centralindia
RESOURCE_GROUP=kfupm-facility-booking-rg      # also in .github/workflows/deploy.yml
PG_SERVER=kfupm-facility-booking-db           # globally unique: <name>.postgres.database.azure.com
PG_ADMIN_USER=resourcemanager
PG_DATABASE=resource_manager
CONTAINERAPPS_ENV=kfupm-facility-booking-env
APP_NAME=kfupm-facility-booking               # also in .github/workflows/deploy.yml

: "${PG_ADMIN_PASSWORD:?set PG_ADMIN_PASSWORD}"
# Letters and digits only, so the password needs no quoting in the connection
# string or the YAML below. Upper, lower and digits meet Azure's complexity rule.
if ! [[ "$PG_ADMIN_PASSWORD" =~ ^[A-Za-z0-9]{16,}$ ]]; then
  echo "PG_ADMIN_PASSWORD must be 16 or more letters and digits" >&2
  exit 1
fi
: "${CORS_ORIGIN:?set CORS_ORIGIN, e.g. https://example.com}"
: "${JWT_ISSUER:?set JWT_ISSUER}"
: "${JWT_AUDIENCE:?set JWT_AUDIENCE}"
: "${JWT_SIGNING_KEY:?set JWT_SIGNING_KEY, e.g. openssl rand -base64 48}"
# Base64 characters only, so the key needs no quoting in the YAML below.
if ! [[ "$JWT_SIGNING_KEY" =~ ^[A-Za-z0-9+/]{43,}={0,2}$ ]]; then
  echo "JWT_SIGNING_KEY must be base64 of 32 or more bytes" >&2
  exit 1
fi
SEED_SAMPLE_DATA="${SEED_SAMPLE_DATA:-}"
API_DOCS="${API_DOCS:-}"
ADMIN_KFUPM_ID="${ADMIN_KFUPM_ID:-}"

echo "-- CLI extension and resource providers"
az extension add --name containerapp --upgrade --only-show-errors
for namespace in Microsoft.App Microsoft.OperationalInsights Microsoft.DBforPostgreSQL; do
  az provider register --namespace "$namespace" --wait
done

# Checked before anything slow is created, so a missing IMAGE fails at once.
app_exists=false
if az containerapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" -o none 2>/dev/null; then
  app_exists=true
  IMAGE="${IMAGE:-$(az containerapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" \
    --query 'properties.template.containers[0].image' -o tsv)}"
fi
: "${IMAGE:?set IMAGE, e.g. ghcr.io/mofadel26/kfupm-facility-booking:<commit sha>}"

echo "-- resource group $RESOURCE_GROUP"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o none

echo "-- PostgreSQL server $PG_SERVER"
if az postgres flexible-server show -g "$RESOURCE_GROUP" -n "$PG_SERVER" -o none 2>/dev/null; then
  az postgres flexible-server update -g "$RESOURCE_GROUP" -n "$PG_SERVER" \
    --admin-password "$PG_ADMIN_PASSWORD" -o none
else
  # Public access with no firewall rule yet; the rule below admits Azure
  # services only.
  az postgres flexible-server create -g "$RESOURCE_GROUP" -n "$PG_SERVER" \
    --location "$LOCATION" \
    --version 16 --tier Burstable --sku-name Standard_B1ms --storage-size 32 \
    --high-availability Disabled \
    --admin-user "$PG_ADMIN_USER" --admin-password "$PG_ADMIN_PASSWORD" \
    --public-access None --yes -o none
fi

# On by default; set so the requirement is stated here and not assumed.
az postgres flexible-server parameter set -g "$RESOURCE_GROUP" --server-name "$PG_SERVER" \
  --name require_secure_transport --value on -o none

# The first migration runs CREATE EXTENSION btree_gist for the reservation
# overlap constraint. Flexible Server refuses any extension not on this list,
# so it is set before the app starts and migrates. The value replaces the
# list; add any later extension here too.
az postgres flexible-server parameter set -g "$RESOURCE_GROUP" --server-name "$PG_SERVER" \
  --name azure.extensions --value BTREE_GIST -o none

# 0.0.0.0 to 0.0.0.0 is Azure's notation for "any Azure service", which is how
# the container app reaches the server: its outbound address is not fixed.
az postgres flexible-server firewall-rule create -g "$RESOURCE_GROUP" --name "$PG_SERVER" \
  --rule-name AllowAzureServices --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 -o none

if ! az postgres flexible-server db show -g "$RESOURCE_GROUP" --server-name "$PG_SERVER" \
    --database-name "$PG_DATABASE" -o none 2>/dev/null; then
  az postgres flexible-server db create -g "$RESOURCE_GROUP" --server-name "$PG_SERVER" \
    --database-name "$PG_DATABASE" -o none
fi

PG_HOST=$(az postgres flexible-server show -g "$RESOURCE_GROUP" -n "$PG_SERVER" \
  --query fullyQualifiedDomainName -o tsv)
# VerifyFull: encrypted, and the server certificate is checked against the
# system CA store and the host name.
CONNECTION="Host=$PG_HOST;Port=5432;Database=$PG_DATABASE;Username=$PG_ADMIN_USER;Password=$PG_ADMIN_PASSWORD;SSL Mode=VerifyFull"

echo "-- Container Apps environment $CONTAINERAPPS_ENV"
if ! az containerapp env show -g "$RESOURCE_GROUP" -n "$CONTAINERAPPS_ENV" -o none 2>/dev/null; then
  # Workload profiles, the CLI default, stated because the forwarded-headers
  # setting below relies on the address ranges this environment type reserves.
  az containerapp env create -g "$RESOURCE_GROUP" -n "$CONTAINERAPPS_ENV" \
    --location "$LOCATION" --enable-workload-profiles true -o none
fi
ENV_ID=$(az containerapp env show -g "$RESOURCE_GROUP" -n "$CONTAINERAPPS_ENV" --query id -o tsv)

echo "-- container app $APP_NAME"

seed_env=""
if [ -n "$SEED_SAMPLE_DATA" ]; then
  seed_env="
          - name: Database__SeedSampleData
            value: \"$SEED_SAMPLE_DATA\""
fi

docs_env=""
if [ -n "$API_DOCS" ]; then
  docs_env="
          - name: ApiDocs__Enabled
            value: \"$API_DOCS\""
fi

admin_env=""
if [ -n "$ADMIN_KFUPM_ID" ]; then
  admin_env="
          - name: Bootstrap__AdminKfupmId
            value: \"$ADMIN_KFUPM_ID\""
fi

# The spec holds the connection string and the signing key, so it is private
# and deleted on exit.
spec=$(mktemp)
chmod 600 "$spec"
trap 'rm -f "$spec"' EXIT

# ASPNETCORE_HTTPS_PORT is deliberately not set. Program.cs calls
# UseHttpsRedirection outside Development, and with no HTTPS port known that
# middleware does nothing. With one set, it would redirect every request that
# reaches the container, and all of them do arrive as plain HTTP: the ingress
# ends TLS and forwards HTTP, and the probes call port 8080 directly, where a
# redirect would count as healthy without the database being asked. HTTPS is
# enforced at the edge instead: allowInsecure: false makes the ingress
# redirect HTTP to HTTPS itself.
#
# ForwardedHeaders__KnownNetworks: the API believes X-Forwarded-For, and so
# rate limits sign-in per client, only from these senders. They are the ranges
# a workload profile environment reserves for the platform (see "Restrictions
# for subnet address ranges" in the Container Apps virtual network docs), so
# nothing but Container Apps' own infrastructure sends from them. Microsoft
# does not document the ingress proxy's address itself; docs/deploy.md has
# the check to run after the first deploy.
#
# Probes: startup and readiness call /health/ready, which checks the database.
# Liveness calls /health/live, which checks nothing, so a database outage
# takes the replica out of rotation instead of restarting it over and over.
# Container Apps caps failureThreshold at 10, so the startup window, which
# covers migrations and a cold database, is 10s + 10 x 10s.
cat > "$spec" <<YAML
location: $LOCATION
name: $APP_NAME
properties:
  managedEnvironmentId: $ENV_ID
  configuration:
    activeRevisionsMode: Single
    ingress:
      external: true
      targetPort: 8080
      transport: auto
      allowInsecure: false
    secrets:
      - name: db-connection
        value: "$CONNECTION"
      - name: jwt-signing-key
        value: "$JWT_SIGNING_KEY"
  template:
    containers:
      - name: $APP_NAME
        image: $IMAGE
        resources:
          cpu: 0.5
          memory: 1Gi
        env:
          - name: ConnectionStrings__DefaultConnection
            secretRef: db-connection
          - name: Cors__AllowedOrigins__0
            value: "$CORS_ORIGIN"
          - name: Authentication__Schemes__Bearer__ValidIssuer
            value: "$JWT_ISSUER"
          - name: Authentication__Schemes__Bearer__ValidAudiences__0
            value: "$JWT_AUDIENCE"
          - name: Authentication__Schemes__Bearer__SigningKeys__0__Issuer
            value: "$JWT_ISSUER"
          - name: Authentication__Schemes__Bearer__SigningKeys__0__Value
            secretRef: jwt-signing-key
          - name: ForwardedHeaders__KnownNetworks__0
            value: "100.100.0.0/17"
          - name: ForwardedHeaders__KnownNetworks__1
            value: "100.100.128.0/19"
          - name: ForwardedHeaders__KnownNetworks__2
            value: "100.100.160.0/19"
          - name: ForwardedHeaders__KnownNetworks__3
            value: "100.100.192.0/19"$seed_env$docs_env$admin_env
        probes:
          - type: Startup
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 10
          - type: Readiness
            httpGet:
              path: /health/ready
              port: 8080
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          - type: Liveness
            httpGet:
              path: /health/live
              port: 8080
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
    scale:
      minReplicas: 0
      maxReplicas: 1
YAML

if $app_exists; then
  az containerapp update -g "$RESOURCE_GROUP" -n "$APP_NAME" --yaml "$spec" -o none
else
  az containerapp create -g "$RESOURCE_GROUP" -n "$APP_NAME" --yaml "$spec" -o none
fi

echo "-- done"
echo "https://$(az containerapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" \
  --query properties.configuration.ingress.fqdn -o tsv)"
