-- Test Data for AI Headhunter
-- Run this AFTER creating a user account via auth

-- Insert sample hunt
INSERT INTO hunts (user_id, name, description, status, num_queries, results_per_query, max_results)
VALUES (
  auth.uid(),
  'Chargés d''affaires Île-de-France',
  'Je cherche des conseillers clientèle professionnels, chargés d''affaires pro dans les Yvelines ou Île-de-France. Ayant travaillé chez LCL, BNP Paribas, Société Générale. Avec expérience PME/TPE, au moins 5 ans.',
  'active',
  10,
  100,
  500
)
RETURNING id;

-- Note: Copy the returned hunt ID and use it below

-- Insert sample queries (replace YOUR_HUNT_ID with the ID from above)
INSERT INTO queries (hunt_id, xray_query, job_title, company, location, priority, status)
VALUES
  (
    'YOUR_HUNT_ID',
    'site:linkedin.com/in "Chargé d''affaires professionnels" "BNP Paribas" "Île-de-France"',
    'Chargé d''affaires professionnels',
    'BNP Paribas',
    'Île-de-France',
    1,
    'pending'
  ),
  (
    'YOUR_HUNT_ID',
    'site:linkedin.com/in "Conseiller clientèle professionnels" "LCL" "Yvelines"',
    'Conseiller clientèle professionnels',
    'LCL',
    'Yvelines',
    1,
    'pending'
  ),
  (
    'YOUR_HUNT_ID',
    'site:linkedin.com/in "Chargé d''affaires PME" "Société Générale" "Paris"',
    'Chargé d''affaires PME',
    'Société Générale',
    'Paris',
    2,
    'completed'
  );

-- Insert sample profiles (replace YOUR_HUNT_ID and YOUR_QUERY_ID)
INSERT INTO profiles (hunt_id, query_id, linkedin_url, name, headline, rank, status)
VALUES
  (
    'YOUR_HUNT_ID',
    'YOUR_QUERY_ID',
    'https://linkedin.com/in/jean-dupont',
    'Jean Dupont',
    'Chargé d''affaires professionnels chez BNP Paribas',
    1,
    'new'
  ),
  (
    'YOUR_HUNT_ID',
    'YOUR_QUERY_ID',
    'https://linkedin.com/in/marie-martin',
    'Marie Martin',
    'Conseiller clientèle entreprises chez LCL',
    2,
    'contacted'
  );

-- View results
SELECT * FROM hunts;
SELECT * FROM queries WHERE hunt_id = 'YOUR_HUNT_ID';
SELECT * FROM profiles WHERE hunt_id = 'YOUR_HUNT_ID';

-- View hunt stats
SELECT * FROM hunt_stats WHERE id = 'YOUR_HUNT_ID';
