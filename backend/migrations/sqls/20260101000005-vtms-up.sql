CREATE TABLE log_books (
    id SERIAL PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'Arrival',
    document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    document_berth_id INTEGER REFERENCES document_berths(id) ON DELETE SET NULL,
    vessel_id INTEGER REFERENCES vessels(id) ON DELETE SET NULL,
    vessel_government_id INTEGER REFERENCES vessel_governments(id) ON DELETE SET NULL,
    vessel_kind VARCHAR(20) NOT NULL DEFAULT 'vessel',
    gross_tonnage NUMERIC(14,3) NOT NULL DEFAULT 0,
    depth NUMERIC(12,2) NOT NULL DEFAULT 0,
    voyage VARCHAR(50) NOT NULL DEFAULT '',
    port_id_next INTEGER REFERENCES ports(id) ON DELETE SET NULL,
    port_id_last INTEGER REFERENCES ports(id) ON DELETE SET NULL,
    purpose_type VARCHAR(30) NOT NULL DEFAULT '',
    file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    agency_name VARCHAR(255) NOT NULL DEFAULT 'VTMS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE INDEX log_books_document_id_idx ON log_books (document_id);
CREATE INDEX log_books_vessel_id_idx ON log_books (vessel_id);

CREATE TABLE log_book_details (
    id SERIAL PRIMARY KEY,
    log_book_id INTEGER NOT NULL REFERENCES log_books(id) ON DELETE CASCADE,
    type_doc VARCHAR(20) NOT NULL DEFAULT 'Arrival',
    document_berth_id INTEGER,
    berth_id INTEGER REFERENCES berths(id) ON DELETE SET NULL,
    jetty_id INTEGER,
    purpose_id INTEGER,
    cargo_type_id INTEGER,
    cargo_wharfage_id INTEGER,
    locate_id INTEGER,
    use_berth_id INTEGER,
    mooring_date TIMESTAMPTZ,
    departure_date TIMESTAMPTZ
);

CREATE INDEX log_book_details_log_book_id_idx ON log_book_details (log_book_id);

CREATE TABLE log_book_tugs (
    id SERIAL PRIMARY KEY,
    log_book_id INTEGER NOT NULL REFERENCES log_books(id) ON DELETE CASCADE,
    tug_id INTEGER REFERENCES tugs(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Vessel In',
    status_code VARCHAR(20) NOT NULL DEFAULT 'Arrival'
);

CREATE TABLE log_book_pilots (
    id SERIAL PRIMARY KEY,
    log_book_id INTEGER NOT NULL REFERENCES log_books(id) ON DELETE CASCADE,
    pilot_id INTEGER REFERENCES pilots(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Vessel In',
    status_code VARCHAR(20) NOT NULL DEFAULT 'Arrival'
);

CREATE TABLE log_book_products (
    id SERIAL PRIMARY KEY,
    log_book_id INTEGER NOT NULL REFERENCES log_books(id) ON DELETE CASCADE,
    product_type_id INTEGER,
    product_group_id INTEGER,
    m_ton_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
    r_ton_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT ''
);

CREATE TABLE anchors (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    document_berth_id INTEGER,
    vessel_id INTEGER REFERENCES vessels(id) ON DELETE SET NULL,
    berth_id INTEGER REFERENCES berths(id) ON DELETE SET NULL,
    purpose_id INTEGER,
    cargo_type_id INTEGER,
    cargo_wharfage_id INTEGER,
    gross_tonnage NUMERIC(14,3) NOT NULL DEFAULT 0,
    depth NUMERIC(12,2) NOT NULL DEFAULT 0,
    voyage VARCHAR(50) NOT NULL DEFAULT '',
    port_id_next INTEGER,
    port_id_last INTEGER,
    pilot_date TIMESTAMPTZ,
    anchor_date TIMESTAMPTZ,
    aweigh_date TIMESTAMPTZ,
    latitude VARCHAR(30) NOT NULL DEFAULT '',
    longitude VARCHAR(30) NOT NULL DEFAULT '',
    remark TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'Anchor',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE INDEX anchors_document_id_idx ON anchors (document_id);
