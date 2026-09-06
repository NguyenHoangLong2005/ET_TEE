package com.nguyenhoanglong;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.stream.Stream;

@SpringBootApplication
public class FashionBackendApplication {

    static {
        loadDotEnv();
    }

    public static void main(String[] args) {
        SpringApplication.run(FashionBackendApplication.class, args);
    }

    /**
     * Loads key-value pairs from .env file into System properties if not already set.
     * Allows local development to read backend/.env seamlessly.
     */
    private static void loadDotEnv() {
        Path[] possiblePaths = new Path[]{
            Paths.get(".env"),
            Paths.get("backend/.env")
        };

        for (Path path : possiblePaths) {
            if (Files.exists(path)) {
                try (Stream<String> lines = Files.lines(path)) {
                    lines.map(String::trim)
                         .filter(line -> !line.isEmpty() && !line.startsWith("#") && line.contains("="))
                         .forEach(line -> {
                             int eqIdx = line.indexOf('=');
                             String key = line.substring(0, eqIdx).trim();
                             String value = line.substring(eqIdx + 1).trim();
                             if ((value.startsWith("\"") && value.endsWith("\"")) ||
                                 (value.startsWith("'") && value.endsWith("'"))) {
                                 value = value.substring(1, value.length() - 1);
                             }
                             if (System.getenv(key) == null && System.getProperty(key) == null) {
                                 System.setProperty(key, value);
                             }
                         });
                    System.out.println("Loaded environment variables from: " + path.toAbsolutePath());
                    break;
                } catch (Exception e) {
                    System.err.println("Warning: Could not read .env file from " + path + ": " + e.getMessage());
                }
            }
        }
    }
}
