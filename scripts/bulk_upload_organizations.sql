-- ============================================================
-- Bulk Upload: organizations
-- ============================================================
-- Run this in Supabase SQL Editor.
-- 64 organizations from organizations.csv
-- Uses ON CONFLICT to make it safe to re-run.
-- ============================================================

INSERT INTO organizations (name, slug)
VALUES
  ('4AM Skin', '4am-skin'),
  ('Acme', 'acme'),
  ('ALT', 'alt'),
  ('Alum Holdings', 'alum-holdings'),
  ('Amplify', 'amplify'),
  ('Arc Beverly Hills', 'arc-beverly-hills'),
  ('Aspects Big Sky', 'aspects-big-sky'),
  ('Avenir Hospitality', 'avenir-hospitality'),
  ('Ballers', 'ballers'),
  ('Blue Flag Capital', 'blue-flag-capital'),
  ('Bourbon Rock Estates', 'bourbon-rock-estates'),
  ('Builders Workshop', 'builders-workshop'),
  ('Callicoon Hills', 'callicoon-hills'),
  ('Cardinal Lands', 'cardinal-lands'),
  ('Collared Martin', 'collared-martin'),
  ('Court Club', 'court-club'),
  ('Danielle Guizio', 'danielle-guizio'),
  ('De La Tierra Holdings', 'de-la-tierra-holdings'),
  ('Derive Ventures', 'derive-ventures'),
  ('Double Check', 'double-check'),
  ('Dwell Vacations', 'dwell-vacations'),
  ('DYP', 'dyp'),
  ('EF Holdings', 'ef-holdings'),
  ('ERG Enterprises', 'erg-enterprises'),
  ('First Coast', 'first-coast'),
  ('Flannery Companies', 'flannery-companies'),
  ('Gallatin', 'gallatin'),
  ('GH Platform I', 'gh-platform-i'),
  ('Ghost Factory', 'ghost-factory'),
  ('Gravity Haus', 'gravity-haus'),
  ('Groveland Resort', 'groveland-resort'),
  ('Hallson', 'hallson'),
  ('HayMax', 'haymax'),
  ('Hidden Rock Development', 'hidden-rock-development'),
  ('Hilo Development', 'hilo-development'),
  ('IronHorse Storage Group', 'ironhorse-storage-group'),
  ('JBA Group', 'jba-group'),
  ('Kaizen', 'kaizen'),
  ('Kalonymus', 'kalonymus'),
  ('Ketchy Shuby', 'ketchy-shuby'),
  ('Life House', 'life-house'),
  ('Lions Foundation', 'lions-foundation'),
  ('Ludlow Property Group', 'ludlow-property-group'),
  ('Meadow Homes', 'meadow-homes'),
  ('Moccasin Flats Residencies', 'moccasin-flats-residencies'),
  ('MOLLIE Aspen', 'mollie-aspen'),
  ('Nauset Rentals', 'nauset-rentals'),
  ('Open Door', 'open-door'),
  ('Outline Real Estate', 'outline-real-estate'),
  ('Padel United Sports Club', 'padel-united-sports-club'),
  ('PlantSwitch', 'plantswitch'),
  ('Rent Responsibly', 'rent-responsibly'),
  ('Rescue Cesspool', 'rescue-cesspool'),
  ('Rowing Blazers', 'rowing-blazers'),
  ('ROY', 'roy'),
  ('SAGELANE', 'sagelane'),
  ('Settlers Hospitality', 'settlers-hospitality'),
  ('Solid & Striped', 'solid-and-striped'),
  ('Spring House', 'spring-house'),
  ('Suite Spot', 'suite-spot'),
  ('Tahoe Rental', 'tahoe-rental'),
  ('Trivest', 'trivest'),
  ('Vador Build Partners', 'vador-build-partners'),
  ('Wandering Que', 'wandering-que')
ON CONFLICT (slug) DO NOTHING;

-- Verify results
SELECT id, name, slug, created_at
FROM organizations
ORDER BY name;
