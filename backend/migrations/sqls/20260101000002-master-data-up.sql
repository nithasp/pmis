CREATE TABLE countries (
    id INTEGER PRIMARY KEY,
    code VARCHAR(3) NOT NULL,
    name_th VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL
);

CREATE TABLE provinces (
    id SERIAL PRIMARY KEY,
    name_th VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    geography_id INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    province_id INTEGER NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
    name_th VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL
);

CREATE INDEX districts_province_id_idx ON districts (province_id);

CREATE TABLE sub_districts (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name_th VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    zipcode VARCHAR(10) NOT NULL DEFAULT ''
);

CREATE INDEX sub_districts_district_id_idx ON sub_districts (district_id);

CREATE TABLE vessel_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE TABLE vessel_flags (
    id INTEGER PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(3) NOT NULL DEFAULT '',
    path TEXT NOT NULL DEFAULT '',
    file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE SEQUENCE vessel_flags_id_seq START 1000 OWNED BY vessel_flags.id;
ALTER TABLE vessel_flags ALTER COLUMN id SET DEFAULT nextval('vessel_flags_id_seq');

CREATE TABLE ports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    locode VARCHAR(10) NOT NULL DEFAULT '',
    country_id INTEGER REFERENCES countries(id) ON DELETE SET NULL,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE TABLE berths (
    id SERIAL PRIMARY KEY,
    name_th VARCHAR(200) NOT NULL,
    name_en VARCHAR(200) NOT NULL,
    name_alt VARCHAR(50) NOT NULL,
    berth_type VARCHAR(20) NOT NULL DEFAULT 'Other',
    vessel_type_id INTEGER REFERENCES vessel_types(id) ON DELETE SET NULL,
    port_due_rate NUMERIC(12,2) NOT NULL DEFAULT 8.56,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE TABLE jetties (
    id SERIAL PRIMARY KEY,
    berth_id INTEGER NOT NULL REFERENCES berths(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    status BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX jetties_berth_id_idx ON jetties (berth_id);

CREATE TABLE locates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE TABLE use_berths (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE TABLE purpose_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name_en VARCHAR(100) NOT NULL,
    name_th VARCHAR(100) NOT NULL
);

CREATE TABLE purposes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    purpose_type_id INTEGER NOT NULL REFERENCES purpose_types(id),
    is_government BOOLEAN NOT NULL DEFAULT FALSE,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE TABLE cargo_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE TABLE cargo_wharfages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    purpose_type_ids VARCHAR(100) NOT NULL DEFAULT '',
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE TABLE product_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE TABLE product_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    product_group_id INTEGER REFERENCES product_groups(id) ON DELETE SET NULL,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    product_type_id INTEGER REFERENCES product_types(id) ON DELETE SET NULL,
    product_group_id INTEGER REFERENCES product_groups(id) ON DELETE SET NULL,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE TABLE pilots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    number VARCHAR(30) NOT NULL DEFAULT '',
    tel VARCHAR(30) NOT NULL DEFAULT '',
    status BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE tugs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(100) NOT NULL DEFAULT '',
    status BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    payment_period_day INTEGER NOT NULL DEFAULT 30
);

CREATE TABLE payment_terms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    days INTEGER NOT NULL DEFAULT 30
);

CREATE TABLE authorities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL
);

CREATE TABLE cargo_owners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL
);

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL DEFAULT '',
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(20) NOT NULL DEFAULT '',
    contact_name VARCHAR(255) NOT NULL DEFAULT '',
    payment_method_id INTEGER,
    payment_term_id INTEGER,
    country_id INTEGER,
    province_id INTEGER,
    district_id INTEGER,
    sub_district_id INTEGER,
    post_code VARCHAR(10) NOT NULL DEFAULT '',
    stage_province VARCHAR(150) NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    phone_number VARCHAR(30) NOT NULL DEFAULT '',
    secondary_phone_number VARCHAR(30) NOT NULL DEFAULT ''
);
