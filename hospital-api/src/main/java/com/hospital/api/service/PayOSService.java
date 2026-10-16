package com.hospital.api.service;

import com.hospital.api.dto.response.PayOSLinkResponse;
import java.math.BigDecimal;

public interface PayOSService {
    PayOSLinkResponse createPaymentLink(Long orderCode, BigDecimal amount, String description, String buyerName, String buyerPhone);
    PayOSLinkResponse createPaymentLink(Long orderCode, BigDecimal amount, String description, String buyerName, String buyerPhone, java.util.List<com.hospital.api.dto.request.PayOSItemRequest> items);
    PayOSLinkResponse getPaymentLinkInformation(Long orderCode);
    boolean cancelPaymentLink(Long orderCode, String cancellationReason);
}
