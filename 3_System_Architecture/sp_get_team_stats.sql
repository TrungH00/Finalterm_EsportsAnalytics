-- ============================================================
-- FILE: sp_get_team_stats.sql
-- DESC: Stored Procedure to aggregate team statistics
--       Returns win/loss/win rate by season
--       Engine: MS SQL Server (T-SQL)
--
-- RUN ORDER: Must run AFTER 01_schema.sql and 02_seed_data.sql
-- ============================================================

IF OBJECT_ID('dbo.sp_get_team_stats', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_get_team_stats;
GO

CREATE PROCEDURE dbo.sp_get_team_stats
    -- Filter by specific team (NULL = all teams)
    @team_id    INT  = NULL,
    -- Filter by specific season (NULL = all seasons)
    @season_id  INT  = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        t.team_name                             AS [Team],
        s.season_name                           AS [Season],

        -- Total wins
        COUNT(CASE WHEN m.team_winner_id = t.team_id THEN 1 END)
                                                AS [Wins],

        -- Total losses
        COUNT(CASE WHEN m.team_loser_id = t.team_id THEN 1 END)
                                                AS [Losses],

        -- Total matches
        COUNT(m.match_id)                       AS [Total Matches],

        -- Win rate %
        ROUND(
            CAST(COUNT(CASE WHEN m.team_winner_id = t.team_id THEN 1 END) AS FLOAT)
            / NULLIF(COUNT(m.match_id), 0) * 100
        , 1)                                    AS [Win Rate %],

        -- Average match duration
        AVG(m.duration_minutes)                 AS [Avg Duration (min)],

        -- Rank within season using DENSE_RANK
        DENSE_RANK() OVER (
            PARTITION BY s.season_id
            ORDER BY
                COUNT(CASE WHEN m.team_winner_id = t.team_id THEN 1 END) DESC
        )                                       AS [Rank in Season]

    FROM Teams   t
    JOIN Matches m  ON t.team_id   = m.team_winner_id
                    OR t.team_id   = m.team_loser_id
    JOIN Seasons s  ON m.season_id = s.season_id

    -- Dynamic filter: if @team_id is passed, filter; otherwise return all
    WHERE (@team_id   IS NULL OR t.team_id   = @team_id)
      AND (@season_id IS NULL OR s.season_id = @season_id)

    GROUP BY
        t.team_id,
        t.team_name,
        s.season_id,
        s.season_name

    ORDER BY
        s.season_name,
        [Wins] DESC;
END;
GO

-- ============================================================
-- TEST CASES
-- ============================================================

PRINT N'============================================================';
PRINT N'TEST 1: All teams, all seasons';
PRINT N'============================================================';
EXEC dbo.sp_get_team_stats;

PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 2: T1 only (team_id=1)';
PRINT N'============================================================';
EXEC dbo.sp_get_team_stats @team_id = 1;

PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 3: LCK Spring 2025 only (season_id=1)';
PRINT N'============================================================';
EXEC dbo.sp_get_team_stats @season_id = 1;

PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 4: Cloud9 in Worlds 2024';
PRINT N'============================================================';
EXEC dbo.sp_get_team_stats @team_id = 2, @season_id = 2;
GO
