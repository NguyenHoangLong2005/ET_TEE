package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.User;

public interface CskhExtendedService {

    RestrictedOrderLookupDto lookupOrder(User actor, OrderLookupRequestDto dto);

    CskhVoucherGrantDto issueCompensationVoucher(User actor, IssueCompensationVoucherDto dto);

    CskhQuotaStatusDto getMyQuotaStatus(User actor);

    CskhQuotaStatusDto updateStaffQuota(User admin, String staffId, UpdateCskhQuotaDto dto);

    PaginatedResponseDto<OrderLookupAuditLogDto> getAuditLogs(User actor, int page, int size);
}
