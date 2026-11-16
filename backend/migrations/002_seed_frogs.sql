-- The initial crop, in en.json order. Runs once per database, so frogs added or removed later
-- (by hand or by the admin page) are never overwritten. seedFrogs.test.ts checks this list
-- against frontend/src/i18n/en.json.
INSERT INTO frogs (id, position) VALUES
    ('entry01', 1), ('entry02', 2), ('entry03', 3), ('entry04', 4), ('entry05', 5),
    ('entry06', 6), ('entry07', 7), ('entry08', 8), ('entry09', 9), ('entry10', 10),
    ('entry11', 11), ('entry12', 12), ('entry13', 13), ('entry14', 14), ('entry15', 15),
    ('entry16', 16), ('entry17', 17), ('entry18', 18), ('entry19', 19), ('entry20', 20);
