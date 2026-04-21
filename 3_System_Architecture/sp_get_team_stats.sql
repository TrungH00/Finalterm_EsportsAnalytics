-- ============================================================
-- FILE: sp_get_team_stats.sql
-- MÔ TẢ: Stored Procedure tổng hợp thống kê team
--        Trả về win/loss/win rate theo season
--        Engine: MS SQL Server (T-SQL)
--
-- THỨ TỰ CHẠY: Phải chạy SAU 01_schema.sql và 02_seed_data.sql
-- ============================================================

IF OBJECT_ID('dbo.sp_get_team_stats', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_get_team_stats;
GO

CREATE PROCEDURE dbo.sp_get_team_stats
    -- Lọc theo team cụ thể (NULL = lấy tất cả team)
    @team_id    INT  = NULL,
    -- Lọc theo season cụ thể (NULL = lấy tất cả season)
    @season_id  INT  = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        t.team_name                             AS [Team],
        s.season_name                           AS [Season],

        -- Tổng trận thắng
        COUNT(CASE WHEN m.team_winner_id = t.team_id THEN 1 END)
                                                AS [Thắng],

        -- Tổng trận thua
        COUNT(CASE WHEN m.team_loser_id = t.team_id THEN 1 END)
                                                AS [Thua],

        -- Tổng trận
        COUNT(m.match_id)                       AS [Tổng trận],

        -- Win rate %
        ROUND(
            CAST(COUNT(CASE WHEN m.team_winner_id = t.team_id THEN 1 END) AS FLOAT)
            / NULLIF(COUNT(m.match_id), 0) * 100
        , 1)                                    AS [Win Rate %],

        -- Thời gian thi đấu trung bình
        AVG(m.duration_minutes)                 AS [Avg Duration (min)],

        -- Xếp hạng trong season dùng DENSE_RANK
        DENSE_RANK() OVER (
            PARTITION BY s.season_id
            ORDER BY
                COUNT(CASE WHEN m.team_winner_id = t.team_id THEN 1 END) DESC
        )                                       AS [Hạng trong Season]

    FROM Teams   t
    JOIN Matches m  ON t.team_id   = m.team_winner_id
                    OR t.team_id   = m.team_loser_id
    JOIN Seasons s  ON m.season_id = s.season_id

    -- Filter động: nếu truyền @team_id thì lọc, không thì lấy hết
    WHERE (@team_id   IS NULL OR t.team_id   = @team_id)
      AND (@season_id IS NULL OR s.season_id = @season_id)

    GROUP BY
        t.team_id,
        t.team_name,
        s.season_id,
        s.season_name

    ORDER BY
        s.season_name,
        [Thắng] DESC;
END;
GO

-- ============================================================
-- TEST CASES
-- ============================================================

PRINT N'============================================================';
PRINT N'TEST 1: Tất cả team, tất cả season';
PRINT N'============================================================';
EXEC dbo.sp_get_team_stats;

PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 2: Chỉ Saigon Phantom (team_id=1)';
PRINT N'============================================================';
EXEC dbo.sp_get_team_stats @team_id = 1;

PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 3: Chỉ VPS Spring 2025 (season_id=1)';
PRINT N'============================================================';
EXEC dbo.sp_get_team_stats @season_id = 1;

PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 4: Team Flash trong AIC 2024';
PRINT N'============================================================';
EXEC dbo.sp_get_team_stats @team_id = 2, @season_id = 2;
GO
