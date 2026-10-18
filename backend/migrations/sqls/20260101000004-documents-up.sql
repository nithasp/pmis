CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    doc_number VARCHAR(30) NOT NULL DEFAULT '',
    agency_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'Draft',
    vessel_status VARCHAR(30) NOT NULL DEFAULT 'PendingBerth',
    request_date TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    port_at TIMESTAMPTZ,
    departured_at TIMESTAMPTZ,
    reject_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_new_ship BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE INDEX documents_agency_user_id_idx ON documents (agency_user_id);
CREATE INDEX documents_status_idx ON documents (status);
CREATE INDEX documents_request_date_idx ON documents (request_date);

CREATE TABLE document_vessels (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
    vessel_id INTEGER REFERENCES vessels(id) ON DELETE SET NULL,
    vessel_flag_id INTEGER,
    vessel_type_id INTEGER,
    vessel_owner VARCHAR(255) NOT NULL DEFAULT '',
    vessel_owner_id INTEGER,
    vessel_name VARCHAR(200) NOT NULL DEFAULT '',
    vessel_imo_number VARCHAR(20) NOT NULL DEFAULT '',
    vessel_mmsi_number VARCHAR(20) NOT NULL DEFAULT '',
    vessel_dsv_number VARCHAR(30) NOT NULL DEFAULT '',
    vessel_official_number VARCHAR(30) NOT NULL DEFAULT '',
    vessel_call_sign VARCHAR(20) NOT NULL DEFAULT '',
    vessel_nationality VARCHAR(100) NOT NULL DEFAULT '',
    vessel_country VARCHAR(100) NOT NULL DEFAULT '',
    vessel_load_weight NUMERIC(14,3) NOT NULL DEFAULT 0,
    vessel_gross_tonnage NUMERIC(14,3) NOT NULL DEFAULT 0,
    vessel_net_tonnage NUMERIC(14,3) NOT NULL DEFAULT 0,
    vessel_length_overall NUMERIC(12,2) NOT NULL DEFAULT 0,
    vessel_breadth_extreme NUMERIC(12,2) NOT NULL DEFAULT 0,
    vessel_depth NUMERIC(12,2) NOT NULL DEFAULT 0,
    vessel_main_engine VARCHAR(150) NOT NULL DEFAULT '',
    vessel_band_and_model VARCHAR(150) NOT NULL DEFAULT '',
    vessel_license_expired_date DATE
);

CREATE TABLE document_files (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    file_type VARCHAR(80) NOT NULL DEFAULT ''
);

CREATE INDEX document_files_document_id_idx ON document_files (document_id);

CREATE TABLE document_berths (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    berth_id INTEGER REFERENCES berths(id) ON DELETE SET NULL,
    berth_type VARCHAR(20) NOT NULL DEFAULT '',
    purpose_type_id INTEGER,
    purpose_id INTEGER,
    cargo_type_id INTEGER,
    passengers INTEGER NOT NULL DEFAULT 0,
    estimated_arrival TIMESTAMPTZ,
    estimated_departure TIMESTAMPTZ,
    note TEXT NOT NULL DEFAULT '',
    sequence INTEGER NOT NULL DEFAULT 1,
    jetty_id INTEGER,
    etb TIMESTAMPTZ,
    etd TIMESTAMPTZ,
    berth_save_date TIMESTAMPTZ,
    cargo_work_time VARCHAR(50) NOT NULL DEFAULT ''
);

CREATE INDEX document_berths_document_id_idx ON document_berths (document_id);
CREATE INDEX document_berths_berth_id_idx ON document_berths (berth_id);

CREATE TABLE document_berth_products (
    id SERIAL PRIMARY KEY,
    document_berth_id INTEGER NOT NULL REFERENCES document_berths(id) ON DELETE CASCADE,
    purpose_id INTEGER,
    product_type_id INTEGER,
    product_group_id INTEGER,
    cargo_wharfage_id INTEGER,
    m_ton_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
    r_ton_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
    package_amount INTEGER NOT NULL DEFAULT 0,
    receiver VARCHAR(255) NOT NULL DEFAULT '',
    cargo_owner_id INTEGER,
    berth_type VARCHAR(20) NOT NULL DEFAULT ''
);

CREATE INDEX document_berth_products_berth_idx ON document_berth_products (document_berth_id);

CREATE TABLE document_berth_files (
    id SERIAL PRIMARY KEY,
    document_berth_id INTEGER NOT NULL REFERENCES document_berths(id) ON DELETE CASCADE,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    file_type VARCHAR(80) NOT NULL DEFAULT 'other'
);

CREATE TABLE document_invoices (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
    customer_id INTEGER,
    name VARCHAR(255) NOT NULL DEFAULT '',
    tax_id VARCHAR(20) NOT NULL DEFAULT '',
    contact_name VARCHAR(255) NOT NULL DEFAULT '',
    payment_method_id INTEGER,
    payment_term_id INTEGER,
    country_id INTEGER,
    sub_district_id INTEGER,
    district_id INTEGER,
    province_id INTEGER,
    post_code VARCHAR(10) NOT NULL DEFAULT '',
    stage_province VARCHAR(150) NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    phone_number VARCHAR(30) NOT NULL DEFAULT '',
    secondary_phone_number VARCHAR(30) NOT NULL DEFAULT ''
);

CREATE TABLE document_spacial_berths (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    berth_id INTEGER NOT NULL,
    jetty_id INTEGER,
    eta TIMESTAMPTZ,
    etb TIMESTAMPTZ,
    etd TIMESTAMPTZ
);

CREATE TABLE document_histories (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX document_histories_document_id_idx ON document_histories (document_id);
