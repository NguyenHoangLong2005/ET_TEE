package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.ActivityLog;
import com.nguyenhoanglong.repository.ActivityLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ActivityLogService {

    private static final Logger log = LoggerFactory.getLogger(ActivityLogService.class);

    private final ActivityLogRepository activityLogRepository;

    public ActivityLogService(ActivityLogRepository activityLogRepository) {
        this.activityLogRepository = activityLogRepository;
    }

    public ActivityLog log(String userId, String action, String targetEntity, String targetId, String description, String ipAddress) {
        try {
            ActivityLog activityLog = new ActivityLog();
            activityLog.setUserId(userId != null ? userId : "SYSTEM");
            activityLog.setAction(action);
            activityLog.setTargetEntity(targetEntity);
            activityLog.setTargetId(targetId);
            activityLog.setDescription(description);
            activityLog.setIpAddress(ipAddress != null ? ipAddress : "127.0.0.1");
            activityLog.setCreatedAt(LocalDateTime.now());
            return activityLogRepository.save(activityLog);
        } catch (Exception e) {
            log.error("Failed to persist activity log: {}", e.getMessage(), e);
            return null;
        }
    }
}
