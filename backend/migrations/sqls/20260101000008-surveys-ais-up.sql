CREATE TABLE surveys (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    publish_schedule BOOLEAN NOT NULL DEFAULT FALSE,
    publish_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(150) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE survey_sections (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    type_section VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    no INTEGER NOT NULL DEFAULT 1,
    satisfaction_min INTEGER,
    satisfaction_des_min VARCHAR(150),
    satisfaction_max INTEGER,
    satisfaction_des_max VARCHAR(150),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX survey_sections_survey_id_idx ON survey_sections (survey_id);

CREATE TABLE survey_questions (
    id SERIAL PRIMARY KEY,
    section_id INTEGER NOT NULL REFERENCES survey_sections(id) ON DELETE CASCADE,
    question TEXT NOT NULL DEFAULT '',
    type_question VARCHAR(30) NOT NULL DEFAULT 'short_answer',
    no INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE survey_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
    option_name VARCHAR(255) NOT NULL DEFAULT '',
    no INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE survey_tokens (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    email VARCHAR(150) NOT NULL,
    token VARCHAR(120) NOT NULL UNIQUE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ
);

CREATE TABLE survey_answers (
    id SERIAL PRIMARY KEY,
    token_id INTEGER NOT NULL REFERENCES survey_tokens(id) ON DELETE CASCADE,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
    ans_text TEXT,
    ans_option_id INTEGER,
    ans_point INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX survey_answers_survey_id_idx ON survey_answers (survey_id);

CREATE TABLE ais_ships (
    id SERIAL PRIMARY KEY,
    mmsi VARCHAR(20) NOT NULL,
    call_sign VARCHAR(20) NOT NULL DEFAULT '',
    imo VARCHAR(20) NOT NULL DEFAULT '',
    name VARCHAR(200) NOT NULL DEFAULT '',
    sog VARCHAR(20) NOT NULL DEFAULT '0',
    heading VARCHAR(20) NOT NULL DEFAULT '0',
    lat VARCHAR(30) NOT NULL DEFAULT '',
    lon VARCHAR(30) NOT NULL DEFAULT '',
    status VARCHAR(10) NOT NULL DEFAULT '0',
    destination VARCHAR(100) NOT NULL DEFAULT '',
    eta VARCHAR(40) NOT NULL DEFAULT '',
    vessel_type VARCHAR(10) NOT NULL DEFAULT '0',
    length VARCHAR(10) NOT NULL DEFAULT '',
    width VARCHAR(10) NOT NULL DEFAULT '',
    draught VARCHAR(10) NOT NULL DEFAULT '',
    update_date VARCHAR(40) NOT NULL DEFAULT '',
    alias VARCHAR(50) NOT NULL DEFAULT '',
    cog VARCHAR(20) NOT NULL DEFAULT '',
    vessel_id INTEGER REFERENCES vessels(id) ON DELETE SET NULL
);

CREATE TABLE ais_activities (
    id SERIAL PRIMARY KEY,
    activity_date TIMESTAMPTZ NOT NULL,
    vessel_id INTEGER REFERENCES vessels(id) ON DELETE SET NULL,
    ais_ship_id INTEGER REFERENCES ais_ships(id) ON DELETE SET NULL,
    mmsi VARCHAR(20) NOT NULL DEFAULT '',
    location VARCHAR(150) NOT NULL DEFAULT '',
    latitude VARCHAR(30) NOT NULL DEFAULT '',
    longitude VARCHAR(30) NOT NULL DEFAULT ''
);

CREATE INDEX ais_activities_date_idx ON ais_activities (activity_date);

CREATE TABLE ais_logs (
    id SERIAL PRIMARY KEY,
    vessel_id INTEGER REFERENCES vessels(id) ON DELETE SET NULL,
    ais_ship_id INTEGER REFERENCES ais_ships(id) ON DELETE SET NULL,
    mmsi VARCHAR(20) NOT NULL DEFAULT '',
    call_sign VARCHAR(20) NOT NULL DEFAULT '',
    berth_id INTEGER REFERENCES berths(id) ON DELETE SET NULL,
    arrival_date_time TIMESTAMPTZ NOT NULL,
    departure_date_time TIMESTAMPTZ,
    latitude VARCHAR(30) NOT NULL DEFAULT '',
    longitude VARCHAR(30) NOT NULL DEFAULT ''
);

CREATE INDEX ais_logs_arrival_idx ON ais_logs (arrival_date_time);
