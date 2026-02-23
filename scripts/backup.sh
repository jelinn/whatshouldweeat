#!/bin/bash
# ===========================================
# WhatShouldWeEat - Database Backup Script
# ===========================================
# Creates a timestamped backup of the SQLite database
#
# Usage:
#   ./scripts/backup.sh                    # Backup to ./backups/
#   ./scripts/backup.sh /path/to/backups   # Backup to custom location

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="${PROJECT_DIR}/data"
DB_FILE="${DATA_DIR}/recipes.db"

# Backup destination
BACKUP_DIR="${1:-${PROJECT_DIR}/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/recipes_${TIMESTAMP}.db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}WhatShouldWeEat - Database Backup${NC}"
echo "=================================="

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo -e "${RED}Error: Database file not found at ${DB_FILE}${NC}"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Get database size
DB_SIZE=$(du -h "$DB_FILE" | cut -f1)

echo "Source: $DB_FILE ($DB_SIZE)"
echo "Destination: $BACKUP_FILE"
echo ""

# Create backup using SQLite's backup command for consistency
if command -v sqlite3 &> /dev/null; then
    echo "Creating backup using SQLite..."
    sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
else
    echo -e "${YELLOW}Warning: sqlite3 not found, using file copy${NC}"
    cp "$DB_FILE" "$BACKUP_FILE"
fi

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}Backup successful!${NC}"
    echo "Backup size: $BACKUP_SIZE"

    # Optional: Create compressed version
    if command -v gzip &> /dev/null; then
        gzip -k "$BACKUP_FILE"
        COMPRESSED_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
        echo "Compressed backup: ${BACKUP_FILE}.gz ($COMPRESSED_SIZE)"
    fi
else
    echo -e "${RED}Error: Backup failed${NC}"
    exit 1
fi

# List recent backups
echo ""
echo "Recent backups:"
ls -lht "$BACKUP_DIR" | head -6

# Cleanup old backups (keep last 10)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/recipes_*.db 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
    echo ""
    echo -e "${YELLOW}Cleaning up old backups (keeping last 10)...${NC}"
    ls -1t "$BACKUP_DIR"/recipes_*.db | tail -n +11 | xargs rm -f
    ls -1t "$BACKUP_DIR"/recipes_*.db.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}Done!${NC}"
