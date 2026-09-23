package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proof_of_delivery")
public class ProofOfDelivery {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "proof_id", nullable = false, updatable = false)
    private Long proofId;

    @Column(name = "shipment_id", nullable = false, unique = true)
    private Long shipmentId;

    @Column(name = "receiver_name", nullable = false, length = 150)
    private String receiverName;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "delivered_at", nullable = false)
    private LocalDateTime deliveredAt = LocalDateTime.now();

    public Long getProofId() { return proofId; }
    public void setProofId(Long proofId) { this.proofId = proofId; }
    public Long getShipmentId() { return shipmentId; }
    public void setShipmentId(Long shipmentId) { this.shipmentId = shipmentId; }
    public String getReceiverName() { return receiverName; }
    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public LocalDateTime getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(LocalDateTime deliveredAt) { this.deliveredAt = deliveredAt; }
}
