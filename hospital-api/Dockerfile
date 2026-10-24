# Giai đoạn 1: Build file JAR từ mã nguồn
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Giai đoạn 2: Chạy ứng dụng trên môi trường JRE siêu nhẹ
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Tối ưu RAM cho Render Free Tier (512MB): giới hạn Heap max 320MB, SerialGC, Stack 512k
ENTRYPOINT ["java", "-Xms180m", "-Xmx320m", "-XX:+UseSerialGC", "-Xss512k", "-jar", "app.jar"]
