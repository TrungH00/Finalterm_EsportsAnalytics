-- ============================================================
-- FILE: 03_trigger_roster.sql
-- DESC: Trigger to enforce roster constraint
--       1 player CANNOT register for 2 teams in the same season
--       Engine: MS SQL Server (T-SQL)
--
-- RUN ORDER: Must run AFTER 01_schema.sql and 02_seed_data.sql
--
-- WHY USE TRIGGER instead of UNIQUE constraint alone:
--   - UNIQUE constraint only catches errors AFTER insert
--   - Trigger allows complex logic checks BEFORE insert
--   - Trigger can return clearer error messages
--   - Trigger cannot be bypassed from application code
--
-- TRIGGER TYPE: INSTEAD OF INSERT
--   → Fires BEFORE the actual INSERT occurs
--   → If violation: rollback + raise error
--   → If valid: perform INSERT
-- ============================================================

-- Drop existing trigger if it exists
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
    -- Suppress "X rows affected" messages for cleaner output
    SET NOCOUNT ON;

    -- --------------------------------------------------------
    -- STEP 1: Check if player already registered for any team
    --         in this season
    --
    -- Logic: JOIN inserted table (data being inserted)
    --        with existing Rosters table
    --        If a match is found → constraint violation
    -- --------------------------------------------------------
    IF EXISTS (
        SELECT 1
        FROM inserted i                          -- data being inserted
        JOIN dbo.Rosters r                       -- data already in DB
            ON i.player_id = r.player_id         -- same player
            AND i.season_id = r.season_id        -- same season
        -- NOT checking team_id because different teams are also not allowed
    )
    BEGIN
        -- --------------------------------------------------------
        -- VIOLATION: Player already belongs to another team this season
        -- Retrieve info to print a clear error message
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

        -- Raise error — -20001 is a custom error code
        RAISERROR(
            N'[TRIGGER ERROR] Player "%s" is already registered for "%s" in season "%s". Cannot also register for "%s".',
            16,   -- severity level (16 = user error)
            1,    -- state
            @playerNick,
            @existTeam,
            @seasonName,
            @newTeam
        );

        -- Stop, do NOT perform INSERT
        RETURN;
    END

    -- --------------------------------------------------------
    -- STEP 2: Valid → Perform the actual INSERT
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
        ISNULL(join_date, GETDATE()),  -- default to today if join_date not provided
        ISNULL(is_starter, 1)          -- default to starter
    FROM inserted;

    PRINT N'Roster registered successfully!';
END;
GO

-- ============================================================
-- TEST CASES — Run each block to test trigger
-- ============================================================

PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 1: Valid insert — new player not yet registered for any season';
PRINT N'============================================================';

-- Add a new player for testing
INSERT INTO Players (player_code, nickname, role) VALUES
('TEST1', N'TestPlayer', N'ADC');

DECLARE @newPlayerId INT = SCOPE_IDENTITY();

-- Register new player into team 1, season 1 → should SUCCEED
INSERT INTO Rosters (player_id, team_id, season_id, jersey_number)
VALUES (@newPlayerId, 1, 1, 99);

PRINT N'→ Expected result: Success';

-- --------------------------------------------------------
PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 2: VIOLATION insert — same player, same season, different team';
PRINT N'This is the race condition the trigger must block';
PRINT N'============================================================';

-- Try to register same player to a different team in the same season 1
-- → Trigger must RAISE ERROR and NOT insert
BEGIN TRY
    INSERT INTO Rosters (player_id, team_id, season_id, jersey_number)
    VALUES (@newPlayerId, 2, 1, 88);  -- team_id=2 is Team Flash

    PRINT N'→ Result: INSERT succeeded (WRONG — trigger did not work!)';
END TRY
BEGIN CATCH
    PRINT N'→ Expected result: Trigger blocked successfully!';
    PRINT N'→ Error: ' + ERROR_MESSAGE();
END CATCH;

-- --------------------------------------------------------
PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 3: Valid insert — same player but DIFFERENT season';
PRINT N'Player is allowed to switch teams in a new season';
PRINT N'============================================================';

-- Season 2 (AIC 2024) — player not yet registered for season 2
-- → should SUCCEED even though already registered in season 1
INSERT INTO Rosters (player_id, team_id, season_id, jersey_number)
VALUES (@newPlayerId, 2, 2, 77);  -- team TF, season 2

PRINT N'→ Expected result: Success (different season = allowed)';

-- --------------------------------------------------------
PRINT N'';
PRINT N'============================================================';
PRINT N'VERIFY: Check TestPlayer roster after 3 tests';
PRINT N'Should see exactly 2 rows: team1/season1 and team2/season2';
PRINT N'============================================================';

SELECT
    p.nickname      AS [Player],
    t.team_name     AS [Team],
    s.season_name   AS [Season],
    r.jersey_number AS [Jersey Number]
FROM Rosters r
JOIN Players p ON r.player_id = p.player_id
JOIN Teams   t ON r.team_id   = t.team_id
JOIN Seasons s ON r.season_id = s.season_id
WHERE p.player_code = 'TEST1'
ORDER BY s.season_name;

-- Clean up test data
DELETE FROM Rosters WHERE player_id = @newPlayerId;
DELETE FROM Players WHERE player_code = 'TEST1';
PRINT N'';
PRINT N'Test data cleaned up.';
GO

-- ============================================================
-- RACE CONDITION DEMO
-- Explanation for oral defense:
--
-- WITHOUT Trigger, race condition occurs like this:
--   T1: Team Flash  checks → Naul not in season 1 
--   T2: Saigon Phantom checks → Naul not in season 1 
--   T1: INSERT Naul into Team Flash  ← succeeds
--   T2: INSERT Naul into Saigon Phantom ← also succeeds!
--   → Naul now belongs to 2 teams — DATA CORRUPTION
--
-- With INSTEAD OF INSERT Trigger:
--   → Each INSERT is checked WITHIN THE SAME TRANSACTION
--   → Later transaction is blocked by row-level lock
--   → Trigger ensures only 1 of 2 INSERTs succeeds
-- ============================================================
PRINT N'';
PRINT N'Trigger TR_Roster_PreventDuplicate created successfully!';
GO