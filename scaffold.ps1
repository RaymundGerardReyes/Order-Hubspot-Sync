# ==============================================================================
# scaffold.ps1 - Automated Template Infrastructure Scaffolding for Windows PowerShell
# Based strictly on SCAFFOLD.md specification.
# ==============================================================================

$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot
Set-Location $RootDir

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   Order-HubSpot Sync: Infrastructure Scaffolding Automation   " -ForegroundColor Cyan
Write-Host "   Specification: SCAFFOLD.md | SemVer Baseline: v0.1.0        " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Directory Tree Creation
Write-Host ""
Write-Host "[1/5] Creating directory hierarchies..." -ForegroundColor Blue

$Directories = @(
  "receiver/src",
  "receiver/test",
  "backend/app/Actions",
  "backend/app/Console/Commands",
  "backend/app/DTOs",
  "backend/app/Enums",
  "backend/app/Exceptions",
  "backend/app/Http/Controllers",
  "backend/app/Http/Middleware",
  "backend/app/Http/Requests",
  "backend/app/Http/Resources",
  "backend/app/Jobs",
  "backend/app/Models",
  "backend/app/Services/Hubspot",
  "backend/config",
  "backend/database/migrations",
  "backend/routes",
  "backend/tests/Feature",
  "backend/tests/Unit",
  "web/src/app",
  "web/src/features/syncs/components",
  "web/src/features/syncs/hooks",
  "web/src/features/syncs",
  "web/src/lib",
  "n8n",
  "scripts"
)

foreach ($dir in $Directories) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
}
Write-Host "[OK] All $($Directories.Count) directories verified/created." -ForegroundColor Green

# 2. 51 Scaffold Files
Write-Host ""
Write-Host "[2/5] Scaffolding all 51 empty template files per SCAFFOLD.md..." -ForegroundColor Blue

$ScaffoldFiles = @(
  "receiver/src/main.ts",
  "receiver/src/config.ts",
  "receiver/src/hmac.ts",
  "receiver/src/schema.ts",
  "receiver/src/forward.ts",
  "receiver/src/server.ts",
  "receiver/test/hmac.test.ts",
  "receiver/test/schema.test.ts",

  "backend/app/Actions/ReceiveOrderAction.php",
  "backend/app/Actions/RetryAttemptAction.php",
  "backend/app/Console/Commands/ExportHubspotDeals.php",
  "backend/app/DTOs/OrderData.php",
  "backend/app/Enums/SyncStatus.php",
  "backend/app/Exceptions/UpstreamUnavailableException.php",
  "backend/app/Exceptions/UpstreamRejectedException.php",
  "backend/app/Http/Controllers/InternalOrderController.php",
  "backend/app/Http/Controllers/SyncAttemptController.php",
  "backend/app/Http/Controllers/HealthController.php",
  "backend/app/Http/Middleware/VerifyInternalToken.php",
  "backend/app/Http/Requests/OrderWebhookRequest.php",
  "backend/app/Http/Resources/SyncAttemptResource.php",
  "backend/app/Jobs/SyncOrderJob.php",
  "backend/app/Models/Order.php",
  "backend/app/Models/SyncAttempt.php",
  "backend/app/Services/Hubspot/HubspotClient.php",
  "backend/app/Services/Hubspot/HubspotGateway.php",
  "backend/app/Services/Hubspot/DealMapper.php",
  "backend/app/Services/Hubspot/OrderSyncService.php",
  "backend/config/services.php",
  "backend/routes/api.php",
  "backend/routes/console.php",
  "backend/tests/Unit/DealMapperTest.php",
  "backend/tests/Feature/IdempotencyTest.php",
  "backend/tests/Feature/RetryTest.php",
  "backend/tests/Feature/ExportTest.php",

  "web/src/app/layout.tsx",
  "web/src/app/page.tsx",
  "web/src/features/syncs/components/SyncDashboard.tsx",
  "web/src/features/syncs/components/SyncTable.tsx",
  "web/src/features/syncs/components/StatusBadge.tsx",
  "web/src/features/syncs/components/RetryButton.tsx",
  "web/src/features/syncs/hooks/useSyncs.ts",
  "web/src/features/syncs/hooks/useRetry.ts",
  "web/src/features/syncs/api.ts",
  "web/src/features/syncs/types.ts",
  "web/src/lib/http.ts",

  "scripts/mock-webhook.ts",
  "n8n/order-to-hubspot.json",
  "docker-compose.yml",
  ".env.example",
  "README.md"
)

$CreatedCount = 0
$ExistedCount = 0

foreach ($file in $ScaffoldFiles) {
  if (Test-Path $file) {
    $ExistedCount++
  } else {
    New-Item -ItemType File -Path $file -Force | Out-Null
    $CreatedCount++
  }
}

Write-Host "[OK] 51 Scaffold files accounted for: $CreatedCount newly created, $ExistedCount already existed." -ForegroundColor Green

# 3. Database migrations
Write-Host ""
Write-Host "[3/5] Checking database migrations..." -ForegroundColor Blue
$MigrationOrders = "backend/database/migrations/2026_10_03_000001_create_orders_table.php"
$MigrationSyncs = "backend/database/migrations/2026_10_03_000002_create_sync_attempts_table.php"

if (-not (Test-Path $MigrationOrders)) {
  New-Item -ItemType File -Path $MigrationOrders -Force | Out-Null
}
if (-not (Test-Path $MigrationSyncs)) {
  New-Item -ItemType File -Path $MigrationSyncs -Force | Out-Null
}
Write-Host "[OK] Database migrations present." -ForegroundColor Green

# 4. Support configs
Write-Host ""
Write-Host "[4/5] Checking support configurations..." -ForegroundColor Blue
if (-not (Test-Path "receiver/package.json")) {
  New-Item -ItemType File -Path "receiver/package.json" -Force | Out-Null
}
if (-not (Test-Path "receiver/tsconfig.json")) {
  New-Item -ItemType File -Path "receiver/tsconfig.json" -Force | Out-Null
}
Write-Host "[OK] Support configurations verified." -ForegroundColor Green

# 5. Verification
Write-Host ""
Write-Host "[5/5] Auditing scaffold completeness..." -ForegroundColor Blue
$Missing = 0
foreach ($f in $ScaffoldFiles) {
  if (-not (Test-Path $f)) {
    Write-Host "[FAIL] Missing scaffold file: $f" -ForegroundColor Red
    $Missing++
  }
}

if ($Missing -eq 0) {
  Write-Host "[OK] Perfect match: All 51 scaffold files present and verified!" -ForegroundColor Green
} else {
  Write-Host "[FAIL] $Missing files missing!" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Scaffolding execution completed successfully!" -ForegroundColor Green
$Ver = if (Test-Path "VERSION") { (Get-Content "VERSION" -Raw).Trim() } else { "0.1.0" }
Write-Host "Version: $Ver"
Write-Host "Total scaffold files: $($ScaffoldFiles.Count)"
Write-Host "Naming standard: PascalCase for Classes, Types, Interfaces (AGENTS.md)"
Write-Host "================================================================" -ForegroundColor Cyan
