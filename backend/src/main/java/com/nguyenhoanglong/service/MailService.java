package com.nguyenhoanglong.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class MailService {

    private static final Logger logger = LoggerFactory.getLogger(MailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromEmail;

    public void sendOrderConfirmation(String toEmail, String orderCode, Double totalAmount, String paymentMethod, String bankDetailsHtml) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Xác nhận đơn hàng #" + orderCode + " từ ET.TEE Shop");

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
        } catch (Exception e) {
            logger.error("Failed to send order confirmation email to: " + toEmail, e);
            // Do not throw exception, just log it so it doesn't rollback the transaction
        }
    }
}
