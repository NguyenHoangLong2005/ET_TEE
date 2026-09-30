package com.nguyenhoanglong.dto;

import lombok.Data;

@Data
public class MeasurementRequest {
    private String measurementProfileType; // SELF_ADULT, CHILD, OTHER
    private Float heightCm;
    private Float weightKg;
    private Float shoulderCm;
    private Float chestCm;
    private Float waistCm;
    private Float hipCm;
    private Float armLengthCm;
    private Float legLengthCm;
    private String preferredAdultSize;
    private String preferredKidsSize;
    private String shoeSize;
    private String fitPreference;
    private String note;

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
}
