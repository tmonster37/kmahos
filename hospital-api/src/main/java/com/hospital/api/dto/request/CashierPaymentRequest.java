package com.hospital.api.dto.request;

import com.hospital.api.constant.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CashierPaymentRequest(
        @NotBlank(message = "Mã ca khám không được để trống")
        String bookingCode,

        @NotNull(message = "Phương thức thanh toán không được để trống")
        PaymentMethod paymentMethod,

        BigDecimal amountGiven,

        String notes
) {}
