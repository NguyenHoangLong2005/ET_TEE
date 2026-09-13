package com.ettee.opscore;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * ET.TEE Store - Operations Core.
 * Backend phục vụ 3 khu vực nội bộ: Admin, Chủ cửa hàng (Store Owner), CSKH.
 * Không phục vụ storefront khách hàng (nằm ngoài phạm vi đợt này).
 */
@SpringBootApplication
public class OpsCoreApplication {
    public static void main(String[] args) {
        SpringApplication.run(OpsCoreApplication.class, args);
    }
}
