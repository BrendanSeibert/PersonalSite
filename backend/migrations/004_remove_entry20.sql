-- The real frog list has 19 entries, so entry20 (the last placeholder) goes. Its likes go with it
-- (favorites.entry_id is ON DELETE CASCADE). seedFrogs.test.ts checks that the seed plus the
-- migrations after it leave exactly the frogs in frontend/src/i18n/en.json.
DELETE FROM frogs WHERE id = 'entry20';
