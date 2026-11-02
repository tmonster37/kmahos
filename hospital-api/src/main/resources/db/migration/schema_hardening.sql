-- =========================================================================
-- DATABASE SCHEMA MIGRATION: HARDENING & PERFORMANCE OPTIMIZATIONS
-- File: src/main/resources/db/migration/schema_hardening.sql
-- =========================================================================

-- 1. Accounts: Hỗ trợ Google Sign-In & Số điện thoại có thể null khi dùng Google SSO
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS google_sub VARCHAR(100);
ALTER TABLE accounts ALTER COLUMN phone_number DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_google_sub ON accounts(google_sub);

-- 2. OTP Tokens: Bảng lưu trữ mã xác thực OTP bảo mật
CREATE TABLE IF NOT EXISTS otp_tokens (
    token_id UUID PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    otp_code VARCHAR(20) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    client_ip VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_otp_identifier_purpose ON otp_tokens(identifier, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_tokens(expires_at);

-- 3. Patient Profiles: Tiền sử dị ứng, tiền sử bệnh án & liên kết tài khoản
ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS medical_history TEXT;
ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS is_linked BOOLEAN DEFAULT FALSE;
ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS relationship VARCHAR(50) DEFAULT 'SELF';

-- 4. Bookings: Phân luồng tiếp đón ưu tiên (Priority Patients)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS priority_reason VARCHAR(255);

-- 5. Prescriptions: Cột trạng thái thanh toán & chống cấp phát trùng
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

-- 6. Medical Tests: Chi tiết bệnh phẩm, LIS, RIS/PACS
ALTER TABLE medical_tests ADD COLUMN IF NOT EXISTS specimen_type VARCHAR(100);
ALTER TABLE medical_tests ADD COLUMN IF NOT EXISTS specimen_barcode VARCHAR(50);
ALTER TABLE medical_tests ADD COLUMN IF NOT EXISTS sample_collected_at TIMESTAMP;
ALTER TABLE medical_tests ADD COLUMN IF NOT EXISTS sample_collected_by_id BIGINT;
ALTER TABLE medical_tests ADD COLUMN IF NOT EXISTS performed_by_id BIGINT;
ALTER TABLE medical_tests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE medical_tests ADD COLUMN IF NOT EXISTS accession_number VARCHAR(50);
ALTER TABLE medical_tests ADD COLUMN IF NOT EXISTS modality VARCHAR(20);
ALTER TABLE medical_tests ADD COLUMN IF NOT EXISTS study_instance_uid VARCHAR(120);
ALTER TABLE medical_tests ADD COLUMN IF NOT EXISTS pacs_viewer_url TEXT;

-- 7. Medical Test Result Items: Chi tiết chỉ số xét nghiệm kèm cờ cảnh báo
CREATE TABLE IF NOT EXISTS medical_test_result_items (
    result_item_id UUID PRIMARY KEY,
    medical_test_id UUID NOT NULL,
    parameter_code VARCHAR(50) NOT NULL,
    parameter_name VARCHAR(150) NOT NULL,
    value_numeric NUMERIC(12, 4),
    value_text VARCHAR(255),
    unit VARCHAR(50),
    reference_range VARCHAR(100),
    flag VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_result_item_test FOREIGN KEY (medical_test_id) REFERENCES medical_tests(medical_test_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_result_item_test ON medical_test_result_items(medical_test_id);

-- 8. Prescription Dispenses: Cấp phát thuốc nhà thuốc có khóa bi quan và chống trùng
CREATE TABLE IF NOT EXISTS prescription_dispenses (
    dispense_id UUID PRIMARY KEY,
    dispense_code VARCHAR(40) NOT NULL UNIQUE,
    prescription_id UUID NOT NULL UNIQUE,
    warehouse_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    pharmacist_id BIGINT,
    dispensed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_dispense_prescription UNIQUE (prescription_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dispense_code ON prescription_dispenses(dispense_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dispense_presc ON prescription_dispenses(prescription_id);

-- 9. Prescription Dispense Items: Chi tiết thuốc cấp phát trừ kho theo lô FEFO
CREATE TABLE IF NOT EXISTS prescription_dispense_items (
    dispense_item_id UUID PRIMARY KEY,
    dispense_id UUID NOT NULL,
    medicine_id BIGINT NOT NULL,
    batch_id BIGINT,
    quantity_dispensed INT NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dispense_item FOREIGN KEY (dispense_id) REFERENCES prescription_dispenses(dispense_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dispense_items_dispense ON prescription_dispense_items(dispense_id);

-- 10. Inpatient Doctor Orders: Y lệnh điều trị nội trú của Bác sĩ
CREATE TABLE IF NOT EXISTS inpatient_doctor_orders (
    order_id UUID PRIMARY KEY,
    admission_id UUID NOT NULL,
    doctor_id BIGINT NOT NULL,
    order_date DATE NOT NULL,
    disease_progression TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_admission FOREIGN KEY (admission_id) REFERENCES hospital_admissions(admission_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_doc_order_admission ON inpatient_doctor_orders(admission_id);
CREATE INDEX IF NOT EXISTS idx_doc_order_date ON inpatient_doctor_orders(order_date);

-- 11. Inpatient Nursing Cares: Phiếu chăm sóc điều dưỡng nội trú
CREATE TABLE IF NOT EXISTS inpatient_nursing_cares (
    care_id UUID PRIMARY KEY,
    admission_id UUID NOT NULL,
    nurse_id BIGINT,
    care_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    temperature NUMERIC(4, 1),
    blood_pressure VARCHAR(30),
    pulse INT,
    respiratory_rate INT,
    spo2 INT,
    care_level VARCHAR(30) DEFAULT 'CAP_2',
    nursing_note TEXT,
    medication_administered TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_care_admission FOREIGN KEY (admission_id) REFERENCES hospital_admissions(admission_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_nursing_care_admission ON inpatient_nursing_cares(admission_id);
CREATE INDEX IF NOT EXISTS idx_nursing_care_time ON inpatient_nursing_cares(care_time);

-- 12. Inpatient Bed Transfers: Lịch sử điều chuyển giường bệnh
CREATE TABLE IF NOT EXISTS inpatient_bed_transfers (
    transfer_id UUID PRIMARY KEY,
    admission_id UUID NOT NULL,
    from_bed_id BIGINT,
    to_bed_id BIGINT NOT NULL,
    from_room_id BIGINT,
    to_room_id BIGINT NOT NULL,
    transfer_reason TEXT,
    ordered_by_doctor_id BIGINT,
    transferred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transfer_admission FOREIGN KEY (admission_id) REFERENCES hospital_admissions(admission_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_transfer_admission ON inpatient_bed_transfers(admission_id);

-- 13. Composite & High-Traffic Query Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_doc_date ON bookings(doctor_id, booking_date, is_priority DESC, queue_number ASC);
CREATE INDEX IF NOT EXISTS idx_bookings_date_queue ON bookings(booking_date, is_priority DESC, queue_number ASC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_med_records_doc_state ON medical_examination_records(doctor_id, state);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_phone ON patient_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_identity ON patient_profiles(identity_number);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doc_date ON doctor_schedules(doctor_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_medical_tests_state ON medical_tests(state, created_at DESC);
