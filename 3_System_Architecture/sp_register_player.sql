-- ============================================================
-- FILE: sp_register_player.sql
-- MÔ TẢ: Stored Procedure đăng ký player vào roster
--        Kiểm tra eligibility trước khi INSERT atomically
--        Engine: MS SQL Server (T-SQL)
--
-- THỨ TỰ CHẠY: Phải chạy SAU 01_schema.sql
--
-- SỰ KHÁC NHAU VỚI TRIGGER (quan trọng để defend):
--   - Trigger: tự động fire khi có INSERT, không thể bypass
--   - SP: gọi chủ động từ application, linh hoạt hơn,
--         có thể trả về output, xử lý business logic phức tạp
--   - Trong project này: SP là cổng vào từ Backend API,
--     Trigger là lớp bảo vệ cuối cùng ở tầng DB
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
    @is_starter     BIT     = 1,     -- mặc định là starter

    -- Output parameters — trả về kết quả cho Backend API
    @success        BIT         OUTPUT,
    @message        NVARCHAR(500) OUTPUT,
    @roster_id      INT         OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Khởi tạo output
    SET @success   = 0;
    SET @message   = N'';
    SET @roster_id = NULL;

    -- --------------------------------------------------------
    -- BƯỚC 1: Kiểm tra player có tồn tại không
    -- --------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Players WHERE player_id = @player_id AND is_active = 1)
    BEGIN
        SET @message = N'Lỗi: Player không tồn tại hoặc đã ngừng hoạt động.';
        RETURN;
    END

    -- --------------------------------------------------------
    -- BƯỚC 2: Kiểm tra team có tồn tại không
    -- --------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE team_id = @team_id AND is_active = 1)
    BEGIN
        SET @message = N'Lỗi: Team không tồn tại hoặc đã giải thể.';
        RETURN;
    END

    -- --------------------------------------------------------
    -- BƯỚC 3: Kiểm tra season có đang active không
    -- --------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Seasons WHERE season_id = @season_id AND is_active = 1)
    BEGIN
        SET @message = N'Lỗi: Season không tồn tại hoặc đã kết thúc.';
        RETURN;
    END

    -- --------------------------------------------------------
    -- BƯỚC 4: Kiểm tra eligibility
    --         Player đã đăng ký team nào trong season này chưa?
    --         Đây là business rule chính của SP
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

        SET @message = N'Lỗi: Player "' + @playerNick +
                       N'" đã đăng ký cho team "' + @existingTeamName +
                       N'" trong season "' + @seasonName + N'". ' +
                       N'Không thể đăng ký thêm cho team khác.';
        RETURN;
    END

    -- --------------------------------------------------------
    -- BƯỚC 5: Tất cả kiểm tra pass → INSERT atomically
    --         Dùng transaction để đảm bảo ACID
    --         Nếu có lỗi bất ngờ → ROLLBACK toàn bộ
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

        -- Lấy roster_id vừa tạo để trả về cho API
        SET @roster_id = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        -- Trả về kết quả thành công
        SET @success = 1;

        DECLARE @teamName2   NVARCHAR(100);
        DECLARE @playerNick2 NVARCHAR(100);
        DECLARE @seasonName2 NVARCHAR(100);

        SELECT @playerNick2 = nickname    FROM dbo.Players WHERE player_id = @player_id;
        SELECT @teamName2   = team_name   FROM dbo.Teams   WHERE team_id   = @team_id;
        SELECT @seasonName2 = season_name FROM dbo.Seasons WHERE season_id = @season_id;

        SET @message = N'Thành công: Player "' + @playerNick2 +
                       N'" đã được đăng ký cho team "' + @teamName2 +
                       N'" trong season "' + @seasonName2 + N'".';

    END TRY
    BEGIN CATCH
        -- Lỗi bất ngờ → rollback toàn bộ
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @success = 0;
        SET @message = N'Lỗi hệ thống: ' + ERROR_MESSAGE();
    END CATCH;
END;
GO

-- ============================================================
-- TEST CASES
-- ============================================================

PRINT N'============================================================';
PRINT N'TEST 1: Đăng ký hợp lệ — player mới vào SP season 1';
PRINT N'============================================================';

-- Thêm player test
INSERT INTO Players (player_code, nickname, role) VALUES ('SP_TEST', N'SPTestPlayer', N'Mid');
DECLARE @testPid INT = SCOPE_IDENTITY();

DECLARE @ok1  BIT, @msg1 NVARCHAR(500), @rid1 INT;
EXEC dbo.sp_register_player
    @player_id     = @testPid,
    @team_id       = 1,          -- Saigon Phantom
    @season_id     = 1,          -- VPS Spring 2025
    @jersey_number = 99,
    @success       = @ok1  OUTPUT,
    @message       = @msg1 OUTPUT,
    @roster_id     = @rid1 OUTPUT;

PRINT N'Success: ' + CAST(@ok1 AS VARCHAR) + ' | ' + @msg1;
PRINT N'Roster ID: ' + ISNULL(CAST(@rid1 AS VARCHAR), 'NULL');

-- --------------------------------------------------------
PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 2: Đăng ký VI PHẠM — cùng player, cùng season, team khác';
PRINT N'============================================================';

DECLARE @ok2  BIT, @msg2 NVARCHAR(500), @rid2 INT;
EXEC dbo.sp_register_player
    @player_id     = @testPid,
    @team_id       = 2,          -- Team Flash (khác team!)
    @season_id     = 1,          -- VPS Spring 2025 (cùng season!)
    @jersey_number = 88,
    @success       = @ok2  OUTPUT,
    @message       = @msg2 OUTPUT,
    @roster_id     = @rid2 OUTPUT;

PRINT N'Success: ' + CAST(@ok2 AS VARCHAR) + ' | ' + @msg2;

-- --------------------------------------------------------
PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 3: Season không active';
PRINT N'============================================================';

-- Thêm season đã kết thúc
INSERT INTO Seasons (season_name, start_date, end_date, is_active)
VALUES (N'Old Season 2023', '2023-01-01', '2023-06-30', 0);
DECLARE @oldSeason INT = SCOPE_IDENTITY();

DECLARE @ok3  BIT, @msg3 NVARCHAR(500), @rid3 INT;
EXEC dbo.sp_register_player
    @player_id     = @testPid,
    @team_id       = 1,
    @season_id     = @oldSeason,  -- season đã kết thúc
    @success       = @ok3  OUTPUT,
    @message       = @msg3 OUTPUT,
    @roster_id     = @rid3 OUTPUT;

PRINT N'Success: ' + CAST(@ok3 AS VARCHAR) + ' | ' + @msg3;

-- Dọn dẹp
DELETE FROM Rosters WHERE player_id = @testPid;
DELETE FROM Players WHERE player_code = 'SP_TEST';
DELETE FROM Seasons WHERE season_name = N'Old Season 2023';
PRINT N'';
PRINT N'Test data đã được dọn dẹp.';
GO
