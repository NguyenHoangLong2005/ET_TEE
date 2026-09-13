package com.ettee.opscore.cskh.ticket.controller;

import com.ettee.opscore.cskh.ticket.dto.IssueSupportCodeRequest;
import com.ettee.opscore.cskh.ticket.dto.SupportCodeDto;
import com.ettee.opscore.cskh.ticket.service.SupportCodeService;
import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.security.JwtPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Nghiệp vụ "Gửi mã hỗ trợ theo hạn mức" — permission support.code.issue. */
@RestController
@RequestMapping("/api/cskh/support-codes")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('support.code.issue')")
public class CskhSupportCodeController {

    private final SupportCodeService supportCodeService;

    @GetMapping
    public ApiResponse<PageResponse<SupportCodeDto>> list(Pageable pageable) {
        return ApiResponse.ok(supportCodeService.list(pageable));
    }

    @PostMapping
    public ApiResponse<SupportCodeDto> issue(@Valid @RequestBody IssueSupportCodeRequest request, @AuthenticationPrincipal JwtPrincipal actor) {
        return ApiResponse.ok(supportCodeService.issue(request, actor.userId()), "Đã phát mã hỗ trợ (chờ phê duyệt)");
    }

    @PostMapping("/{id}/approve")
    public ApiResponse<SupportCodeDto> approve(@PathVariable UUID id, @AuthenticationPrincipal JwtPrincipal actor) {
        return ApiResponse.ok(supportCodeService.approve(id, actor.userId()), "Đã phê duyệt mã hỗ trợ");
    }
}
