package com.hospital.api.config;

import com.hospital.api.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000,http://localhost:8080,http://127.0.0.1:5173,http://127.0.0.1:3000,https://hospital.kma.edu.vn,https://kiosk.hospital.kma.edu.vn,https://admin.hospital.kma.edu.vn}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/api/payment/vnpay/**", "/api/payment/vnpay-ipn", "/api/payment/payos/**", "/api/payment/status/**", "/api/payment/vietqr/**", "/api/payment/momo/**", "/error").permitAll()
                .requestMatchers("/api/prescriptions/verify", "/api/prescriptions/*/verify", "/api/prescriptions/*/pdf", "/api/prescriptions/*/hash").permitAll()
                .requestMatchers("/api/bookings/kiosk", "/api/bookings/kiosk/**", "/api/bookings/code/**", "/api/bookings/reserve-slot", "/api/bookings/release-slot/**", "/api/clinical/queue/public").permitAll()
                .requestMatchers("/api/counters", "/api/counters/kiosk/**", "/api/counters/*/queue").permitAll()
                .requestMatchers("/api/ai/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/departments/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/schedules/by-department/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/schedules/doctor/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/clinical/services", "/api/clinical/medicines", "/api/clinical/records/**", "/api/clinical/concepts/**", "/api/clinical/patients/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/admin/doctors/**", "/api/doctors/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/inpatient/patient/**", "/api/inpatient/*/daily-records").authenticated()
                .requestMatchers("/api/admin/doctors/**").hasAnyRole("ADMIN", "HEAD_OF_DEPARTMENT")
                .requestMatchers("/api/admin/dashboard/room-capacity", "/api/admin/dashboard/capacity").hasAnyRole("ADMIN", "HEAD_OF_DEPARTMENT")
                .requestMatchers("/api/admin/ehr/**").hasAnyRole("ADMIN", "HEAD_OF_DEPARTMENT")
                .requestMatchers("/api/gateway/**").hasAnyRole("LAB_TECHNICIAN", "DOCTOR", "HEAD_OF_DEPARTMENT", "ADMIN")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/doctor/**").hasAnyRole("DOCTOR", "HEAD_OF_DEPARTMENT", "ADMIN")
                .requestMatchers("/api/inpatient/**").hasAnyRole("DOCTOR", "HEAD_OF_DEPARTMENT", "NURSE", "ADMIN")
                .requestMatchers("/api/pharmacy/**").hasAnyRole("PHARMACIST", "DOCTOR", "HEAD_OF_DEPARTMENT", "NURSE", "ADMIN")
                .requestMatchers("/api/ehr/**").hasAnyRole("ADMIN", "HEAD_OF_DEPARTMENT", "DOCTOR", "NURSE")
                .requestMatchers("/api/lab/**", "/api/clinical/**").hasAnyRole("LAB_TECHNICIAN", "DOCTOR", "HEAD_OF_DEPARTMENT", "ADMIN")
                .requestMatchers("/api/cashier/**", "/api/payment/admin/**", "/api/payment/confirm/**").hasAnyRole("CASHIER", "ADMIN")
                .requestMatchers("/api/nurse/**").hasAnyRole("NURSE", "ADMIN", "CASHIER")
                .requestMatchers("/api/patient-profiles/**", "/api/bookings/**", "/api/chat/**", "/api/utilities/**", "/api/payment/**", "/api/schedules/**").authenticated()
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setContentType("application/json;charset=UTF-8");
                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("""
                        {"success":false,"message":"Yêu cầu xác thực tài khoản (Token không hợp lệ hoặc đã hết hạn)","timestamp":"%s"}
                        """.formatted(java.time.Instant.now()));
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setContentType("application/json;charset=UTF-8");
                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("""
                        {"success":false,"message":"Bạn không có quyền thực hiện hành động này","timestamp":"%s"}
                        """.formatted(java.time.Instant.now()));
                })
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());

        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        config.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
