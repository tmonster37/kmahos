package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.TransactionType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "transactions", indexes = {
        @Index(name = "idx_txn_account", columnList = "account_id"),
        @Index(name = "idx_txn_vnpay_ref", columnList = "vnpay_txn_ref"),
        @Index(name = "idx_txn_order_code", columnList = "order_code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "transaction_id")
    private UUID transactionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = true)
    private Account account;

    @Column(name = "amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 30)
    private TransactionType transactionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 30)
    private PaymentMethod paymentMethod;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING"; // PENDING, SUCCESS, FAILED

    @Column(name = "vnpay_txn_ref", length = 50)
    private String vnpayTxnRef; // Mã tham chiếu VNPay

    @Column(name = "order_code")
    private Long orderCode; // Mã đơn hàng số cho PayOS / Open Banking

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private Boolean isVerified = false; // Đánh dấu đã xác thực chữ ký Webhook hợp lệ

    @Column(name = "webhook_reference", length = 100)
    private String webhookReference; // Mã tham chiếu giao dịch ngân hàng / PayOS

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}

