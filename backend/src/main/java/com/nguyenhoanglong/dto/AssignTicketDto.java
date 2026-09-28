package com.nguyenhoanglong.dto;

public class AssignTicketDto {
    private String assignedTo;
    private String escalatedTo;
    private String note;

    public AssignTicketDto() {}

    public AssignTicketDto(String assignedTo, String escalatedTo, String note) {
        this.assignedTo = assignedTo;
        this.escalatedTo = escalatedTo;
        this.note = note;
    }

    public static AssignTicketDtoBuilder builder() {
        return new AssignTicketDtoBuilder();
    }

    public static class AssignTicketDtoBuilder {
        private String assignedTo;
        private String escalatedTo;
        private String note;

        public AssignTicketDtoBuilder assignedTo(String assignedTo) { this.assignedTo = assignedTo; return this; }
        public AssignTicketDtoBuilder escalatedTo(String escalatedTo) { this.escalatedTo = escalatedTo; return this; }
        public AssignTicketDtoBuilder note(String note) { this.note = note; return this; }

        public AssignTicketDto build() {
            return new AssignTicketDto(assignedTo, escalatedTo, note);
        }
    }

    public String getAssignedTo() { return assignedTo; }
    public void setAssignedTo(String assignedTo) { this.assignedTo = assignedTo; }

    public String getEscalatedTo() { return escalatedTo; }
    public void setEscalatedTo(String escalatedTo) { this.escalatedTo = escalatedTo; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
