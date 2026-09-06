-- ==================================================
-- Fashion Recommendation System - Database Schema
-- Target Database: PostgreSQL / Neon / Supabase
-- ==================================================

-- Enable pgvector extension for future AI Recommendation embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Table: categories
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500)
);

-- 2. Table: users
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table: products
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    brand VARCHAR(100),
    price NUMERIC(12, 2) NOT NULL,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    gender VARCHAR(20),
    material VARCHAR(100),
    style VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table: product_variants
CREATE TABLE IF NOT EXISTS product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(50),
    size VARCHAR(50),
    price NUMERIC(12, 2),
    stock INT NOT NULL DEFAULT 0
);
