package com.hospital.api.common;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * Deserializer linh hoạt cho LocalDate: hỗ trợ yyyy-MM-dd, MM/dd/yyyy, dd/MM/yyyy, dd-MM-yyyy, yyyy/MM/dd.
 */
public class FlexibleLocalDateDeserializer extends JsonDeserializer<LocalDate> {

    private static final List<DateTimeFormatter> FORMATTERS = List.of(
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("yyyy/MM/dd"),
            DateTimeFormatter.ISO_DATE_TIME,
            DateTimeFormatter.ISO_LOCAL_DATE
    );

    @Override
    public LocalDate deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String text = p.getText();
        if (text == null || text.trim().isEmpty() || "null".equalsIgnoreCase(text.trim())) {
            return null;
        }
        String clean = text.trim();

        // Cắt bớt phần thời gian nếu có (ví dụ: 2026-10-30T00:00:00)
        if (clean.contains("T")) {
            clean = clean.substring(0, clean.indexOf("T"));
        }

        for (DateTimeFormatter formatter : FORMATTERS) {
            try {
                return LocalDate.parse(clean, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }

        // Thử suy luận thủ công nếu chuỗi có định dạng 3 phần
        try {
            String[] parts = clean.split("[/\\-.]");
            if (parts.length == 3) {
                if (parts[2].length() == 4) {
                    int p0 = Integer.parseInt(parts[0]);
                    int p1 = Integer.parseInt(parts[1]);
                    int y = Integer.parseInt(parts[2]);
                    if (p0 > 12) {
                        // dd/MM/yyyy
                        return LocalDate.of(y, p1, p0);
                    } else {
                        // MM/dd/yyyy
                        return LocalDate.of(y, p0, p1);
                    }
                } else if (parts[0].length() == 4) {
                    int y = Integer.parseInt(parts[0]);
                    int m = Integer.parseInt(parts[1]);
                    int d = Integer.parseInt(parts[2]);
                    return LocalDate.of(y, m, d);
                }
            }
        } catch (Exception ignored) {
        }

        throw new IllegalArgumentException("Không thể nhận diện định dạng ngày: " + text + ". Vui lòng nhập định dạng yyyy-MM-dd hoặc dd/MM/yyyy.");
    }
}
