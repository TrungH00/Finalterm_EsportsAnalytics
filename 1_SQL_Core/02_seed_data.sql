-- ============================================================
-- FILE: 02_seed_data.sql — League of Legends Edition
-- ============================================================
USE esports_db;
GO
DELETE FROM Matches;
DELETE FROM Rosters;
DELETE FROM Players;
DELETE FROM Teams;
DELETE FROM Seasons;

-- SEASONS
INSERT INTO Seasons (season_name, start_date, end_date, is_active) VALUES
(N'LCK Spring 2025', '2025-01-01', '2025-03-31', 1),
(N'Worlds 2024',     '2024-10-01', '2024-11-30', 0);

-- TEAMS
INSERT INTO Teams (team_code, team_name, region, founded_year) VALUES
('T1',  N'T1',         N'Korea',          2013),
('C9',  N'Cloud9',     N'North America',  2012),
('FNC', N'Fnatic',     N'Europe',         2004),
('G2',  N'G2 Esports', N'Europe',         2014);

-- PLAYERS — T1
INSERT INTO Players (player_code, nickname, real_name, role, nationality) VALUES
('T101', N'Zeus',       N'Choi Woo-je',     N'Top',     N'Korea'),
('T102', N'Oner',       N'Moon Hyeon-joon', N'Jungle',  N'Korea'),
('T103', N'Faker',      N'Lee Sang-hyeok',  N'Mid',     N'Korea'),
('T104', N'Gumayusi',   N'Lee Min-hyeong',  N'ADC',     N'Korea'),
('T105', N'Keria',      N'Ryu Min-seok',    N'Support', N'Korea');

-- PLAYERS — Cloud9
INSERT INTO Players (player_code, nickname, real_name, role, nationality) VALUES
('C901', N'Fudge',      N'Ibrahim Allami',  N'Top',     N'Australia'),
('C902', N'Blaber',     N'Robert Huang',    N'Jungle',  N'USA'),
('C903', N'EMENES',     N'Eain Sturt',      N'Mid',     N'UK'),
('C904', N'Berserker',  N'Kim Min-cheol',   N'ADC',     N'Korea'),
('C905', N'Vulcan',     N'Philippe Laflamme',N'Support',N'Canada');

-- PLAYERS — Fnatic
INSERT INTO Players (player_code, nickname, real_name, role, nationality) VALUES
('F101', N'Wunder',     N'Martin Hansen',   N'Top',     N'Denmark'),
('F102', N'Razork',     N'Iván Martín',     N'Jungle',  N'Spain'),
('F103', N'Humanoid',   N'Marek Brazda',    N'Mid',     N'Czech'),
('F104', N'Rekkles',    N'Martin Larsson',  N'ADC',     N'Sweden'),
('F105', N'Hylissang',  N'Zdravets Galabov',N'Support', N'Bulgaria');

-- PLAYERS — G2
INSERT INTO Players (player_code, nickname, real_name, role, nationality) VALUES
('G201', N'BrokenBlade',N'Sergen Çelik',   N'Top',     N'Germany'),
('G202', N'Yike',       N'Miguel Esparza', N'Jungle',  N'France'),
('G203', N'Caps',       N'Rasmus Borregaard',N'Mid',   N'Denmark'),
('G204', N'Hans Sama',  N'Steven Liv',     N'ADC',     N'France'),
('G205', N'Mikyx',      N'Mihael Mehle',   N'Support', N'Slovenia');

DECLARE @SeasonMap TABLE (season_name NVARCHAR(100) PRIMARY KEY, season_id INT NOT NULL);
DECLARE @TeamMap   TABLE (team_code   VARCHAR(10)    PRIMARY KEY, team_id   INT NOT NULL);
DECLARE @PlayerMap TABLE (player_code VARCHAR(10)    PRIMARY KEY, player_id INT NOT NULL);

INSERT INTO @SeasonMap (season_name, season_id)
SELECT season_name, season_id FROM Seasons;

INSERT INTO @TeamMap (team_code, team_id)
SELECT team_code, team_id FROM Teams;

INSERT INTO @PlayerMap (player_code, player_id)
SELECT player_code, player_id FROM Players;

-- ROSTERS — LCK Spring 2025 (season_id=1)
INSERT INTO Rosters (player_id, team_id, season_id, jersey_number)
SELECT p.player_id, t.team_id, s.season_id, v.jersey_number
FROM (VALUES
	('T101', 'T1',  N'LCK Spring 2025', 1),
	('T102', 'T1',  N'LCK Spring 2025', 2),
	('T103', 'T1',  N'LCK Spring 2025', 3),
	('T104', 'T1',  N'LCK Spring 2025', 4),
	('T105', 'T1',  N'LCK Spring 2025', 5),
	('C901', 'C9',  N'LCK Spring 2025', 1),
	('C902', 'C9',  N'LCK Spring 2025', 2),
	('C903', 'C9',  N'LCK Spring 2025', 3),
	('C904', 'C9',  N'LCK Spring 2025', 4),
	('C905', 'C9',  N'LCK Spring 2025', 5),
	('F101', 'FNC', N'LCK Spring 2025', 1),
	('F102', 'FNC', N'LCK Spring 2025', 2),
	('F103', 'FNC', N'LCK Spring 2025', 3),
	('F104', 'FNC', N'LCK Spring 2025', 4),
	('F105', 'FNC', N'LCK Spring 2025', 5),
	('G201', 'G2',  N'LCK Spring 2025', 1),
	('G202', 'G2',  N'LCK Spring 2025', 2),
	('G203', 'G2',  N'LCK Spring 2025', 3),
	('G204', 'G2',  N'LCK Spring 2025', 4),
	('G205', 'G2',  N'LCK Spring 2025', 5)
) v(player_code, team_code, season_name, jersey_number)
JOIN @PlayerMap p ON p.player_code = v.player_code
JOIN @TeamMap   t ON t.team_code   = v.team_code
JOIN @SeasonMap s ON s.season_name = v.season_name;

-- ROSTERS — Worlds 2024 (season_id=2)
INSERT INTO Rosters (player_id, team_id, season_id, jersey_number)
SELECT p.player_id, t.team_id, s.season_id, v.jersey_number
FROM (VALUES
	('T101', 'T1',  N'Worlds 2024', 1),
	('T102', 'T1',  N'Worlds 2024', 2),
	('T103', 'T1',  N'Worlds 2024', 3),
	('T104', 'T1',  N'Worlds 2024', 4),
	('T105', 'T1',  N'Worlds 2024', 5),
	('C901', 'C9',  N'Worlds 2024', 1),
	('C902', 'C9',  N'Worlds 2024', 2),
	('C903', 'C9',  N'Worlds 2024', 3),
	('C904', 'C9',  N'Worlds 2024', 4),
	('C905', 'C9',  N'Worlds 2024', 5),
	('F101', 'FNC', N'Worlds 2024', 1),
	('F102', 'FNC', N'Worlds 2024', 2),
	('F103', 'FNC', N'Worlds 2024', 3),
	('F104', 'FNC', N'Worlds 2024', 4),
	('F105', 'FNC', N'Worlds 2024', 5),
	('G201', 'G2',  N'Worlds 2024', 1),
	('G202', 'G2',  N'Worlds 2024', 2),
	('G203', 'G2',  N'Worlds 2024', 3),
	('G204', 'G2',  N'Worlds 2024', 4),
	('G205', 'G2',  N'Worlds 2024', 5)
) v(player_code, team_code, season_name, jersey_number)
JOIN @PlayerMap p ON p.player_code = v.player_code
JOIN @TeamMap   t ON t.team_code   = v.team_code
JOIN @SeasonMap s ON s.season_name = v.season_name;

-- MATCHES — LCK Spring 2025 (season_id=1)
INSERT INTO Matches (match_code,season_id,tournament_name,team_winner_id,team_loser_id,match_date,duration_minutes,mongo_match_id)
SELECT v.match_code, s.season_id, v.tournament_name, w.team_id, l.team_id, v.match_date, v.duration_minutes, v.mongo_match_id
FROM (VALUES
	('M001', N'LCK Spring 2025', 'T1',  'C9',  '2025-01-10', 32, 'M001'),
	('M002', N'LCK Spring 2025', 'G2',  'FNC', '2025-01-11', 28, 'M002'),
	('M003', N'LCK Spring 2025', 'T1',  'FNC', '2025-01-12', 35, 'M003'),
	('M004', N'LCK Spring 2025', 'C9',  'G2',  '2025-01-18', 30, 'M004'),
	('M005', N'LCK Spring 2025', 'G2',  'T1',  '2025-01-19', 38, 'M005'),
	('M006', N'LCK Spring 2025', 'FNC', 'C9',  '2025-01-20', 27, 'M006'),
	('M007', N'LCK Spring 2025', 'T1',  'C9',  '2025-01-25', 33, 'M007'),
	('M008', N'LCK Spring 2025', 'G2',  'FNC', '2025-01-26', 29, 'M008'),
	('M009', N'LCK Spring 2025', 'FNC', 'T1',  '2025-02-01', 36, 'M009'),
	('M010', N'LCK Spring 2025', 'G2',  'C9',  '2025-02-08', 31, 'M010'),
	('M011', N'LCK Spring 2025', 'T1',  'G2',  '2025-02-09', 34, 'M011'),
	('M012', N'LCK Spring 2025', 'C9',  'FNC', '2025-02-15', 28, 'M012')
) v(match_code, tournament_name, winner_code, loser_code, match_date, duration_minutes, mongo_match_id)
JOIN @SeasonMap s ON s.season_name = v.tournament_name
JOIN @TeamMap w ON w.team_code = v.winner_code
JOIN @TeamMap l ON l.team_code = v.loser_code;

-- MATCHES — Worlds 2024 (season_id=2)
INSERT INTO Matches (match_code,season_id,tournament_name,team_winner_id,team_loser_id,match_date,duration_minutes,mongo_match_id)
SELECT v.match_code, s.season_id, v.tournament_name, w.team_id, l.team_id, v.match_date, v.duration_minutes, v.mongo_match_id
FROM (VALUES
	('M013', N'Worlds 2024', 'T1',  'G2',  '2024-10-15', 40, 'M013'),
	('M014', N'Worlds 2024', 'FNC', 'C9',  '2024-10-16', 35, 'M014'),
	('M015', N'Worlds 2024', 'T1',  'FNC', '2024-10-20', 38, 'M015'),
	('M016', N'Worlds 2024', 'G2',  'C9',  '2024-10-21', 33, 'M016'),
	('M017', N'Worlds 2024', 'T1',  'C9',  '2024-10-25', 42, 'M017'),
	('M018', N'Worlds 2024', 'FNC', 'G2',  '2024-10-26', 37, 'M018'),
	('M019', N'Worlds 2024', 'T1',  'FNC', '2024-11-02', 39, 'M019'),
	('M020', N'Worlds 2024', 'C9',  'G2',  '2024-11-03', 31, 'M020')
) v(match_code, tournament_name, winner_code, loser_code, match_date, duration_minutes, mongo_match_id)
JOIN @SeasonMap s ON s.season_name = v.tournament_name
JOIN @TeamMap w ON w.team_code = v.winner_code
JOIN @TeamMap l ON l.team_code = v.loser_code;

-- VERIFY
SELECT 'Seasons' AS [Bảng], COUNT(*) AS [Số dòng] FROM Seasons
UNION ALL SELECT 'Teams',   COUNT(*) FROM Teams
UNION ALL SELECT 'Players', COUNT(*) FROM Players
UNION ALL SELECT 'Rosters', COUNT(*) FROM Rosters
UNION ALL SELECT 'Matches', COUNT(*) FROM Matches;

PRINT N'LOL seed data insert successful!';