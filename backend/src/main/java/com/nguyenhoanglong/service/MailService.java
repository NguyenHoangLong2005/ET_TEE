package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.EmailLog;
import com.nguyenhoanglong.repository.EmailLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;

@Service
public class MailService {

    private static final Logger logger = LoggerFactory.getLogger(MailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private EmailLogRepository emailLogRepository;

    @Value("${app.mail.from:noreply@ettee.com}")
    private String fromEmail;

    public void sendOrderConfirmation(String toEmail, String orderCode, Double totalAmount, String paymentMethod, String bankDetailsHtml) {
        String subject = "Xác nhận đơn hàng #" + orderCode + " từ ET.TEE Shop";
        EmailLog emailLog = new EmailLog();
        emailLog.setRecipient(toEmail);
        emailLog.setSubject(subject);
        emailLog.setCreatedAt(LocalDateTime.now());

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);

            StringBuilder html = new StringBuilder();
            html.append("<h2>Cảm ơn bạn đã đặt hàng tại ET.TEE Shop!</h2>");
            html.append("<p>Mã đơn hàng của bạn là: <strong>").append(orderCode).append("</strong></p>");
            html.append("<p>Tổng thanh toán: <strong>").append(String.format("%,.0f", totalAmount)).append("đ</strong></p>");
            html.append("<p>Phương thức thanh toán: <strong>").append(paymentMethod).append("</strong></p>");

            if ("BANK_TRANSFER".equals(paymentMethod) && bankDetailsHtml != null) {
                html.append("<h3>Hướng dẫn chuyển khoản:</h3>");
                html.append(bankDetailsHtml);
            }

            html.append("<br><p>Chúng tôi sẽ sớm liên hệ để giao hàng cho bạn.</p>");
            html.append("<p>Trân trọng,<br>ET.TEE Shop</p>");

            helper.setText(html.toString(), true);

            mailSender.send(message);
            logger.info("Sent order confirmation email to: " + toEmail);

            emailLog.setStatus("SENT");
            emailLogRepository.save(emailLog);
        } catch (Exception e) {
            logger.error("Failed to send order confirmation email to: " + toEmail, e);
            emailLog.setStatus("FAILED");
            emailLog.setErrorMessage(e.getMessage());
            try {
                emailLogRepository.save(emailLog);
            } catch (Exception ex) {
                logger.error("Failed to save email log to DB", ex);
            }
        }
    }
}
