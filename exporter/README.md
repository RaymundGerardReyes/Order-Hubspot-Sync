# HubSpot 7-Day Deal Exporter (Language B)

Standalone PHP script (Req 28) — exports all HubSpot deals created in the last 7 days to CSV.

**No Composer or Laravel required.** Uses only built-in PHP extensions (`curl`, `json`).

## Requirements

- PHP 8.1+
- `curl` extension enabled (standard in most PHP installations)
- `HUBSPOT_ACCESS_TOKEN` environment variable

## Usage

```bash
# Basic (reads from ../.env automatically)
php export-deals.php

# Specify days and output path
php export-deals.php --days=7 --output=deals.csv

# Custom output directory
php export-deals.php --days=14 --output=storage/exports/deals.csv
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `HUBSPOT_ACCESS_TOKEN` | ✅ Yes | HubSpot private app access token with `crm.objects.deals.read` scope |

The script will automatically load `.env` from the project root or its own directory.

## CSV Output Format

```csv
hubspot_deal_id,deal_name,amount,close_date,pipeline,deal_stage,created_at,external_order_id
```

- A header row is always written, even when no deals are found.
- Exit code `0` on success, `1` on error.

## HubSpot Scopes Required

- `crm.objects.deals.read`

## Example

```bash
export HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
php export-deals.php --days=7 --output=deals_$(date +%Y%m%d).csv
```
