-- ============================================================
-- FILE: 03_trigger_roster.sql
-- MÔ TẢ: Trigger kiểm tra roster constraint
--        1 player KHÔNG được đăng ký 2 team trong cùng 1 season
--        Engine: MS SQL Server (T-SQL)
--
-- THỨ TỰ CHẠY: Phải chạy SAU 01_schema.sql và 02_seed_data.sql
--
-- LÝ DO DÙNG TRIGGER thay vì chỉ dùng UNIQUE constraint:
--   - UNIQUE constraint chỉ bắt lỗi SAU khi đã insert
--   - Trigger cho phép kiểm tra logic phức tạp TRƯỚC khi insert
--   - Trigger có thể trả về thông báo lỗi rõ ràng hơn
--   - Trigger không thể bypass từ application code
--
-- LOẠI TRIGGER: INSTEAD OF INSERT
--   → Fire TRƯỚC khi INSERT thật sự xảy ra
--   → Nếu vi phạm: rollback + raise error
--   → Nếu hợp lệ: thực hiện INSERT
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
    -- Tắt thông báo "X rows affected" để output gọn hơn
    SET NOCOUNT ON;

    -- --------------------------------------------------------
    -- BƯỚC 1: Kiểm tra xem player đã đăng ký team nào
    --         trong season này chưa
    --
    -- Logic: JOIN bảng inserted (data đang được insert)
    --        với bảng Rosters hiện có
    --        Nếu tìm thấy trùng → vi phạm constraint
    -- --------------------------------------------------------
    IF EXISTS (
        SELECT 1
        FROM inserted i                          -- data đang muốn insert
        JOIN dbo.Rosters r                       -- data đã tồn tại trong DB
            ON i.player_id = r.player_id         -- cùng player
            AND i.season_id = r.season_id        -- cùng season
        -- KHÔNG check team_id vì dù khác team cũng không được
    )
    BEGIN
        -- --------------------------------------------------------
        -- VI PHẠM: Player đã thuộc team khác trong season này
        -- Lấy thông tin để in ra thông báo lỗi rõ ràng
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

        -- Raise error — số -20001 là custom error code
        RAISERROR(
            N'[TRIGGER LỖI] Player "%s" đã đăng ký cho "%s" trong season "%s". Không thể đăng ký thêm cho "%s".',
            16,   -- severity level (16 = user error)
            1,    -- state
            @playerNick,
            @existTeam,
            @seasonName,
            @newTeam
        );

        -- Dừng lại, KHÔNG thực hiện INSERT
        RETURN;
    END

    -- --------------------------------------------------------
    -- BƯỚC 2: Hợp lệ → Thực hiện INSERT thật sự
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
        ISNULL(join_date, GETDATE()),  -- nếu không truyền join_date thì dùng ngày hôm nay
        ISNULL(is_starter, 1)          -- mặc định là starter
    FROM inserted;

    PRINT N'Đăng ký roster thành công!';
END;
GO

-- ============================================================
-- TEST CASES — Chạy từng block để kiểm tra trigger
-- ============================================================

PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 1: Insert hợp lệ — player mới chưa đăng ký season nào';
PRINT N'============================================================';

-- Thêm 1 player mới để test
INSERT INTO Players (player_code, nickname, role) VALUES
('TEST1', N'TestPlayer', N'ADC');

DECLARE @newPlayerId INT = SCOPE_IDENTITY();

-- Đăng ký player mới vào SP, season 1 → phải THÀNH CÔNG
INSERT INTO Rosters (player_id, team_id, season_id, jersey_number)
VALUES (@newPlayerId, 1, 1, 99);

PRINT N'→ Kết quả mong đợi: Thành công';

-- --------------------------------------------------------
PRINT N'';
PRINT N'============================================================';
PRINT N'TEST 2: Insert VI PHẠM — cùng player, cùng season, team khác';
PRINT N'Đây là race condition mà trigger phải chặn được';
PRINT N'============================================================';

-- Thử đăng ký cùng player đó vào TF (team khác) trong cùng season 1
-- → Trigger phải RAISE ERROR và KHÔNG insert
BEGIN TRY
    INSERT INTO Rosters (player_id, team_id, season_id, jersey_number)
    VALUES (@newPlayerId, 2, 1, 88);  -- team_id=2 là Team Flash

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

-- Season 2 (AIC 2024) — player này chưa đăng ký season 2
-- → phải THÀNH CÔNG dù đã đăng ký SP ở season 1
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
-- Giải thích để defend oral:
--
-- Nếu KHÔNG có Trigger, race condition xảy ra thế này:
--   T1: Team Flash  kiểm tra → Naul chưa có trong season 1 ✓
--   T2: Saigon Phantom kiểm tra → Naul chưa có trong season 1 ✓
--   T1: INSERT Naul vào Team Flash  ← thành công
--   T2: INSERT Naul vào Saigon Phantom ← cũng thành công!
--   → Naul giờ thuộc 2 team — DỮ LIỆU BỊ LỖI
--
-- Với Trigger INSTEAD OF INSERT:
--   → Mỗi INSERT được kiểm tra TRONG CÙNG TRANSACTION
--   → Transaction sau sẽ bị block bởi row-level lock
--   → Trigger đảm bảo chỉ 1 trong 2 INSERT thành công
-- ============================================================
PRINT N'';
PRINT N'Trigger TR_Roster_PreventDuplicate đã được tạo thành công!';
GO