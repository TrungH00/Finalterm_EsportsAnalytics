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

DBCC CHECKIDENT ('Matches', RESEED, 0);
DBCC CHECKIDENT ('Rosters', RESEED, 0);
DBCC CHECKIDENT ('Players', RESEED, 0);
DBCC CHECKIDENT ('Teams',   RESEED, 0);
DBCC CHECKIDENT ('Seasons', RESEED, 0);

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
-- team_id: T1=1, C9=2, FNC=3, G2=4

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

-- ROSTERS — LCK Spring 2025 (season_id=1)
INSERT INTO Rosters (player_id, team_id, season_id, jersey_number) VALUES
(1, 1,1,1),(2, 1,1,2),(3, 1,1,3),(4, 1,1,4),(5, 1,1,5),   -- T1
(6, 2,1,1),(7, 2,1,2),(8, 2,1,3),(9, 2,1,4),(10,2,1,5),   -- C9
(11,3,1,1),(12,3,1,2),(13,3,1,3),(14,3,1,4),(15,3,1,5),   -- FNC
(16,4,1,1),(17,4,1,2),(18,4,1,3),(19,4,1,4),(20,4,1,5);   -- G2

-- ROSTERS — Worlds 2024 (season_id=2)
INSERT INTO Rosters (player_id, team_id, season_id, jersey_number) VALUES
(1, 1,2,1),(2, 1,2,2),(3, 1,2,3),(4, 1,2,4),(5, 1,2,5),
(6, 2,2,1),(7, 2,2,2),(8, 2,2,3),(9, 2,2,4),(10,2,2,5),
(11,3,2,1),(12,3,2,2),(13,3,2,3),(14,3,2,4),(15,3,2,5),
(16,4,2,1),(17,4,2,2),(18,4,2,3),(19,4,2,4),(20,4,2,5);

-- MATCHES — LCK Spring 2025 (season_id=1)
-- team_id: T1=1, C9=2, FNC=3, G2=4
INSERT INTO Matches (match_code,season_id,tournament_name,team_winner_id,team_loser_id,match_date,duration_minutes,mongo_match_id) VALUES
('M001',1,N'LCK Spring 2025',1,2,'2025-01-10',32,'M001'),
('M002',1,N'LCK Spring 2025',4,3,'2025-01-11',28,'M002'),
('M003',1,N'LCK Spring 2025',1,3,'2025-01-12',35,'M003'),
('M004',1,N'LCK Spring 2025',2,4,'2025-01-18',30,'M004'),
('M005',1,N'LCK Spring 2025',4,1,'2025-01-19',38,'M005'),
('M006',1,N'LCK Spring 2025',3,2,'2025-01-20',27,'M006'),
('M007',1,N'LCK Spring 2025',1,2,'2025-01-25',33,'M007'),
('M008',1,N'LCK Spring 2025',4,3,'2025-01-26',29,'M008'),
('M009',1,N'LCK Spring 2025',3,1,'2025-02-01',36,'M009'),
('M010',1,N'LCK Spring 2025',4,2,'2025-02-08',31,'M010'),
('M011',1,N'LCK Spring 2025',1,4,'2025-02-09',34,'M011'),
('M012',1,N'LCK Spring 2025',2,3,'2025-02-15',28,'M012');

-- MATCHES — Worlds 2024 (season_id=2)
INSERT INTO Matches (match_code,season_id,tournament_name,team_winner_id,team_loser_id,match_date,duration_minutes,mongo_match_id) VALUES
('M013',2,N'Worlds 2024',1,4,'2024-10-15',40,'M013'),
('M014',2,N'Worlds 2024',3,2,'2024-10-16',35,'M014'),
('M015',2,N'Worlds 2024',1,3,'2024-10-20',38,'M015'),
('M016',2,N'Worlds 2024',4,2,'2024-10-21',33,'M016'),
('M017',2,N'Worlds 2024',1,2,'2024-10-25',42,'M017'),
('M018',2,N'Worlds 2024',3,4,'2024-10-26',37,'M018'),
('M019',2,N'Worlds 2024',1,3,'2024-11-02',39,'M019'),
('M020',2,N'Worlds 2024',2,4,'2024-11-03',31,'M020');

-- VERIFY
SELECT 'Seasons' AS [Bảng], COUNT(*) AS [Số dòng] FROM Seasons
UNION ALL SELECT 'Teams',   COUNT(*) FROM Teams
UNION ALL SELECT 'Players', COUNT(*) FROM Players
UNION ALL SELECT 'Rosters', COUNT(*) FROM Rosters
UNION ALL SELECT 'Matches', COUNT(*) FROM Matches;

PRINT N'LOL seed data insert thành công!';