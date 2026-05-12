-- ============================================================
-- FILE: sp_register_player.sql
-- DESC: Stored Procedure to register a player into a roster
--       Checks eligibility before INSERT atomically
--       Engine: MS SQL Server (T-SQL)
--
-- RUN ORDER: Must run AFTER 01_schema.sql
--
-- DIFFERENCE FROM TRIGGER (important for oral defense):
--   - Trigger: fires automatically on INSERT, cannot be bypassed
--   - SP: called explicitly from application, more flexible,
--         can return output, handles complex business logic
--   - In this project: SP is the entry point from Backend API,
--     Trigger is the last line of defense at the DB layer
-- ============================================================

IF OBJECT_ID('dbo.sp_register_player', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_register_player;
GO

CREATE PROCEDURE dbo.sp_register_player
    -- Input parameters
    @player_id      INT,
    @team_id        INT,
    @season_id      INT,
    @jersey_number  INT     = NULL,  -- optional
    @is_starter     BIT     = 1,     -- default to starter

    -- Output parameters — return results to Backend API
    @success        BIT         OUTPUT,
    @message        NVARCHAR(500) OUTPUT,
    @roster_id      INT         OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Initialize output
    SET @success   = 0;
    SET @message   = N'';
    SET @roster_id = NULL;

    -- --------------------------------------------------------
    -- STEP 1: Check if player exists
    -- --------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Players WHERE player_id = @player_id AND is_active = 1)
    BEGIN
        SET @message = N'Error: Player does not exist or is inactive.';
        RETURN;
    END

    -- --------------------------------------------------------
    -- STEP 2: Check if team exists
    -- --------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE team_id = @team_id AND is_active = 1)
    BEGIN
        SET @message = N'Error: Team does not exist or has been disbanded.';
        RETURN;
    END

    -- --------------------------------------------------------
    -- STEP 3: Check if season is active
    -- --------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Seasons WHERE season_id = @season_id AND is_active = 1)
    BEGIN
        SET @message = N'Error: Season does not exist or has ended.';
        RETURN;
    END

    -- --------------------------------------------------------
    -- STEP 4: Check eligibility
    --         Has player already registered for a team this season?
    --         This is the main business rule of the SP
    -- --------------------------------------------------------
    DECLARE @existingTeamName NVARCHAR(100);

    SELECT @existingTeamName = t.team_name
    FROM dbo.Rosters r
    JOIN dbo.Teams   t ON r.team_id = t.team_id
    WHERE r.player_id = @player_id
      AND r.season_id = @season_id;

    IF @existingTeamName IS NOT NULL
    BEGIN
        DECLARE @playerNick NVARCHAR(100);
        DECLARE @seasonName NVARCHAR(100);

        SELECT @playerNick = nickname  FROM dbo.Players WHERE player_id = @player_id;
        SELECT @seasonName = season_name FROM dbo.Seasons WHERE season_id = @season_id;

        SET @message = N'Error: Player "' + @playerNick +
                       N'" is already registered for team "' + @existingTeamName +
                       N'" in season "' + @seasonName + N'". ' +
                       N'Cannot register for another team.';
        RETURN;
    END

    -- --------------------------------------------------------
    -- STEP 5: All checks passed → INSERT atomically
    --         Use transaction to ensure ACID
    --         On unexpected error → ROLLBACK everything
    -- --------------------------------------------------------
    BEGIN TRANSACTION;
    BEGIN TRY

        INSERT INTO dbo.Rosters (
            player_id,
            team_id,
            season_id,
            jersey_number,
            join_date,
            is_starter
        )
        VALUES (
            @player_id,
            @team_id,
            @season_id,
            @jersey_number,
            GETDATE(),
            @is_starter
        );

        -- Get the newly created roster_id to return to API
        SET @roster_id = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        -- Return success result
        SET @success = 1;

        DECLARE @teamName2   NVARCHAR(100);
        DECLARE @playerNick2 NVARCHAR(100);
        DECLARE @seasonName2 NVARCHAR(100);

        SELECT @playerNick2 = nickname    FROM dbo.Players WHERE player_id = @player_id;
        SELECT @teamName2   = team_name   FROM dbo.Teams   WHERE team_id   = @team_id;
        SELECT @seasonName2 = season_name FROM dbo.Seasons WHERE season_id = @season_id;

        SET @message = N'Success: Player "' + @playerNick2 +
                       N'" has been registered for team "' + @teamName2 +
                       N'" in season "' + @seasonName2 + N'".';

    END TRY
    BEGIN CATCH
        -- Unexpected error → rollback everything
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @success = 0;
        SET @message = N'System error: ' + ERROR_MESSAGE();
    END CATCH;
END;
GO

-- ============================================================
-- TEST CASES
-- ============================================================

PRINT N'============================================================';
PRINT N'TEST 1: Valid registration — new player into team 1, season 1';
PRINT N'============================================================';

-- Add test player
INSERT INTO Players (player_code, nickname, role) VALUES ('SP_TEST', N'SPTestPlayer', N'Mid');
DECLARE @testPid INT = SCOPE_IDENTITY();

DECLARE @ok1  BIT, @msg1 NVARCHAR(500), @rid1 INT;
EXEC dbo.sp_register_player
    @player_id     = @testPid,
    @team_id       = 1,          -- T1
    @season_id     = 1,          -- LCK Spring 2025
    @jersey_number = 99,
    @success       = @ok1  OUTPUT,
    @message       = @msg1 OUTPUT,
    @roster_id     = @rid1 OUTPUT;

PRINT N'Success: ' + CAST(@ok1 AS VARCHAR) + ' | ' + @msg1;
PRINT N'Roster ID: ' + ISNULL(CAST(@rid1 AS VARCHAR), 'NULL');

-- --------------------------------------------------------
PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 2: VIOLATION registration — same player, same season, different team';
PRINT N'============================================================';

DECLARE @ok2  BIT, @msg2 NVARCHAR(500), @rid2 INT;
EXEC dbo.sp_register_player
    @player_id     = @testPid,
    @team_id       = 2,          -- Cloud9 (different team!)
    @season_id     = 1,          -- LCK Spring 2025 (same season!)
    @jersey_number = 88,
    @success       = @ok2  OUTPUT,
    @message       = @msg2 OUTPUT,
    @roster_id     = @rid2 OUTPUT;

PRINT N'Success: ' + CAST(@ok2 AS VARCHAR) + ' | ' + @msg2;

-- --------------------------------------------------------
PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 3: Inactive season';
PRINT N'============================================================';

-- Add an ended season
INSERT INTO Seasons (season_name, start_date, end_date, is_active)
VALUES (N'Old Season 2023', '2023-01-01', '2023-06-30', 0);
DECLARE @oldSeason INT = SCOPE_IDENTITY();

DECLARE @ok3  BIT, @msg3 NVARCHAR(500), @rid3 INT;
EXEC dbo.sp_register_player
    @player_id     = @testPid,
    @team_id       = 1,
    @season_id     = @oldSeason,  -- ended season
    @success       = @ok3  OUTPUT,
    @message       = @msg3 OUTPUT,
    @roster_id     = @rid3 OUTPUT;

PRINT N'Success: ' + CAST(@ok3 AS VARCHAR) + ' | ' + @msg3;

-- Clean up
DELETE FROM Rosters WHERE player_id = @testPid;
DELETE FROM Players WHERE player_code = 'SP_TEST';
DELETE FROM Seasons WHERE season_name = N'Old Season 2023';
PRINT N'';
PRINT N'Test data cleaned up.';
GO
