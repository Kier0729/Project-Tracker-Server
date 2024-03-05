CREATE TABLE user_cred(
	id SERIAL PRIMARY KEY,
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
	entry_amount DOUBLE
);

