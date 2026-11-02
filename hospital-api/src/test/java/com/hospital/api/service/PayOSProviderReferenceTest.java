package com.hospital.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.api.config.PayOSConfig;
import com.hospital.api.service.impl.PayOSServiceImpl;
import org.junit.jupiter.api.Test;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PayOSProviderReferenceTest {
    @Test void paymentInformationPreservesProviderOrderCodeForValidation() throws Exception {
        PayOSConfig config = new PayOSConfig();
        config.clientId = "test-client"; config.apiKey = "test-api"; config.checksumKey = "test-checksum";
        HttpClient client = mock(HttpClient.class);
        @SuppressWarnings("unchecked") HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("{\"code\":\"00\",\"data\":{\"orderCode\":456,\"amount\":150000,\"status\":\"PAID\"}}");
        when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
        try (var factory = mockStatic(HttpClient.class)) {
            HttpClient.Builder builder = mock(HttpClient.Builder.class);
            factory.when(HttpClient::newBuilder).thenReturn(builder);
            when(builder.connectTimeout(any())).thenReturn(builder);
            when(builder.build()).thenReturn(client);
            PayOSServiceImpl service = new PayOSServiceImpl(config, new ObjectMapper());
            assertEquals(456L, service.getPaymentLinkInformation(123L).orderCode());
        }
    }
}
