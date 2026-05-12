-- ============================================================
-- FILE: 03_trigger_roster.sql
-- Description: Trigger to validate roster constraints
--        1 player CANNOT be registered to 2 teams in same season
--        Engine: MS SQL Server (T-SQL)
--
-- EXECUTION ORDER: Must run AFTER 01_schema.sql and 02_seed_data.sql
--
-- WHY USE TRIGGER instead of just UNIQUE constraint:
--   - UNIQUE constraint only catches error AFTER insert
--   - Trigger allows complex logic validation BEFORE insert
--   - Trigger can return clear error messages
--   - Trigger cannot be bypassed from application code
--
-- TRIGGER TYPE: INSTEAD OF INSERT
--   -> Fires BEFORE actual INSERT happens
--   -> If violated: rollback + raise error
--   -> If valid: perform INSERT
-- ============================================================

-- Xóa trigger cũ nếu tồn tại
USE esports_db;
GO
IF OBJECT_ID('dbo.TR_Roster_PreventDuplicate', 'TR') IS NOT NULL
    DROP TRIGGER dbo.TR_Roster_PreventDuplicate;
GO

CREATE TRIGGER dbo.TR_Roster_PreventDuplicate
ON dbo.Rosters
INSTEAD OF INSERT
AS
BEGIN
    -- Disable "X rows affected" message for cleaner output
    SET NOCOUNT ON;

    -- --------------------------------------------------------
    -- STEP 1: Check if player already registered to a team
    --         in this season
    --
    -- Logic: JOIN inserted table (data being inserted)
    --        with existing Rosters table
    --        If match found -> constraint violation
    -- --------------------------------------------------------
    IF EXISTS (
        SELECT 1
        FROM inserted i                          -- data being inserted
        JOIN dbo.Rosters r                       -- existing data in DB
            ON i.player_id = r.player_id         -- same player
            AND i.season_id = r.season_id        -- same season
        -- DO NOT check team_id because different team is also not allowed
    )
    BEGIN
        -- --------------------------------------------------------
        -- VIOLATION: Player already belongs to different team in this season
        -- Get info for clear error message
        -- --------------------------------------------------------
        DECLARE @playerNick  NVARCHAR(100);
        DECLARE @seasonName  NVARCHAR(100);
        DECLARE @existTeam   NVARCHAR(100);
        DECLARE @newTeam     NVARCHAR(100);

        SELECT TOP 1
            @playerNick = p.nickname,
            @seasonName = s.season_name,
            @existTeam  = t_exist.team_name,
            @newTeam    = t_new.team_name
        FROM inserted i
        JOIN dbo.Players p       ON i.player_id   = p.player_id
        JOIN dbo.Seasons s       ON i.season_id   = s.season_id
        JOIN dbo.Rosters r_exist ON i.player_id   = r_exist.player_id
                                AND i.season_id   = r_exist.season_id
        JOIN dbo.Teams t_exist   ON r_exist.team_id = t_exist.team_id
        JOIN dbo.Teams t_new     ON i.team_id       = t_new.team_id;

        -- Raise error — custom error code
        RAISERROR(
            N'[TRIGGER ERROR] Player "%s" is already registered for "%s" in season "%s". Cannot register for "%s".',
            16,   -- severity level (16 = user error)
            1,    -- state
            @playerNick,
            @existTeam,
            @seasonName,
            @newTeam
        );

        -- Stop here, DO NOT perform INSERT
        RETURN;
    END

    -- --------------------------------------------------------
    -- STEP 2: Valid -> Perform actual INSERT
    -- --------------------------------------------------------
    INSERT INTO dbo.Rosters (
        player_id,
        team_id,
        season_id,
        jersey_number,
        join_date,
        is_starter
    )
    SELECT
        player_id,
        team_id,
        season_id,
        jersey_number,
        ISNULL(join_date, GETDATE()),  -- if join_date not provided, use today
        ISNULL(is_starter, 1)          -- default is starter
    FROM inserted;

    PRINT N'Đăng ký roster thành công!';
END;
GO

-- ============================================================
-- TEST CASES - Run each block to verify trigger
-- ============================================================

PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 1: Insert hợp lệ — player mới chưa đăng ký season nào';
PRINT N'============================================================';

-- Add 1 new player for testing
INSERT INTO Players (player_code, nickname, role) VALUES
('TEST1', N'TestPlayer', N'ADC');

DECLARE @newPlayerId INT = SCOPE_IDENTITY();

-- Register new player to SP, season 1 -> should SUCCEED
INSERT INTO Rosters (player_id, team_id, season_id, jersey_number)
VALUES (@newPlayerId, 1, 1, 99);

PRINT N'→ Kết quả mong đợi: Thành công';

-- --------------------------------------------------------
PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 2: Insert VI PHẠM — cùng player, cùng season, team khác';
PRINT N'Đây là race condition mà trigger phải chặn được';
PRINT N'============================================================';

-- Try to register same player to TF (different team) in same season 1
-- -> Trigger must RAISE ERROR and NOT insert
BEGIN TRY
    INSERT INTO Rosters (player_id, team_id, season_id, jersey_number)
    VALUES (@newPlayerId, 2, 1, 88);  -- team_id=2 is Team Flash

    PRINT N'→ Kết quả: INSERT thành công (SAI — trigger không hoạt động!)';
END TRY
BEGIN CATCH
    PRINT N'→ Kết quả mong đợi: Trigger đã chặn thành công!';
    PRINT N'→ Lỗi: ' + ERROR_MESSAGE();
END CATCH;

-- --------------------------------------------------------
PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 3: Insert hợp lệ — cùng player nhưng season KHÁC';
PRINT N'Player được phép đổi team khi sang season mới';
PRINT N'============================================================';

-- Season 2 (AIC 2024) - player not yet registered to season 2
-- -> should SUCCEED even though registered SP in season 1
INSERT INTO Rosters (player_id, team_id, season_id, jersey_number)
VALUES (@newPlayerId, 2, 2, 77);  -- team TF, season 2

PRINT N'→ Kết quả mong đợi: Thành công (khác season = được phép)';

-- --------------------------------------------------------
PRINT N'';
PRINT N'============================================================';
PRINT N'VERIFY: Xem roster của TestPlayer sau 3 test';
PRINT N'Phải thấy đúng 2 dòng: SP/season1 và TF/season2';
PRINT N'============================================================';

SELECT
    p.nickname      AS [Player],
    t.team_name     AS [Team],
    s.season_name   AS [Season],
    r.jersey_number AS [Số áo]
FROM Rosters r
JOIN Players p ON r.player_id = p.player_id
JOIN Teams   t ON r.team_id   = t.team_id
JOIN Seasons s ON r.season_id = s.season_id
WHERE p.player_code = 'TEST1'
ORDER BY s.season_name;

-- Dọn dẹp test data
DELETE FROM Rosters WHERE player_id = @newPlayerId;
DELETE FROM Players WHERE player_code = 'TEST1';
PRINT N'';
PRINT N'Test data đã được dọn dẹp.';
GO

-- ============================================================
-- RACE CONDITION DEMO
-- Explanation for defense:
--
-- WITHOUT Trigger, race condition occurs:
--   T1: Team Flash  checks -> Naul not in season 1 ✓
--   T2: Saigon Phantom checks -> Naul not in season 1 ✓
--   T1: INSERT Naul to Team Flash  <- succeeds
--   T2: INSERT Naul to Saigon Phantom <- also succeeds!
--   -> Naul now belongs to 2 teams - DATA CORRUPTION
--
-- WITH Trigger INSTEAD OF INSERT:
--   -> Each INSERT checked WITHIN SAME TRANSACTION
--   -> Later transaction blocked by row-level lock
--   -> Trigger ensures only 1 of 2 INSERTs succeeds
-- ============================================================
PRINT N'';
PRINT N'Trigger TR_Roster_PreventDuplicate đã được tạo thành công!';
GO