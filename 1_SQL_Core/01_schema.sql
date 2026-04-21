-- ============================================================
-- FILE: 01_schema.sql
-- MÔ TẢ: Tạo toàn bộ cấu trúc bảng cho Esports Analytics
--        Game: League of Legends
--        Engine: MS SQL Server (T-SQL)
--
-- THỨ TỰ CHẠY: File này phải chạy TRƯỚC tất cả file khác
--
-- CÁC BẢNG:
--   1. Seasons    — Mùa giải (LCK Spring 2025, Worlds 2024)
--   2. Teams      — Đội thi đấu (T1, Cloud9, Fnatic, G2)
--   3. Players    — Game thủ (Faker, Caps, Rekkles...)
--   4. Rosters    — Đăng ký thi đấu
--   5. Matches    — Kết quả trận đấu
-- ============================================================
USE esports_db;
GO
IF OBJECT_ID('dbo.Matches',  'U') IS NOT NULL DROP TABLE dbo.Matches;
IF OBJECT_ID('dbo.Rosters',  'U') IS NOT NULL DROP TABLE dbo.Rosters;
IF OBJECT_ID('dbo.Players',  'U') IS NOT NULL DROP TABLE dbo.Players;
IF OBJECT_ID('dbo.Teams',    'U') IS NOT NULL DROP TABLE dbo.Teams;
IF OBJECT_ID('dbo.Seasons',  'U') IS NOT NULL DROP TABLE dbo.Seasons;

CREATE TABLE Seasons (
    season_id    INT           PRIMARY KEY IDENTITY(1,1),
    season_name  NVARCHAR(100) NOT NULL,
    start_date   DATE          NOT NULL,
    end_date     DATE          NOT NULL,
    is_active    BIT           DEFAULT 1,
    CONSTRAINT CK_Season_Date CHECK (end_date > start_date)
);

CREATE TABLE Teams (
    team_id      INT           PRIMARY KEY IDENTITY(1,1),
    team_code    VARCHAR(10)   NOT NULL UNIQUE,
    team_name    NVARCHAR(100) NOT NULL,
    region       NVARCHAR(50)  DEFAULT N'International',
    founded_year INT,
    is_active    BIT           DEFAULT 1
);

CREATE TABLE Players (
    player_id     INT           PRIMARY KEY IDENTITY(1,1),
    player_code   VARCHAR(10)   NOT NULL UNIQUE,
    nickname      NVARCHAR(100) NOT NULL,
    real_name     NVARCHAR(100),
    role          NVARCHAR(50),
    nationality   NVARCHAR(50)  DEFAULT N'International',
    date_of_birth DATE,
    is_active     BIT           DEFAULT 1
);

CREATE TABLE Rosters (
    roster_id     INT  PRIMARY KEY IDENTITY(1,1),
    player_id     INT  NOT NULL,
    team_id       INT  NOT NULL,
    season_id     INT  NOT NULL,
    jersey_number INT,
    join_date     DATE DEFAULT GETDATE(),
    is_starter    BIT  DEFAULT 1,
    CONSTRAINT FK_Roster_Player FOREIGN KEY (player_id) REFERENCES Players(player_id),
    CONSTRAINT FK_Roster_Team   FOREIGN KEY (team_id)   REFERENCES Teams(team_id),
    CONSTRAINT FK_Roster_Season FOREIGN KEY (season_id) REFERENCES Seasons(season_id),
    CONSTRAINT UQ_Roster_Player_Season UNIQUE (player_id, season_id)
);

CREATE TABLE Matches (
    match_id         INT           PRIMARY KEY IDENTITY(1,1),
    match_code       VARCHAR(10)   NOT NULL UNIQUE,
    season_id        INT           NOT NULL,
    tournament_name  NVARCHAR(100) NOT NULL,
    team_winner_id   INT           NOT NULL,
    team_loser_id    INT           NOT NULL,
    match_date       DATE          NOT NULL,
    duration_minutes INT,
    mongo_match_id   VARCHAR(10),
    CONSTRAINT FK_Match_Season FOREIGN KEY (season_id)      REFERENCES Seasons(season_id),
    CONSTRAINT FK_Match_Winner FOREIGN KEY (team_winner_id) REFERENCES Teams(team_id),
    CONSTRAINT FK_Match_Loser  FOREIGN KEY (team_loser_id)  REFERENCES Teams(team_id),
    CONSTRAINT CK_Match_Teams  CHECK (team_winner_id <> team_loser_id)
);

CREATE INDEX IX_Roster_Player_Season ON Rosters(player_id, season_id);
CREATE INDEX IX_Match_Winner ON Matches(team_winner_id);
CREATE INDEX IX_Match_Loser  ON Matches(team_loser_id);
CREATE INDEX IX_Match_Season ON Matches(season_id);

SELECT TABLE_NAME AS [Tên bảng], TABLE_TYPE AS [Loại]
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'dbo'
ORDER BY TABLE_NAME;

PRINT 'Schema tạo thành công!';