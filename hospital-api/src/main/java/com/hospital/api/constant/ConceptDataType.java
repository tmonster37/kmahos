package com.hospital.api.constant;

public enum ConceptDataType {
    NUMERIC,   // Số (đo lường, huyết áp, nhịp tim, chiều cao, tuần thai)
    TEXT,      // Văn bản tự do (mô tả soi đáy mắt, tình trạng niêm mạc)
    CODED,     // Mã lựa chọn từ danh mục (nhóm máu, vị trí răng)
    BOOLEAN,   // Có / Không (tim thai +, co thắt tử cung -)
    DATETIME   // Ngày giờ (ngày kinh cuối, thời điểm vỡ ối)
}
