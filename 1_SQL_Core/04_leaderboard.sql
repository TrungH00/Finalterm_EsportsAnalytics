-- ============================================================
-- QUERY 1: GLOBAL PLAYER LEADERBOARD
-- Rank all players by win rate (win percentage)
-- Uses DENSE_RANK -> ties receive same rank; ranks are not skipped
-- ============================================================
--
-- EXECUTION ORDER: Must run AFTER 01_schema.sql, 02_seed_data.sql, 03_trigger_roster.sql
--
-- CONTENT:
--   Query 1 — Global player leaderboard by win rate
--   Query 2 — Leaderboard partitioned by season (PARTITION BY)
--   Query 3 — Team leaderboard by total wins
--   Query 4 — Demo: difference between DENSE_RANK, RANK, and ROW_NUMBER
--             (for oral defense preparation)
-- ============================================================

-- ============================================================
-- QUERY 1: GLOBAL PLAYER LEADERBOARD
-- Xếp hạng tất cả player theo win rate (tỉ lệ trận thắng)
-- Dùng DENSE_RANK → ties được cùng rank, không bỏ số
-- ============================================================
USE esports_db;
GO
PRINT N'============================================================';
PRINT N'QUERY 1: Global Player Leaderboard (DENSE_RANK)';
PRINT N'============================================================';

WITH PlayerWinStats AS (
    -- Step 1: Calculate total wins and total matches per player
    SELECT
        p.player_id,
        p.nickname,
        p.role,
        t.team_name,

        -- Count total matches the player participated in (wins + losses)
        COUNT(DISTINCT m.match_id) AS total_matches,

        -- Count wins: player belongs to the winning team
        SUM(
            CASE WHEN r.team_id = m.team_winner_id THEN 1 ELSE 0 END
        ) AS total_wins,

        -- Count losses
        SUM(
            CASE WHEN r.team_id = m.team_loser_id THEN 1 ELSE 0 END
        ) AS total_losses

    FROM Players p
    JOIN Rosters r  ON p.player_id  = r.player_id
    JOIN Teams   t  ON r.team_id    = t.team_id
    JOIN Matches m  ON r.team_id    = m.team_winner_id
                    OR r.team_id    = m.team_loser_id
    -- Only include matches in the season the player is registered for
    WHERE m.season_id = r.season_id
    GROUP BY p.player_id, p.nickname, p.role, t.team_name
),
PlayerWinRate AS (
    -- Step 2: Calculate win rate
    SELECT
        *,
        -- Win rate = wins / total matches
        CAST(total_wins AS FLOAT) / NULLIF(total_matches, 0) AS win_rate
    FROM PlayerWinStats
)
-- Step 3: Apply DENSE_RANK by win rate
SELECT
    -- DENSE_RANK: ties receive same rank; subsequent ranks are not skipped
    -- Example: 1, 1, 2, 3 (not 1, 1, 3, 4)
    DENSE_RANK() OVER (ORDER BY win_rate DESC) AS [Rank],

    nickname        AS [Nickname],
    team_name       AS [Team],
    role            AS [Role],
    total_matches   AS [Total Matches],
    total_wins      AS [Wins],
    total_losses    AS [Losses],
    ROUND(win_rate * 100, 1) AS [Win Rate %]

FROM PlayerWinRate
ORDER BY win_rate DESC, nickname;

PRINT N'';
PRINT N'============================================================';
PRINT N'QUERY 2: Player Leaderboard By Season (PARTITION BY)';
PRINT N'============================================================';

WITH SeasonStats AS (
    SELECT
        p.nickname,
        t.team_name,
        s.season_name,
        COUNT(DISTINCT m.match_id) AS total_matches,
        SUM(CASE WHEN r.team_id = m.team_winner_id THEN 1 ELSE 0 END) AS wins,
        CAST(SUM(CASE WHEN r.team_id = m.team_winner_id THEN 1 ELSE 0 END) AS FLOAT)
            / NULLIF(COUNT(DISTINCT m.match_id), 0) AS win_rate
    FROM Players p
    JOIN Rosters r ON p.player_id = r.player_id
    JOIN Teams   t ON r.team_id   = t.team_id
    JOIN Seasons s ON r.season_id = s.season_id
    JOIN Matches m ON r.team_id   = m.team_winner_id
                   OR r.team_id   = m.team_loser_id
    WHERE m.season_id = r.season_id
    GROUP BY p.nickname, t.team_name, s.season_name, s.season_id
)
SELECT
    -- PARTITION BY season_name: rank resets to 1 per season
    DENSE_RANK() OVER (
        PARTITION BY season_name
        ORDER BY win_rate DESC
    ) AS [Rank in Season],

    season_name         AS [Season],
    nickname            AS [Player],
    team_name           AS [Team],
    total_matches       AS [Matches],
    wins                AS [Wins],
    ROUND(win_rate * 100, 1) AS [Win Rate %]

FROM SeasonStats
ORDER BY season_name, win_rate DESC;

-- ============================================================
-- QUERY 3: TEAM LEADERBOARD
-- Rank teams by total wins
-- ============================================================
PRINT N'';
PRINT N'============================================================';
PRINT N'QUERY 3: Team Leaderboard';
PRINT N'============================================================';

WITH TeamStats AS (
    SELECT
        t.team_name,
        COUNT(CASE WHEN m.team_winner_id = t.team_id THEN 1 END) AS total_wins,
        COUNT(CASE WHEN m.team_loser_id  = t.team_id THEN 1 END) AS total_losses,
        COUNT(m.match_id) AS total_matches
    FROM Teams t
    LEFT JOIN Matches m ON t.team_id = m.team_winner_id
                        OR t.team_id = m.team_loser_id
    GROUP BY t.team_id, t.team_name
)
SELECT
    DENSE_RANK() OVER (ORDER BY total_wins DESC) AS [Rank],
    team_name       AS [Team],
    total_wins      AS [Wins],
    total_losses    AS [Losses],
    total_matches   AS [Total Matches],
    ROUND(CAST(total_wins AS FLOAT) / NULLIF(total_matches, 0) * 100, 1) AS [Win Rate %]
FROM TeamStats
ORDER BY total_wins DESC;

-- ============================================================
-- QUERY 4: DEMO COMPARISON DENSE_RANK vs RANK vs ROW_NUMBER
-- This section demonstrates differences (useful for oral defense)
--
-- Create a scenario with players sharing win rates to illustrate differences
-- ============================================================
PRINT N'';
PRINT N'============================================================';
PRINT N'QUERY 4: Compare DENSE_RANK vs RANK vs ROW_NUMBER';
PRINT N'(Prepared for oral defense)';
PRINT N'============================================================';

WITH SampleData AS (
    -- Create sample data with ties (same win rate) for demo
    SELECT 'Naul'       AS nickname, 'SP' AS team, 0.80 AS win_rate UNION ALL
    SELECT 'Doinb',                  'TF',          0.75             UNION ALL
    SELECT 'Artifact',               'VG',          0.75             UNION ALL  -- tie with Doinb
    SELECT 'Palette',                'SP',          0.60             UNION ALL
    SELECT 'Lai Bâng',               'TF',          0.60             UNION ALL  -- tie with Palette
    SELECT 'KS',                     'VG',          0.50
)
SELECT
    nickname    AS [Player],
    team        AS [Team],
    win_rate    AS [Win Rate],

    -- DENSE_RANK: ties receive same rank; subsequent ranks are not skipped
    -- Example result: 1, 2, 2, 3, 3, 4
    DENSE_RANK()  OVER (ORDER BY win_rate DESC) AS [DENSE_RANK],

    -- RANK: ties receive same rank; subsequent ranks are skipped
    -- Example result: 1, 2, 2, 4, 4, 6
    RANK()        OVER (ORDER BY win_rate DESC) AS [RANK],

    -- ROW_NUMBER: no ties; each row gets a unique number
    -- Example result: 1, 2, 3, 4, 5, 6 (tie order depends on DB)
    ROW_NUMBER()  OVER (ORDER BY win_rate DESC) AS [ROW_NUMBER]

FROM SampleData
ORDER BY win_rate DESC;

PRINT N'';
PRINT N'Explanation of results:';
PRINT N'- DENSE_RANK: Doinb and Artifact share rank 2, Palette is rank 3';
PRINT N'- RANK:       Doinb and Artifact share rank 2, Palette is rank 4 (skips rank 3)';
PRINT N'- ROW_NUMBER: No ties; each player gets a unique number';
PRINT N'';
PRINT N'→ Use DENSE_RANK for Esports leaderboards because:';
PRINT N'  Players with identical stats should share the same rank, and the next rank';
PRINT N'  should not be skipped (fans view is more natural)';
GO