# Spring Boot backend: build the fat jar with Maven, run it on a JRE-only image.
# JDK 25 like local dev: since JDK 23 javac skips implicit annotation processing, so Lombok stays inert.
# On JDK 21 Lombok runs and its generated constructors clash with the hand-written ones.
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /src
# Dependencies first so a source-only change reuses this layer
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:25-jre
WORKDIR /app
RUN useradd --system --uid 10001 app \
 && mkdir -p uploads logs models-live \
 && chown -R app:app /app
COPY --from=build /src/target/*.jar app.jar
USER app
EXPOSE 8081
# uploads/ (product images), logs/ and models-live/ (retrained models; falls back to the ones bundled in the jar)
VOLUME ["/app/uploads", "/app/logs", "/app/models-live"]
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
