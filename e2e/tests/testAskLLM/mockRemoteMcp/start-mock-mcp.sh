#!/bin/bash
set -e

# 1. Start Keycloak in the background WITH the CIMD feature flag
export KC_BOOTSTRAP_ADMIN_USERNAME=admin
export KC_BOOTSTRAP_ADMIN_PASSWORD=admin
/opt/keycloak/bin/kc.sh start-dev --features=cimd --http-host=0.0.0.0 &
 

echo "Waiting for Keycloak HTTP API to initialize..."
until node -e '
fetch("http://127.0.0.1:8080/realms/master/.well-known/openid-configuration")
  .then((response) => process.exit(response.ok ? 0 : 1))
  .catch(() => process.exit(1));
'; do
  sleep 2
done
echo "Keycloak is ready."


# 2. Provision the 'mcp' realm
KCADM="/opt/keycloak/bin/kcadm.sh"
$KCADM config credentials --server http://localhost:8080 --realm master --user admin --password admin

# Create the realm
$KCADM create realms -s realm=mcp -s enabled=true


# ---Configure Trusted Hosts for Dynamic Client Registration ---
echo "Configuring Trusted Hosts for Client Registration..."

# 1. Get the component ID for the Trusted Hosts policy
TRUSTED_HOSTS_ID=$($KCADM get components -r mcp | node -e '
  const data = require("fs").readFileSync(0, "utf-8");
  const comp = JSON.parse(data).find(c => c.providerId === "trusted-hosts");
  if (comp) console.log(comp.id);
')

# 2. Update the policy to trust your local/Docker hostnames
if [ -n "$TRUSTED_HOSTS_ID" ]; then
  $KCADM update components/$TRUSTED_HOSTS_ID -r mcp \
    -s 'config."host-sending-registration-request-must-match"=["true"]' \
    -s 'config."client-uris-must-match"=["true"]' \
    -s 'config."trusted-hosts"=["localhost", "172.17.0.1", "127.0.0.1", "host.docker.internal"]'
  echo "Trusted Hosts policy updated."
fi
# --------------------------------------------------------------------
 

# Static client (Client Credentials + Auth Code with pre-registered client)
$KCADM create clients -r mcp -f - <<'EOF'
{
  "clientId": "static-client",
  "enabled": true,
  "publicClient": false,
  "secret": "static-secret",
  "standardFlowEnabled": true,
  "serviceAccountsEnabled": true,
  "directAccessGrantsEnabled": true,
  "consentRequired": true,
  "redirectUris": ["*"],
  "webOrigins": ["*"],
  "attributes": {
    "pkce.code.challenge.method": "S256"
  }
}
EOF


echo "Realm and static client provisioned."

$KCADM create users -r mcp \
    -s username=admin1 \
    -s enabled=true \
    -s email=admin1@example.com \
    -s emailVerified=true \
    -s firstName=Admin1 \
    -s lastName=User

$KCADM set-password -r mcp \
    --username admin1 \
    --new-password admin1

# 3. Start the Mock TS Server in the foreground
echo "Starting TS Mock MCP Server..."
until node -e '
fetch("http://127.0.0.1:8080/realms/master/.well-known/openid-configuration")
  .then((response) => process.exit(response.ok ? 0 : 1))
  .catch(() => process.exit(1));
'; do
  sleep 2
done
npx tsx server.ts