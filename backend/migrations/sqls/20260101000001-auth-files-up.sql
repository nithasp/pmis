CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    storage_driver VARCHAR(20) NOT NULL DEFAULT 'local',
    url TEXT,
    mime_type VARCHAR(150),
    size_bytes BIGINT,
    file_type VARCHAR(80),
    uploaded_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    role_type VARCHAR(50) NOT NULL DEFAULT 'Admin',
    activated BOOLEAN NOT NULL DEFAULT TRUE,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    type VARCHAR(20) NOT NULL DEFAULT 'Agency',
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    person_type VARCHAR(20) NOT NULL DEFAULT 'corporate',
    tax VARCHAR(20) NOT NULL DEFAULT '',
    company VARCHAR(255) NOT NULL DEFAULT '',
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(30) NOT NULL DEFAULT '',
    mobile_phone VARCHAR(30) NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    country_id INTEGER,
    province_id INTEGER,
    district_id INTEGER,
    sub_district_id INTEGER,
    stage_province VARCHAR(150) NOT NULL DEFAULT '',
    zip_code VARCHAR(10) NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'Approved',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_accepted_term BOOLEAN NOT NULL DEFAULT TRUE,
    is_first_login BOOLEAN NOT NULL DEFAULT FALSE,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    rights_type VARCHAR(50) NOT NULL DEFAULT '',
    version_app VARCHAR(20) NOT NULL DEFAULT '1.16.2',
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX users_email_lower_idx ON users (LOWER(email)) WHERE deleted_at IS NULL;
CREATE INDEX users_type_idx ON users (type);

CREATE TABLE user_files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    file_type VARCHAR(80) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_files_user_id_idx ON user_files (user_id);

CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    family_id UUID NOT NULL,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_family_id_idx ON refresh_tokens (family_id);

CREATE TABLE verification_tokens (
    id SERIAL PRIMARY KEY,
    kind VARCHAR(30) NOT NULL,
    email VARCHAR(150) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(120) NOT NULL UNIQUE,
    code VARCHAR(10),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX verification_tokens_email_idx ON verification_tokens (LOWER(email), kind);

CREATE TABLE terms (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tax VARCHAR(20) NOT NULL DEFAULT '',
    company VARCHAR(255) NOT NULL DEFAULT '',
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    payment_method_id INTEGER,
    payment_term_id INTEGER,
    address TEXT NOT NULL DEFAULT '',
    country_id INTEGER,
    sub_district_id INTEGER,
    district_id INTEGER,
    province_id INTEGER,
    stage_province VARCHAR(150) NOT NULL DEFAULT '',
    zip_code VARCHAR(10) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX user_addresses_user_id_idx ON user_addresses (user_id);

CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(30) NOT NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_logs_created_at_idx ON activity_logs (created_at);
