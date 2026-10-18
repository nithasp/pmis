CREATE TABLE vessel_imports (
    id SERIAL PRIMARY KEY,
    vessel_id INTEGER REFERENCES vessels(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PendingSend',
    gross_tonnage NUMERIC(14,3) NOT NULL DEFAULT 0,
    gross_tonnage_approved NUMERIC(14,3),
    mooring_date TIMESTAMPTZ,
    unmooring_date TIMESTAMPTZ,
    berth_id INTEGER REFERENCES berths(id) ON DELETE SET NULL,
    jetty_id INTEGER,
    note TEXT NOT NULL DEFAULT '',
    notes JSONB NOT NULL DEFAULT '[]'::jsonb,
    log_book_id INTEGER REFERENCES log_books(id) ON DELETE SET NULL,
    document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    statement_file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    ship_file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    cargo_manifest_file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    surveyor_file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    certificate_quantity_file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    berth_booking_request_file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    other_file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    created_by_id INTEGER,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE INDEX vessel_imports_status_idx ON vessel_imports (status);
CREATE INDEX vessel_imports_vessel_id_idx ON vessel_imports (vessel_id);

CREATE TABLE vessel_import_products (
    id SERIAL PRIMARY KEY,
    vessel_import_id INTEGER NOT NULL REFERENCES vessel_imports(id) ON DELETE CASCADE,
    purpose_type_id INTEGER,
    cargo_type_id INTEGER,
    cargo_wharfage_id INTEGER,
    product_type_id INTEGER,
    product_group_id INTEGER,
    product_id INTEGER,
    product_name VARCHAR(200) NOT NULL DEFAULT '',
    cargo_owner_id INTEGER,
    cargo_owner_name VARCHAR(200) NOT NULL DEFAULT '',
    m_ton_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
    r_ton_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
    bl_product VARCHAR(100) NOT NULL DEFAULT '',
    country_id INTEGER,
    passengers INTEGER NOT NULL DEFAULT 0,
    detail TEXT NOT NULL DEFAULT ''
);

CREATE INDEX vessel_import_products_import_idx ON vessel_import_products (vessel_import_id);

CREATE TABLE vessel_import_files (
    id SERIAL PRIMARY KEY,
    vessel_import_id INTEGER NOT NULL REFERENCES vessel_imports(id) ON DELETE CASCADE,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL DEFAULT ''
);
