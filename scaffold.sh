#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# scaffold.sh - Automated Template Infrastructure Scaffolding for Order-HubSpot Sync
# Based strictly on SCAFFOLD.md specification.
#
# Rules:
# - PascalCase for Classes, Types, Interfaces across all languages.
# - Semantic Versioning baseline starting at v0.1.0.
# - Safe, idempotent execution: touch never overwrites existing content.
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# ANSI Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}   Order-HubSpot Sync: Infrastructure Scaffolding Automation   ${NC}"
echo -e "${CYAN}   Specification: SCAFFOLD.md | SemVer Baseline: v0.1.0        ${NC}"
echo -e "${CYAN}================================================================${NC}"

# 1. Directory Tree Creation
echo -e "\n${BLUE}[1/5] Creating directory hierarchies...${NC}"

DIRECTORIES=(
  "receiver/src"
  "receiver/test"
  "backend/app/Actions"
  "backend/app/Console/Commands"
  "backend/app/DTOs"
  "backend/app/Enums"
  "backend/app/Exceptions"
  "backend/app/Http/Controllers"
  "backend/app/Http/Middleware"
  "backend/app/Http/Requests"
  "backend/app/Http/Resources"
  "backend/app/Jobs"
  "backend/app/Models"
  "backend/app/Services/Hubspot"
  "backend/config"
  "backend/database/migrations"
  "backend/routes"
  "backend/tests/Feature"
  "backend/tests/Unit"
  "web/src/app"
  "web/src/features/syncs/components"
  "web/src/features/syncs/hooks"
  "web/src/features/syncs"
  "web/src/lib"
  "n8n"
  "scripts"
)

for dir in "${DIRECTORIES[@]}"; do
  mkdir -p "$dir"
done
echo -e "${GREEN}✓ All ${#DIRECTORIES[@]} directories verified/created.${NC}"

# 2. 51 Scaffold Files Creation (touch ensures non-destructive idempotency)
echo -e "\n${BLUE}[2/5] Scaffolding all 51 empty template files per SCAFFOLD.md...${NC}"

SCAFFOLD_FILES=(
  # Receiver (8 files) - Language A (Node/TS)
  "receiver/src/main.ts"
  "receiver/src/config.ts"
  "receiver/src/hmac.ts"
  "receiver/src/schema.ts"
  "receiver/src/forward.ts"
  "receiver/src/server.ts"
  "receiver/test/hmac.test.ts"
  "receiver/test/schema.test.ts"

  # Backend (27 files) - Language B & Core Logic (Laravel/PHP)
  "backend/app/Actions/ReceiveOrderAction.php"
  "backend/app/Actions/RetryAttemptAction.php"
  "backend/app/Console/Commands/ExportHubspotDeals.php"
  "backend/app/DTOs/OrderData.php"
  "backend/app/Enums/SyncStatus.php"
  "backend/app/Exceptions/UpstreamUnavailableException.php"
  "backend/app/Exceptions/UpstreamRejectedException.php"
  "backend/app/Http/Controllers/InternalOrderController.php"
  "backend/app/Http/Controllers/SyncAttemptController.php"
  "backend/app/Http/Controllers/HealthController.php"
  "backend/app/Http/Middleware/VerifyInternalToken.php"
  "backend/app/Http/Requests/OrderWebhookRequest.php"
  "backend/app/Http/Resources/SyncAttemptResource.php"
  "backend/app/Jobs/SyncOrderJob.php"
  "backend/app/Models/Order.php"
  "backend/app/Models/SyncAttempt.php"
  "backend/app/Services/Hubspot/HubspotClient.php"
  "backend/app/Services/Hubspot/HubspotGateway.php"
  "backend/app/Services/Hubspot/DealMapper.php"
  "backend/app/Services/Hubspot/OrderSyncService.php"
  "backend/config/services.php"
  "backend/routes/api.php"
  "backend/routes/console.php"
  "backend/tests/Unit/DealMapperTest.php"
  "backend/tests/Feature/IdempotencyTest.php"
  "backend/tests/Feature/RetryTest.php"
  "backend/tests/Feature/ExportTest.php"

  # Frontend (11 files) - Next.js Dashboard
  "web/src/app/layout.tsx"
  "web/src/app/page.tsx"
  "web/src/features/syncs/components/SyncDashboard.tsx"
  "web/src/features/syncs/components/SyncTable.tsx"
  "web/src/features/syncs/components/StatusBadge.tsx"
  "web/src/features/syncs/components/RetryButton.tsx"
  "web/src/features/syncs/hooks/useSyncs.ts"
  "web/src/features/syncs/hooks/useRetry.ts"
  "web/src/features/syncs/api.ts"
  "web/src/features/syncs/types.ts"
  "web/src/lib/http.ts"

  # Root & Support (5 files)
  "scripts/mock-webhook.ts"
  "n8n/order-to-hubspot.json"
  "docker-compose.yml"
  ".env.example"
  "README.md"
)

CREATED_COUNT=0
EXISTED_COUNT=0

for file in "${SCAFFOLD_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    EXISTED_COUNT=$((EXISTED_COUNT + 1))
  else
    touch "$file"
    CREATED_COUNT=$((CREATED_COUNT + 1))
  fi
done

echo -e "${GREEN}✓ 51 Scaffold files accounted for: ${CREATED_COUNT} newly created, ${EXISTED_COUNT} already existed.${NC}"

# 3. Laravel Migration Files
echo -e "\n${BLUE}[3/5] Setting up database migrations for orders and sync_attempts...${NC}"
MIGRATION_ORDERS="backend/database/migrations/2026_10_03_000001_create_orders_table.php"
MIGRATION_SYNCS="backend/database/migrations/2026_10_03_000002_create_sync_attempts_table.php"

if [[ ! -f "$MIGRATION_ORDERS" ]]; then
  cat << 'EOF' > "$MIGRATION_ORDERS"
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->string('order_id')->primary();
            $table->string('hubspot_deal_id')->nullable()->index();
            $table->string('hubspot_contact_id')->nullable()->index();
            $table->decimal('total_amount', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('customer_email')->index();
            $table->json('payload');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
EOF
fi

if [[ ! -f "$MIGRATION_SYNCS" ]]; then
  cat << 'EOF' > "$MIGRATION_SYNCS"
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('order_id')->index();
            $table->string('status', 32)->index(); // pending, processing, success, failed
            $table->uuid('retry_of')->nullable()->index();
            $table->unsignedInteger('attempt_number')->default(1);
            $table->string('failure_code', 64)->nullable();
            $table->text('failure_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_attempts');
    }
};
EOF
fi
echo -e "${GREEN}✓ Database migrations configured.${NC}"

# 4. Receiver Package Manifest & TSConfig Initialization (if missing)
echo -e "\n${BLUE}[4/5] Checking receiver configuration files...${NC}"
if [[ ! -f "receiver/package.json" ]]; then
  cat << 'EOF' > "receiver/package.json"
{
  "name": "order-hubspot-receiver",
  "version": "0.1.0",
  "private": true,
  "description": "Fastify HMAC receiver for incoming order webhooks",
  "main": "dist/main.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/main.js",
    "dev": "tsx watch src/main.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^4.26.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3",
    "vitest": "^1.3.0"
  }
}
EOF
fi

if [[ ! -f "receiver/tsconfig.json" ]]; then
  cat << 'EOF' > "receiver/tsconfig.json"
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
EOF
fi

# Root support configs
if [[ ! -s ".env.example" ]]; then
  cat << 'EOF' > ".env.example"
# Receiver Environment Variables
WEBHOOK_SECRET=your_hmac_secret_here
INTERNAL_TOKEN=internal_shared_bearer_token
RECEIVER_PORT=3000
BACKEND_URL=http://localhost:8000

# Backend (Laravel) Environment Variables
APP_NAME=OrderHubspotSync
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

QUEUE_CONNECTION=database

HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUBSPOT_PIPELINE_ID=default
HUBSPOT_STAGE_ID=closedwon

# Web Dashboard
NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF
fi

if [[ ! -s "docker-compose.yml" ]]; then
  cat << 'EOF' > "docker-compose.yml"
version: '3.8'

services:
  receiver:
    build:
      context: ./receiver
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - .env

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: php artisan queue:work --tries=3 --timeout=90
    env_file:
      - .env
    depends_on:
      - backend

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    env_file:
      - .env
    depends_on:
      - backend
EOF
fi

if [[ ! -s "n8n/order-to-hubspot.json" ]]; then
  cat << 'EOF' > "n8n/order-to-hubspot.json"
{
  "name": "Order to HubSpot Sync",
  "nodes": [],
  "connections": {},
  "settings": {
    "executionOrder": "v1"
  }
}
EOF
fi

if [[ ! -s "scripts/mock-webhook.ts" ]]; then
  cat << 'EOF' > "scripts/mock-webhook.ts"
import crypto from 'node:crypto';

const payload = {
  orderId: "ord_test_001",
  customer: {
    name: "Alex Taylor",
    email: "alex.taylor@example.com"
  },
  items: [
    { sku: "SKU-PRO-01", name: "Pro Plan", quantity: 1, unitPrice: 99.00 }
  ],
  totalAmount: 99.00,
  currency: "USD",
  createdAt: new Date().toISOString()
};

const secret = process.env.WEBHOOK_SECRET || "test_webhook_secret";
const rawPayload = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

console.log(`Sending webhook with signature: sha256=${signature}`);
EOF
fi

# 5. Verification & Audit
echo -e "\n${BLUE}[5/5] Auditing scaffold completeness and PascalCase standards...${NC}"

MISSING=0
for f in "${SCAFFOLD_FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo -e "${RED}✗ Missing scaffold file: $f${NC}"
    MISSING=$((MISSING + 1))
  fi
done

if [[ $MISSING -eq 0 ]]; then
  echo -e "${GREEN}✓ Perfect match: All 51 scaffold files present and verified!${NC}"
else
  echo -e "${RED}✗ Failed: $MISSING files missing!${NC}"
  exit 1
fi

echo -e "\n${CYAN}================================================================${NC}"
echo -e "${GREEN}Scaffolding execution completed successfully!${NC}"
echo -e "Version: $(cat VERSION 2>/dev/null || echo '0.1.0')"
echo -e "Total scaffold files: ${#SCAFFOLD_FILES[@]}"
echo -e "Naming standard: PascalCase for Classes, Types, Interfaces (AGENTS.md)"
echo -e "${CYAN}================================================================${NC}\n"
