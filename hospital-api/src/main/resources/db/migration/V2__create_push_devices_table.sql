-- ==============================================================================
-- BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT / KMA HMS
-- Migration V2: Tạo bảng quản lý thiết bị nhận thông báo đẩy (Push Devices)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS push_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(user_id) ON DELETE CASCADE,
    device_install_id VARCHAR(100) NOT NULL UNIQUE,
    device_token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_devices_account_id ON push_devices(account_id);
CREATE INDEX IF NOT EXISTS idx_push_devices_install_id ON push_devices(device_install_id);

