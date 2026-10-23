package com.hospital.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

@Configuration
public class HospitalTimeConfig {

    public static final ZoneId HOSPITAL_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Bean
    public Clock hospitalClock() {
        return Clock.system(HOSPITAL_ZONE);
    }
}
