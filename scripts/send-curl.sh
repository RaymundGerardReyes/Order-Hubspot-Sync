#!/usr/bin/env bash
# Standalone bash curl sender matching Stage 2 brief specification

# Load WEBHOOK_SECRET from .env if present
if [ -f .env ]; then
  ENV_SECRET=$(grep -E '^WEBHOOK_SECRET=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
fi

SECRET="${ENV_SECRET:-${WEBHOOK_SECRET:-stage2_secret_key_super_secure_99}}"
ORDER_ID="${1:-ORD-10482}"

BODY="{\"event\":\"order.created\",\"order_id\":\"$ORDER_ID\",\"created_at\":\"2026-09-20T14:32:00+08:00\",\"customer\":{\"email\":\"maria.santos@example.com\",\"first_name\":\"Maria\",\"last_name\":\"Santos\",\"phone\":\"+639171234567\"},\"items\":[{\"sku\":\"TSH-BLK-M\",\"name\":\"Black Tee (M)\",\"qty\":2,\"price\":450.00}],\"currency\":\"PHP\",\"total\":900.00}"

SIG=$(printf "%s" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')

echo "[send-curl] Order:     $ORDER_ID"
echo "[send-curl] Secret:    $SECRET"
echo "[send-curl] Signature: $SIG"

curl -X POST "http://localhost:3001/webhooks/orders" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIG" \
  -d "$BODY"

echo ""
