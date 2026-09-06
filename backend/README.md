# Fashion Recommendation System - Backend (Phase 1)

Modern, high-performance Spring Boot backend for a Fashion Recommendation System, designed as a clean Modular Monolith that seamlessly integrates with PostgreSQL (Neon / Supabase Cloud) and is structured for future AI Recommendation service extensions (SASRec, FashionCLIP, pgvector).

---

## 🚀 Tech Stack

- **Language & Runtime**: Java 21 (LTS)
- **Framework**: Spring Boot 3.4.3
- **Build Tool**: Apache Maven (via Maven Wrapper `mvnw`)
- **Database**: PostgreSQL (Neon / Supabase Cloud)
- **OR Mapping**: Spring Data JPA / Hibernate
- **Utilities**: Bean Validation (`jakarta.validation`), Automatic `.env` Loader

---

## 📁 Project Structure

```
fashion-recommendation-system/
├── backend/
│   ├── .env                 ← Database credentials (ignored in Git)
│   ├── .env.example         ← Template for database credentials
│   ├── .gitignore
│   ├── mvnw
│   ├── mvnw.cmd
│   ├── pom.xml
│   ├── README.md
│   └── src/
│       ├── main/
│       │   ├── java/
│       │   │   └── com/
│       │   │       └── nguyenhoanglong/
│       │   │           ├── FashionBackendApplication.java (Auto-loads .env)
│       │   │           ├── config/
│       │   │           │   └── CorsConfig.java
│       │   │           ├── controller/
│       │   │           │   ├── HealthController.java
│       │   │           │   └── ProductController.java
│       │   │           ├── dto/
│       │   │           │   ├── ApiResponse.java
│       │   │           │   ├── CategoryDto.java
│       │   │           │   ├── ProductDto.java
│       │   │           │   └── ProductVariantDto.java
│       │   │           ├── entity/
│       │   │           │   ├── Category.java
│       │   │           │   ├── Product.java
│       │   │           │   ├── ProductVariant.java
│       │   │           │   └── User.java
│       │   │           ├── exception/
│       │   │           │   ├── GlobalExceptionHandler.java
│       │   │           │   └── ResourceNotFoundException.java
│       │   │           ├── repository/
│       │   │           │   ├── CategoryRepository.java
│       │   │           │   ├── ProductRepository.java
│       │   │           │   ├── ProductVariantRepository.java
│       │   │           │   └── UserRepository.java
│       │   │           └── service/
│       │   │               ├── ProductService.java
│       │   │               └── ProductServiceImpl.java
│       │   └── resources/
│       │       └── application.properties
│       └── test/
│           └── java/
│               └── com/
│                   └── nguyenhoanglong/
│                       └── FashionBackendApplicationTests.java
├── mobile/                  ← Flutter Mobile App
└── web/                     ← Web Client (Next.js)
```

---

## ⚙️ Environment Variables & Automatic `.env` Loading

### 1. Database Configuration in `backend/.env`

Create/Edit `backend/.env`:

```env
DB_URL=jdbc:postgresql://db.yzxpmznwfitcchzeejla.supabase.co:5432/postgres?sslmode=require
DB_USERNAME=postgres
DB_PASSWORD=your_password
```

### 2. How `.env` is Loaded

`FashionBackendApplication.java` contains an automatic `.env` loader (`loadDotEnv()`). When starting the application locally, it automatically reads `backend/.env` or `.env` and sets `System` properties before Spring Boot initializes `application.properties`:

```properties
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
```

- Local Dev: Reads credentials automatically from `backend/.env`.
- Production: Automatically uses system environment variables provided by hosting platforms.

---

## 💻 How to Run

### Requirements
- JDK 21+ installed and configured on your `PATH`.

### Step 1: Navigate to `backend` directory

```bash
cd backend
```

### Step 2: Run Application

```bash
# Windows
.\mvnw.cmd spring-boot:run

# Linux / macOS
./mvnw spring-boot:run
```

The application starts on `http://localhost:8080`.

---

## 🔌 API Endpoints Summary

All API responses follow a standardized REST response wrapper format:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "timestamp": "2026-09-06T22:10:00.123"
}
```

### 1. Health & Database Connection APIs

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Check overall backend application status |
| `GET` | `/api/health/database` | Test active connection to PostgreSQL database |

#### Example Response: `GET /api/health`
```json
{
  "success": true,
  "message": "Fashion Backend is running",
  "data": {
    "status": "UP"
  },
  "timestamp": "2026-09-06T22:10:00.123"
}
```

#### Example Response: `GET /api/health/database`
```json
{
  "success": true,
  "message": "Database connection is healthy",
  "data": {
    "status": "UP",
    "databaseProduct": "PostgreSQL",
    "databaseVersion": "15.8"
  },
  "timestamp": "2026-09-06T22:10:05.456"
}
```

---

### 2. Product Management APIs

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/products` | Retrieve list of all products with categories and variants |
| `GET` | `/api/products/{id}` | Retrieve details of a single product by ID |
| `POST` | `/api/products` | Create a new product with category & variants |
| `PUT` | `/api/products/{id}` | Update an existing product by ID |
| `DELETE` | `/api/products/{id}` | Delete a product by ID |

---

## 🔮 Future Architecture Integration (Phase 2+)

In upcoming phases, this Spring Boot backend will serve as the core transactional engine and API Gateway for:
1. **Flutter Mobile App (`mobile/`) & Web Client (`web/`)**
2. **AI Recommendation Service (Python FastAPI)** using **SASRec** and **FashionCLIP**.
3. **pgvector extension** in PostgreSQL for feature vector embeddings.
