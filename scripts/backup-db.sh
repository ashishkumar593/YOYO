#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/yoyo"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/yoyo_db_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="yoyo-postgres-prod"

echo "=========================================================="
echo "    YOYO Database Automated Backup: ${TIMESTAMP}          "
echo "=========================================================="

mkdir -p "${BACKUP_DIR}"

# 1. Execute pg_dump inside container and compress with gzip
echo "Dumping PostgreSQL database..."
docker exec -t "${CONTAINER_NAME}" pg_dump -U yoyo_user -d yoyo_db | gzip > "${BACKUP_FILE}"

echo "✔ Backup created at ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

# 2. Retain only last 30 days of backups
echo "Pruning backups older than 30 days..."
find "${BACKUP_DIR}" -type f -name "yoyo_db_*.sql.gz" -mtime +30 -delete

echo "✔ Backup routine completed successfully."

