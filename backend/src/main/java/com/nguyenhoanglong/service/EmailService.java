package com.nguyenhoanglong.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.nguyenhoanglong.entity.EmailLog;
import com.nguyenhoanglong.repository.EmailLogRepository;
import java.time.LocalDateTime;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    /**
     * If true, email sending errors are logged but not thrown.
     * This lets register/reset flows complete in environments where SMTP is unavailable
     * (e.g. local dev). The OTP is still persisted in the DB and surfaced in logs.
     */
    @Value("${app.mail.fail-soft:true}")
    private boolean failSoft;

    private final JavaMailSender mailSender;
    private final EmailLogRepository emailLogRepository;

    public EmailService(JavaMailSender mailSender, EmailLogRepository emailLogRepository) {
        this.mailSender = mailSender;
        this.emailLogRepository = emailLogRepository;
    }

    @Value("${app.mail.from:noreply@ettee.com}")
    private String fromEmail;

    private void sendOrLog(String toEmail, String subject, String html, String code, String flow) {
        EmailLog logEntry = new EmailLog();
        logEntry.setRecipient(toEmail);
        logEntry.setSubject(subject);
        logEntry.setCreatedAt(LocalDateTime.now());

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);

            logEntry.setStatus("SENT");
            emailLogRepository.save(logEntry);
        } catch (MessagingException | MailException e) {
            log.warn("[{}] Email send failed for {} ({}): {}. OTP={}",
                    flow, toEmail, e.getClass().getSimpleName(), e.getMessage(), code);

            logEntry.setStatus("FAILED");
            logEntry.setErrorMessage(e.getMessage());
            try {
                emailLogRepository.save(logEntry);
            } catch (Exception ex) {
                log.error("Failed to save email log to DB", ex);
            }

            if (!failSoft) {
                throw new RuntimeException("Không thể gửi email. Vui lòng thử lại sau.");
            }
        }
    }

    public void sendVerificationEmail(String toEmail, String code) {
        String html = "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>"
                + "<h2 style='color: #333;'>Chào mừng bạn đến với ET.TEE!</h2>"
                + "<p>Mã xác thực tài khoản của bạn là:</p>"
                + "<h1 style='color: #e50027; letter-spacing: 5px; text-align: center; background: #f9f9f9; padding: 20px; border-radius: 8px;'>"
                + code + "</h1>"
                + "<p>Mã này sẽ hết hạn sau 10 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>"
                + "<p>Trân trọng,<br>Đội ngũ ET.TEE</p>"
                + "</div>";
        sendOrLog(toEmail, "Mã xác thực tài khoản ET.TEE", html, code, "verify-email");
    }

    public void sendPasswordResetEmail(String toEmail, String otp) {
        String html = "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>"
                + "<h2 style='color: #333;'>Yêu cầu đặt lại mật khẩu</h2>"
                + "<p>Mã xác nhận (OTP) để đặt lại mật khẩu của bạn là:</p>"
                + "<h1 style='color: #e50027; letter-spacing: 5px; text-align: center; background: #f9f9f9; padding: 20px; border-radius: 8px;'>"
                + otp + "</h1>"
                + "<p>Mã này sẽ hết hạn sau 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>"
                + "<p>Trân trọng,<br>Đội ngũ ET.TEE</p>"
                + "</div>";
        sendOrLog(toEmail, "Đặt lại mật khẩu tài khoản ET.TEE", html, otp, "password-reset");
    }
}

