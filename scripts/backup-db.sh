#!/usr/bin/env bash
# ==============================================================================
# BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT / KMA HOSPITAL MANAGEMENT SYSTEM
# SCRIPT SAO LƯU CƠ SỞ DỮ LIỆU POSTGRESQL TỰ ĐỘNG (PG_DUMP BACKUP)
# ==============================================================================
set -euo pipefail

# 1. Tự động nạp biến môi trường từ file .env nếu có
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${ROOT_DIR}/.env" ]; then
    # shellcheck disable=SC1091
    export $(grep -v '^#' "${ROOT_DIR}/.env" | xargs)
fi

# 2. Cấu hình tham số kết nối PostgreSQL
PG_HOST="${POSTGRES_HOST:-localhost}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-postgres}"
PG_DB="${POSTGRES_DB:-kmahos}"
PG_PASS="${POSTGRES_PASSWORD:-postgres}"

BACKUP_TARGET_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_TARGET_DIR}/backup_${PG_DB}_${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_TARGET_DIR}/backup.log"

# Tạo thư mục chứa backup nếu chưa có
mkdir -p "${BACKUP_TARGET_DIR}"

log_msg() {
    local MSG="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo "${MSG}"
    echo "${MSG}" >> "${LOG_FILE}"
}

log_msg "=========================================================="
log_msg "BẮT ĐẦU SAO LƯU DATABASE: ${PG_DB} tại ${PG_HOST}:${PG_PORT}"

# Xuất biến mật khẩu cho pg_dump
export PGPASSWORD="${PG_PASS}"

# 3. Tiến hành chạy pg_dump (sử dụng định dạng Custom format -Fc nén cao, hỗ trợ pg_restore)
if pg_dump -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -F c -b -v -f "${BACKUP_FILE}" "${PG_DB}" 2>> "${LOG_FILE}"; then
    FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log_msg "THÀNH CÔNG: Đã tạo file backup: ${BACKUP_FILE} (Dung lượng: ${FILE_SIZE})"
    
    # Tạo mã băm SHA256 để bảo vệ tính toàn vẹn (Integrity Check)
    if command -v sha256sum > /dev/null; then
        sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
        log_msg "Đã tạo chữ ký kiểm tra SHA256 checksum: ${BACKUP_FILE}.sha256"
    fi
else
    log_msg "THẤT BẠI: Quá trình pg_dump gặp lỗi! Vui lòng kiểm tra log chi tiết."
    unset PGPASSWORD
    exit 1
fi

unset PGPASSWORD

# 4. Tự động dọn dẹp các bản backup cũ hơn RETENTION_DAYS ngày (Tránh tràn ổ đĩa)
log_msg "Đang kiểm tra và dọn dẹp các bản backup cũ hơn ${RETENTION_DAYS} ngày..."
OLD_FILES_COUNT=$(find "${BACKUP_TARGET_DIR}" -type f \( -name "backup_${PG_DB}_*.dump" -o -name "backup_${PG_DB}_*.sha256" \) -mtime "+${RETENTION_DAYS}" | wc -l)

if [ "${OLD_FILES_COUNT}" -gt 0 ]; then
    find "${BACKUP_TARGET_DIR}" -type f \( -name "backup_${PG_DB}_*.dump" -o -name "backup_${PG_DB}_*.sha256" \) -mtime "+${RETENTION_DAYS}" -delete
    log_msg "Đã dọn dẹp ${OLD_FILES_COUNT} file backup quá hạn (${RETENTION_DAYS} ngày)."
else
    log_msg "Không có bản backup nào vượt quá hạn lưu trữ ${RETENTION_DAYS} ngày."
fi

log_msg "HOÀN TẤT SAO LƯU DATABASE THÀNH CÔNG."
log_msg "=========================================================="
exit 0
