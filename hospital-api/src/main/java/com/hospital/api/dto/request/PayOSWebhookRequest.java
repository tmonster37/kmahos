package com.hospital.api.dto.request;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public record PayOSWebhookRequest(
        String code,
        String desc,
        PayOSWebhookData data,
        String signature,
        Boolean success
) {
    public PayOSWebhookRequest(String code, String desc, PayOSWebhookData data, String signature) {
        this(code, desc, data, signature, null);
    }
    // Keep every provider field: webhook signatures cover the complete data object,
    // including optional bank/counterparty fields that are not used by our domain.
    public static final class PayOSWebhookData {
        private final Map<String, Object> fields;

        @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
        public PayOSWebhookData(Map<String, Object> fields) {
            this.fields = new LinkedHashMap<>(fields);
        }

        public PayOSWebhookData(Long orderCode, BigDecimal amount, String description, String accountNumber,
                               String reference, String transactionDateTime, String currency, String paymentLinkId,
                               String code, String desc) {
            fields = new LinkedHashMap<>();
            fields.put("orderCode", orderCode); fields.put("amount", amount);
            fields.put("description", description); fields.put("accountNumber", accountNumber);
            fields.put("reference", reference); fields.put("transactionDateTime", transactionDateTime);
            fields.put("currency", currency); fields.put("paymentLinkId", paymentLinkId);
            fields.put("code", code); fields.put("desc", desc);
        }

        @JsonValue
        public Map<String, Object> fields() { return java.util.Collections.unmodifiableMap(fields); }
        private String text(String key) { return fields.get(key) == null ? null : fields.get(key).toString(); }
        public Long orderCode() { return text("orderCode") == null ? null : new BigDecimal(text("orderCode")).longValueExact(); }
        public BigDecimal amount() { return text("amount") == null ? null : new BigDecimal(text("amount")); }
        public String description() { return text("description"); }
        public String accountNumber() { return text("accountNumber"); }
        public String reference() { return text("reference"); }
        public String transactionDateTime() { return text("transactionDateTime"); }
        public String currency() { return text("currency"); }
        public String paymentLinkId() { return text("paymentLinkId"); }
        public String code() { return text("code"); }
        public String desc() { return text("desc"); }
    }
}
