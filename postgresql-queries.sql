CREATE TABLE user_cred(
	id SERIAL PRIMARY KEY,
	user_username TEXT,
	user_email TEXT,
	user_pass TEXT,
	fname TEXT,
	lname TEXT,
	admin BOOLEAN
);

CREATE TABLE user_entry(
	id SERIAL PRIMARY KEY,
	entry_id INTEGER REFERENCES user_cred(id),
	entry_date DATE,
	entry_merchant TEXT,
	entry_amount FLOAT
);

INSERT INTO user_cred (user_username, user_pass, fname, lname, admin)
VALUES ('103293113985660038566', 'google', 'Kier Anthony', 'Dalit', true);
INSERT INTO user_cred (user_username, user_pass, fname, lname, admin)
VALUES ('122129958758134137', 'facebook', 'Gen', 'Tao', true);
INSERT INTO user_cred (user_email, user_pass, fname, lname, admin)
VALUES ('admin@admin.com', '$2b$10$BWfRiDZ5zkyfzeiKy1rJauPUjVytHRztPgg1..q7s7vHARyx2f/wS', 'Kier Anthony', 'Dalit', true);


