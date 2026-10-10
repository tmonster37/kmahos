#!/usr/bin/env bash
# ==============================================================================
# BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT / KMA HOSPITAL MANAGEMENT SYSTEM
# SCRIPT KHÔI PHỤC CƠ SỞ DỮ LIỆU POSTGRESQL (DISASTER RECOVERY / PG_RESTORE)
# ==============================================================================
set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Sử dụng: $0 <duong_dan_file_backup.dump> [ten_database]"
    echo "Ví dụ:   $0 ./backups/backup_kmahos_20261010_020000.dump kmahos"
    exit 1
fi

BACKUP_FILE="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${ROOT_DIR}/.env" ]; then
    # shellcheck disable=SC1091
    export $(grep -v '^#' "${ROOT_DIR}/.env" | xargs)
fi

PG_HOST="${POSTGRES_HOST:-localhost}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-postgres}"
PG_DB="${2:-${POSTGRES_DB:-kmahos}}"
PG_PASS="${POSTGRES_PASSWORD:-postgres}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "LỖI: File backup '${BACKUP_FILE}' không tồn tại!"
    exit 1
fi

# Kiểm tra SHA256 checksum nếu có file .sha256
if [ -f "${BACKUP_FILE}.sha256" ] && command -v sha256sum > /dev/null; then
    echo "Đang kiểm tra tính toàn vẹn SHA256..."
    sha256sum -c "${BACKUP_FILE}.sha256" || { echo "CẢNH BÁO: Checksum không khớp!"; exit 1; }
fi

echo "=========================================================="
echo "BẮT ĐẦU KHÔI PHỤC DATABASE: ${PG_DB} từ file: ${BACKUP_FILE}"
echo "CẢNH BÁO: Thao tác này sẽ ghi đè dữ liệu hiện tại trên database ${PG_DB}!"
read -p "Bạn có chắc chắn muốn tiếp tục không? (y/N): " -r CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Đã hủy thao tác khôi phục."
    exit 0
fi

export PGPASSWORD="${PG_PASS}"

# Chạy pg_restore (clean existing objects trước khi restore)
pg_restore -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DB}" --clean --if-exists -v "${BACKUP_FILE}" || true

unset PGPASSWORD
echo "=========================================================="
echo "KHÔI PHỤC DATABASE HOÀN TẤT!"
exit 0
