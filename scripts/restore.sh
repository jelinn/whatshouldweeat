#!/bin/bash
# ===========================================
# WhatShouldWeEat - Database Restore Script
# ===========================================
# Restores the SQLite database from a backup file
#
# Usage:
#   ./scripts/restore.sh                           # Interactive mode
#   ./scripts/restore.sh backup_file.db            # Restore specific backup
#   ./scripts/restore.sh backup_file.db.gz         # Restore from compressed

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="${PROJECT_DIR}/data"
DB_FILE="${DATA_DIR}/recipes.db"
BACKUP_DIR="${PROJECT_DIR}/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}WhatShouldWeEat - Database Restore${NC}"
echo "===================================="

# Function to restore from file
restore_from_file() {
    local BACKUP_FILE="$1"

    # Check if backup exists
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}Error: Backup file not found: ${BACKUP_FILE}${NC}"
        exit 1
    fi

    # Handle compressed files
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        echo "Decompressing backup..."
        TEMP_FILE=$(mktemp)
        gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
        BACKUP_FILE="$TEMP_FILE"
        CLEANUP_TEMP=true
    fi

    # Verify it's a valid SQLite database
    if command -v sqlite3 &> /dev/null; then
        if ! sqlite3 "$BACKUP_FILE" "SELECT 1 FROM sqlite_master LIMIT 1;" &> /dev/null; then
            echo -e "${RED}Error: Invalid SQLite database file${NC}"
            exit 1
        fi
    fi

    # Create data directory if needed
    mkdir -p "$DATA_DIR"

    # Backup current database if it exists
    if [ -f "$DB_FILE" ]; then
        CURRENT_BACKUP="${DB_FILE}.pre-restore.$(date +%Y%m%d_%H%M%S)"
        echo -e "${YELLOW}Backing up current database to: ${CURRENT_BACKUP}${NC}"
        cp "$DB_FILE" "$CURRENT_BACKUP"
    fi

    # Stop the application if running in Docker
    if docker ps --format '{{.Names}}' | grep -q "whatshouldweeat"; then
        echo -e "${YELLOW}Stopping Docker container...${NC}"
        docker stop whatshouldweeat
        RESTART_DOCKER=true
    fi

    # Perform restore
    echo "Restoring database..."
    cp "$BACKUP_FILE" "$DB_FILE"

    # Cleanup temp file if needed
    if [ "${CLEANUP_TEMP:-false}" = true ]; then
        rm -f "$TEMP_FILE"
    fi

    # Restart Docker if we stopped it
    if [ "${RESTART_DOCKER:-false}" = true ]; then
        echo "Restarting Docker container..."
        docker start whatshouldweeat
    fi

    # Verify restore
    if [ -f "$DB_FILE" ]; then
        RESTORED_SIZE=$(du -h "$DB_FILE" | cut -f1)
        echo -e "${GREEN}Restore successful!${NC}"
        echo "Database size: $RESTORED_SIZE"

        # Show table counts
        if command -v sqlite3 &> /dev/null; then
            echo ""
            echo "Database contents:"
            RECIPE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM recipes;" 2>/dev/null || echo "N/A")
            PLAN_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM meal_plans;" 2>/dev/null || echo "N/A")
            STAPLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM staples;" 2>/dev/null || echo "N/A")
            echo "  - Recipes: $RECIPE_COUNT"
            echo "  - Meal plans: $PLAN_COUNT"
            echo "  - Staples: $STAPLE_COUNT"
        fi
    else
        echo -e "${RED}Error: Restore failed${NC}"
        exit 1
    fi
}

# Interactive mode if no file specified
if [ -z "$1" ]; then
    # List available backups
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        echo -e "${RED}No backups found in ${BACKUP_DIR}${NC}"
        exit 1
    fi

    echo "Available backups:"
    echo ""

    # Create array of backups
    BACKUPS=()
    while IFS= read -r file; do
        BACKUPS+=("$file")
    done < <(ls -1t "$BACKUP_DIR"/recipes_*.db "$BACKUP_DIR"/recipes_*.db.gz 2>/dev/null)

    # Display numbered list
    for i in "${!BACKUPS[@]}"; do
        FILE="${BACKUPS[$i]}"
        SIZE=$(du -h "$FILE" | cut -f1)
        BASENAME=$(basename "$FILE")
        echo -e "  ${CYAN}$((i+1))${NC}. $BASENAME ($SIZE)"
    done

    echo ""
    read -p "Enter backup number to restore (or 'q' to quit): " SELECTION

    if [ "$SELECTION" = "q" ] || [ "$SELECTION" = "Q" ]; then
        echo "Cancelled."
        exit 0
    fi

    # Validate selection
    if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt "${#BACKUPS[@]}" ]; then
        echo -e "${RED}Invalid selection${NC}"
        exit 1
    fi

    BACKUP_FILE="${BACKUPS[$((SELECTION-1))]}"
    echo ""
    echo "Selected: $(basename "$BACKUP_FILE")"
    read -p "Are you sure you want to restore this backup? (y/N): " CONFIRM

    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo "Cancelled."
        exit 0
    fi

    restore_from_file "$BACKUP_FILE"
else
    # Restore from specified file
    BACKUP_FILE="$1"

    # If relative path and file doesn't exist, try backup directory
    if [ ! -f "$BACKUP_FILE" ] && [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
        BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
    fi

    restore_from_file "$BACKUP_FILE"
fi

echo ""
echo -e "${GREEN}Done!${NC}"
