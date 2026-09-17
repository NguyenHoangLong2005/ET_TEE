package com.ettee.opscore.storeowner.dashboard.dto;

import java.time.LocalDate;

public record DashboardRangeRequest(LocalDate from, LocalDate to) {
}
