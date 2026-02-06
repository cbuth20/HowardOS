-- Check all organizations in the database
SELECT id, name, slug, created_at 
FROM organizations 
ORDER BY name;

-- Check count
SELECT COUNT(*) as total_orgs FROM organizations;
