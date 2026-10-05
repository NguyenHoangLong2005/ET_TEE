package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.repository.EmailLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.regex.Pattern;

/**
 * Serves the 1x1 image embedded in outgoing order emails and records that the email was opened.
 *
 * Public on purpose (an email client calls it, not a logged-in user). It always answers with the
 * same image, whether or not the token exists, so it cannot be used to probe for valid tokens.
 * The count is an ESTIMATE: mail apps that pre-load images (Apple Mail Privacy Protection, some
 * proxies) register an open without the customer reading, and clients that block images register
 * nothing.
 */
@RestController
@RequestMapping("/api/track")
public class EmailTrackingController {

    private static final Logger log = LoggerFactory.getLogger(EmailTrackingController.class);
    private static final Pattern TOKEN = Pattern.compile("[A-Za-z0-9]{16,64}");

    // Smallest transparent GIF (1x1).
    private static final byte[] PIXEL = {
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, (byte) 0x80, 0x00, 0x00,
            (byte) 0xFF, (byte) 0xFF, (byte) 0xFF, 0x00, 0x00, 0x00, 0x21, (byte) 0xF9, 0x04, 0x01,
            0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
            0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
    };

    private final EmailLogRepository emailLogRepository;

    public EmailTrackingController(EmailLogRepository emailLogRepository) {
        this.emailLogRepository = emailLogRepository;
    }

    @GetMapping("/email/{token}.gif")
    @Transactional
    public ResponseEntity<byte[]> trackOpen(@PathVariable String token) {
        if (token != null && TOKEN.matcher(token).matches()) {
            try {
                emailLogRepository.recordOpen(token, LocalDateTime.now());
            } catch (Exception e) {
                log.warn("Could not record email open: {}", e.getMessage());
            }
        }
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_GIF)
                // never cached, so a re-open reaches the server again
                .cacheControl(CacheControl.noStore())
                .header("Pragma", "no-cache")
                .body(PIXEL);
    }
}
