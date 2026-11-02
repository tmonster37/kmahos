package com.hospital.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService userDetailsService;

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider, CustomUserDetailsService userDetailsService) {
        this.tokenProvider = tokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String jwt = getJwtFromRequest(request);

        if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
            String phoneNumber = tokenProvider.getPhoneNumberFromToken(jwt);
            UserDetails userDetails = userDetailsService.loadUserByUsername(phoneNumber);

            if (userDetails != null && userDetails.isEnabled() && userDetails.isAccountNonLocked()) {
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        // 1. Ưu tiên Authorization Bearer header (chuẩn cho REST API / SPA / Mobile / Kiosk, miễn nhiễm CSRF)
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        // 2. Fallback sang HttpOnly Cookie "access_token"
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("access_token".equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                    // Chống CSRF: Với các request thay đổi dữ liệu (POST, PUT, DELETE, PATCH),
                    // bắt buộc phải có custom header hoặc Origin/Referer hợp lệ
                    if (isSafeFromCsrf(request)) {
                        return cookie.getValue();
                    }
                }
            }
        }
        return null;
    }

    private boolean isSafeFromCsrf(HttpServletRequest request) {
        if (SAFE_METHODS.contains(request.getMethod())) {
            return true;
        }

        // Request có custom header được trình duyệt bảo vệ bởi CORS preflight
        String requestedWith = request.getHeader("X-Requested-With");
        if (StringUtils.hasText(requestedWith)) {
            return true;
        }

        String origin = request.getHeader("Origin");
        if (StringUtils.hasText(origin)) {
            return isAllowedOrigin(origin);
        }

        String referer = request.getHeader("Referer");
        if (StringUtils.hasText(referer)) {
            return isAllowedOrigin(referer);
        }

        return false;
    }

    private boolean isAllowedOrigin(String url) {
        if (url == null) return false;
        String lower = url.toLowerCase();
        return lower.contains("localhost")
                || lower.contains("127.0.0.1")
                || lower.contains(".vercel.app")
                || lower.contains("tnthospital.vn");
    }
}
