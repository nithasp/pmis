CREATE TABLE vessels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    owner VARCHAR(255) NOT NULL DEFAULT '',
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    imo_number VARCHAR(20) NOT NULL DEFAULT '',
    mmsi_number VARCHAR(20) NOT NULL DEFAULT '',
    dsv_number VARCHAR(30) NOT NULL DEFAULT '',
    official_number VARCHAR(30) NOT NULL DEFAULT '',
    call_sign VARCHAR(20) NOT NULL DEFAULT '',
    load_weight NUMERIC(14,3) NOT NULL DEFAULT 0,
    gross_tonnage NUMERIC(14,3) NOT NULL DEFAULT 0,
    net_tonnage NUMERIC(14,3) NOT NULL DEFAULT 0,
    length_overall NUMERIC(12,2) NOT NULL DEFAULT 0,
    breadth_extreme NUMERIC(12,2) NOT NULL DEFAULT 0,
    depth NUMERIC(12,2) NOT NULL DEFAULT 0,
    main_engine VARCHAR(150) NOT NULL DEFAULT '',
    band_and_model VARCHAR(150) NOT NULL DEFAULT '',
    vessel_flag_id INTEGER REFERENCES vessel_flags(id) ON DELETE SET NULL,
    vessel_type_id INTEGER REFERENCES vessel_types(id) ON DELETE SET NULL,
    license_expired_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE INDEX vessels_owner_id_idx ON vessels (owner_id);
CREATE INDEX vessels_name_idx ON vessels (LOWER(name));

CREATE TABLE vessel_files (
    id SERIAL PRIMARY KEY,
    vessel_id INTEGER NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    file_type VARCHAR(80) NOT NULL DEFAULT ''
);

CREATE INDEX vessel_files_vessel_id_idx ON vessel_files (vessel_id);

CREATE TABLE vessel_governments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    vessel_flag_id INTEGER REFERENCES vessel_flags(id) ON DELETE SET NULL,
    vessel_type_id INTEGER REFERENCES vessel_types(id) ON DELETE SET NULL,
    official_number VARCHAR(30) NOT NULL DEFAULT '',
    authority_id INTEGER REFERENCES authorities(id) ON DELETE SET NULL,
    length_overall NUMERIC(12,2) NOT NULL DEFAULT 0,
    breadth NUMERIC(12,2) NOT NULL DEFAULT 0,
    depth NUMERIC(12,2) NOT NULL DEFAULT 0,
    displacement NUMERIC(14,3) NOT NULL DEFAULT 0,
    file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);
