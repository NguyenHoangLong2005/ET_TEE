package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateTicketDto {
    private String customerId;
    private Long orderId;
    private Long shopId;
    private String channel;
    
    @NotBlank(message = "Tiêu đề không được để trống")
    private String subject;
    
    private Integer priority;
    
    @NotBlank(message = "Nội dung ban đầu không được để trống")
    private String initialMessage;

    public CreateTicketDto() {}

    public CreateTicketDto(String customerId, Long orderId, Long shopId, String channel, String subject, Integer priority, String initialMessage) {
        this.customerId = customerId;
        this.orderId = orderId;
        this.shopId = shopId;
        this.channel = channel;
        this.subject = subject;
        this.priority = priority;
        this.initialMessage = initialMessage;
    }

    public static CreateTicketDtoBuilder builder() {
        return new CreateTicketDtoBuilder();
    }

    public static class CreateTicketDtoBuilder {
        private String customerId;
        private Long orderId;
        private Long shopId;
        private String channel;
        private String subject;
        private Integer priority;
        private String initialMessage;

        public CreateTicketDtoBuilder customerId(String customerId) { this.customerId = customerId; return this; }
        public CreateTicketDtoBuilder orderId(Long orderId) { this.orderId = orderId; return this; }
        public CreateTicketDtoBuilder shopId(Long shopId) { this.shopId = shopId; return this; }
        public CreateTicketDtoBuilder channel(String channel) { this.channel = channel; return this; }
        public CreateTicketDtoBuilder subject(String subject) { this.subject = subject; return this; }
        public CreateTicketDtoBuilder priority(Integer priority) { this.priority = priority; return this; }
        public CreateTicketDtoBuilder initialMessage(String initialMessage) { this.initialMessage = initialMessage; return this; }

        public CreateTicketDto build() {
            return new CreateTicketDto(customerId, orderId, shopId, channel, subject, priority, initialMessage);
        }
    }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }

    public String getInitialMessage() { return initialMessage; }
    public void setInitialMessage(String initialMessage) { this.initialMessage = initialMessage; }
}
