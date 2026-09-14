package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_measurements")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserMeasurement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "measurement_profile_type", nullable = false)
    private String measurementProfileType = "SELF_ADULT"; // SELF_ADULT, CHILD, OTHER

    @Column(name = "height_cm")
    private Float heightCm;

    @Column(name = "weight_kg")
    private Float weightKg;

    @Column(name = "shoulder_cm")
    private Float shoulderCm;

    @Column(name = "chest_cm")
    private Float chestCm;

    @Column(name = "waist_cm")
    private Float waistCm;

    @Column(name = "hip_cm")
    private Float hipCm;

    @Column(name = "arm_length_cm")
    private Float armLengthCm;

    @Column(name = "leg_length_cm")
    private Float legLengthCm;

    @Column(name = "preferred_adult_size")
    private String preferredAdultSize;

    @Column(name = "preferred_kids_size")
    private String preferredKidsSize;

    @Column(name = "shoe_size")
    private String shoeSize;

    @Column(name = "fit_preference")
    private String fitPreference;

    @Column(name = "note")
    private String note;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getMeasurementProfileType() { return measurementProfileType; }
    public void setMeasurementProfileType(String measurementProfileType) { this.measurementProfileType = measurementProfileType; }

    public Float getHeightCm() { return heightCm; }
    public void setHeightCm(Float heightCm) { this.heightCm = heightCm; }

    public Float getWeightKg() { return weightKg; }
    public void setWeightKg(Float weightKg) { this.weightKg = weightKg; }

    public Float getShoulderCm() { return shoulderCm; }
    public void setShoulderCm(Float shoulderCm) { this.shoulderCm = shoulderCm; }

    public Float getChestCm() { return chestCm; }
    public void setChestCm(Float chestCm) { this.chestCm = chestCm; }

    public Float getWaistCm() { return waistCm; }
    public void setWaistCm(Float waistCm) { this.waistCm = waistCm; }

    public Float getHipCm() { return hipCm; }
    public void setHipCm(Float hipCm) { this.hipCm = hipCm; }

    public Float getArmLengthCm() { return armLengthCm; }
    public void setArmLengthCm(Float armLengthCm) { this.armLengthCm = armLengthCm; }

    public Float getLegLengthCm() { return legLengthCm; }
    public void setLegLengthCm(Float legLengthCm) { this.legLengthCm = legLengthCm; }

    public String getPreferredAdultSize() { return preferredAdultSize; }
    public void setPreferredAdultSize(String preferredAdultSize) { this.preferredAdultSize = preferredAdultSize; }

    public String getPreferredKidsSize() { return preferredKidsSize; }
    public void setPreferredKidsSize(String preferredKidsSize) { this.preferredKidsSize = preferredKidsSize; }

    public String getShoeSize() { return shoeSize; }
    public void setShoeSize(String shoeSize) { this.shoeSize = shoeSize; }

    public String getFitPreference() { return fitPreference; }
    public void setFitPreference(String fitPreference) { this.fitPreference = fitPreference; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
