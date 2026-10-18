CREATE TABLE port_dues (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    port_due_number VARCHAR(30) NOT NULL,
    doc_type VARCHAR(30) NOT NULL DEFAULT 'Invoice',
    status VARCHAR(30) NOT NULL DEFAULT 'created',
    gross_tonnage NUMERIC(14,3) NOT NULL DEFAULT 0,
    berth_id INTEGER,
    berth_at TIMESTAMPTZ,
    departured_at TIMESTAMPTZ,
    invoice JSONB NOT NULL DEFAULT '{}'::jsonb,
    rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    fee NUMERIC(14,2) NOT NULL DEFAULT 0,
    vat NUMERIC(14,2) NOT NULL DEFAULT 0,
    vat_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    total NUMERIC(14,2) NOT NULL DEFAULT 0,
    payment_period INTEGER NOT NULL DEFAULT 30,
    due_date TIMESTAMPTZ,
    paid_date TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    cancel_note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system'
);

CREATE INDEX port_dues_document_id_idx ON port_dues (document_id);

CREATE TABLE contracts (
    id SERIAL PRIMARY KEY,
    contract_no VARCHAR(50) NOT NULL,
    berth_id INTEGER REFERENCES berths(id) ON DELETE SET NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    initial_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    annual_increase_rate NUMERIC(8,2) NOT NULL DEFAULT 0,
    rate_change_cycle INTEGER NOT NULL DEFAULT 1,
    rate_change_start_year VARCHAR(10) NOT NULL DEFAULT '',
    terminated_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150) NOT NULL DEFAULT 'system',
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX contracts_contract_no_idx ON contracts (LOWER(contract_no)) WHERE deleted_at IS NULL;

CREATE TABLE contract_rates (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    rate NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE contract_files (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE
);
