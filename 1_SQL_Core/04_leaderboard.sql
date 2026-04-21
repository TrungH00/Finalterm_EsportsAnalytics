-- ============================================================
-- FILE: 04_leaderboard.sql
-- MÔ TẢ: Leaderboard xếp hạng player và team
--        Dùng Window Functions: DENSE_RANK, RANK, ROW_NUMBER
--        Engine: MS SQL Server (T-SQL)
--
-- THỨ TỰ CHẠY: Phải chạy SAU 01, 02, 03
--
-- NỘI DUNG:
--   Query 1 — Global player leaderboard theo win rate
--   Query 2 — Leaderboard theo từng season (PARTITION BY)
--   Query 3 — Team leaderboard theo tổng trận thắng
--   Query 4 — Demo sự khác nhau DENSE_RANK vs RANK vs ROW_NUMBER
--             (chuẩn bị cho oral defense)
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
    -- Bước 1: Tính tổng trận thắng và tổng trận của từng player
    SELECT
        p.player_id,
        p.nickname,
        p.role,
        t.team_name,

        -- Đếm tổng trận player tham gia (thắng + thua)
        COUNT(DISTINCT m.match_id) AS total_matches,

        -- Đếm trận thắng: player thuộc team thắng
        SUM(
            CASE WHEN r.team_id = m.team_winner_id THEN 1 ELSE 0 END
        ) AS total_wins,

        -- Đếm trận thua
        SUM(
            CASE WHEN r.team_id = m.team_loser_id THEN 1 ELSE 0 END
        ) AS total_losses

    FROM Players p
    JOIN Rosters r  ON p.player_id  = r.player_id
    JOIN Teams   t  ON r.team_id    = t.team_id
    JOIN Matches m  ON r.team_id    = m.team_winner_id
                    OR r.team_id    = m.team_loser_id
    -- Chỉ lấy trận trong season player đang đăng ký
    WHERE m.season_id = r.season_id
    GROUP BY p.player_id, p.nickname, p.role, t.team_name
),
PlayerWinRate AS (
    -- Bước 2: Tính win rate
    SELECT
        *,
        -- Win rate = wins / total matches, làm tròn 2 chữ số
        CAST(total_wins AS FLOAT) / NULLIF(total_matches, 0) AS win_rate
    FROM PlayerWinStats
)
-- Bước 3: Áp dụng DENSE_RANK theo win rate
SELECT
    -- DENSE_RANK: ties cùng rank, số tiếp theo KHÔNG bị bỏ
    -- Ví dụ: 1, 1, 2, 3 (không phải 1, 1, 3, 4)
    DENSE_RANK() OVER (ORDER BY win_rate DESC) AS [Hạng],

    nickname        AS [Nickname],
    team_name       AS [Team],
    role            AS [Role],
    total_matches   AS [Tổng trận],
    total_wins      AS [Thắng],
    total_losses    AS [Thua],
    ROUND(win_rate * 100, 1) AS [Win Rate %]

FROM PlayerWinRate
ORDER BY win_rate DESC, nickname;

-- ============================================================
-- QUERY 2: LEADERBOARD THEO TỪNG SEASON
-- Dùng PARTITION BY season_id → rank reset về 1 mỗi season
-- ============================================================
PRINT N'';
PRINT N'============================================================';
PRINT N'QUERY 2: Player Leaderboard Theo Season (PARTITION BY)';
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
    -- PARTITION BY season_name: rank reset về 1 cho mỗi season
    DENSE_RANK() OVER (
        PARTITION BY season_name    -- nhóm theo season
        ORDER BY win_rate DESC      -- sắp xếp trong từng nhóm
    ) AS [Hạng trong Season],

    season_name         AS [Season],
    nickname            AS [Player],
    team_name           AS [Team],
    total_matches       AS [Trận],
    wins                AS [Thắng],
    ROUND(win_rate * 100, 1) AS [Win Rate %]

FROM SeasonStats
ORDER BY season_name, win_rate DESC;

-- ============================================================
-- QUERY 3: TEAM LEADERBOARD
-- Xếp hạng team theo tổng trận thắng
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
    DENSE_RANK() OVER (ORDER BY total_wins DESC) AS [Hạng],
    team_name       AS [Team],
    total_wins      AS [Thắng],
    total_losses    AS [Thua],
    total_matches   AS [Tổng trận],
    ROUND(CAST(total_wins AS FLOAT) / NULLIF(total_matches, 0) * 100, 1) AS [Win Rate %]
FROM TeamStats
ORDER BY total_wins DESC;

-- ============================================================
-- QUERY 4: DEMO SO SÁNH DENSE_RANK vs RANK vs ROW_NUMBER
-- ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT ĐỂ DEFEND ORAL
--
-- Tạo scenario có 2 player cùng win rate để thấy rõ sự khác nhau
-- ============================================================
PRINT N'';
PRINT N'============================================================';
PRINT N'QUERY 4: So sánh DENSE_RANK vs RANK vs ROW_NUMBER';
PRINT N'(Chuẩn bị cho câu hỏi oral defense)';
PRINT N'============================================================';

WITH SampleData AS (
    -- Tạo data mẫu có ties (cùng win rate) để demo
    SELECT 'Naul'       AS nickname, 'SP' AS team, 0.80 AS win_rate UNION ALL
    SELECT 'Doinb',                  'TF',          0.75             UNION ALL
    SELECT 'Artifact',               'VG',          0.75             UNION ALL  -- tie với Doinb
    SELECT 'Palette',                'SP',          0.60             UNION ALL
    SELECT 'Lai Bâng',               'TF',          0.60             UNION ALL  -- tie với Palette
    SELECT 'KS',                     'VG',          0.50
)
SELECT
    nickname    AS [Player],
    team        AS [Team],
    win_rate    AS [Win Rate],

    -- DENSE_RANK: ties cùng rank, số tiếp KHÔNG bỏ
    -- Kết quả: 1, 2, 2, 3, 3, 4
    DENSE_RANK()  OVER (ORDER BY win_rate DESC) AS [DENSE_RANK],

    -- RANK: ties cùng rank, số tiếp BỊ BỎ
    -- Kết quả: 1, 2, 2, 4, 4, 6
    RANK()        OVER (ORDER BY win_rate DESC) AS [RANK],

    -- ROW_NUMBER: không có ties, mỗi dòng số KHÁC NHAU
    -- Kết quả: 1, 2, 3, 4, 5, 6 (thứ tự tie phụ thuộc vào DB)
    ROW_NUMBER()  OVER (ORDER BY win_rate DESC) AS [ROW_NUMBER]

FROM SampleData
ORDER BY win_rate DESC;

PRINT N'';
PRINT N'Giải thích kết quả:';
PRINT N'- DENSE_RANK: Doinb và Artifact cùng hạng 2, Palette là hạng 3';
PRINT N'- RANK:       Doinb và Artifact cùng hạng 2, Palette là hạng 4 (bỏ số 3)';
PRINT N'- ROW_NUMBER: Không có ties, mỗi người một số riêng';
PRINT N'';
PRINT N'→ Dùng DENSE_RANK cho leaderboard Esports vì:';
PRINT N'  2 player cùng stats phải được cùng hạng, hạng tiếp theo';
PRINT N'  không nên bị bỏ số (fan nhìn vào sẽ thấy tự nhiên hơn)';
GO