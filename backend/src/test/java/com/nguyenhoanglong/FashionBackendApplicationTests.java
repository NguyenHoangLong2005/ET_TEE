package com.nguyenhoanglong;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Thieu @ActiveProfiles("test") thi test nay chay voi application.properties,
 * tuc la ket noi thang vao database that va (tu khi bat Flyway) con chay ca
 * migrate len do. Luon giu profile "test" de context load tren H2 in-memory.
 */
@SpringBootTest
@ActiveProfiles("test")
class FashionBackendApplicationTests {

    @Test
    void contextLoads() {
    }
}


