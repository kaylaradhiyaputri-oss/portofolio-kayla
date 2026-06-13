-- ============================================
-- Portfolio Dashboard Database Schema
-- SQL Server
-- ============================================

-- Create database (run this separately if needed)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'portfolio_db')
BEGIN
    CREATE DATABASE portfolio_db;
END
GO

USE portfolio_db;
GO

-- Drop table if exists for clean re-run
IF OBJECT_ID('portfolio_items', 'U') IS NOT NULL
    DROP TABLE portfolio_items;
GO

-- Create portfolio items table
CREATE TABLE portfolio_items (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    title           NVARCHAR(255) NOT NULL,
    category        NVARCHAR(50)  NOT NULL,   -- 'graphic_design', 'animation', 'video_editing'
    category_label  NVARCHAR(100),            -- 'Graphic Design', 'Animation', 'Video Editing'
    file_path       NVARCHAR(500) NOT NULL,   -- path to image/video file
    file_type       NVARCHAR(10)  NOT NULL,   -- 'image' or 'video'
    size_class      NVARCHAR(20)  DEFAULT 'size-medium',
    is_extra        BIT           DEFAULT 0,  -- 1 = hidden behind "View More"
    display_order   INT           DEFAULT 0,
    created_at      DATETIME2     DEFAULT GETDATE()
);
GO

-- ============================================
-- Seed existing portfolio items
-- ============================================

-- Graphic Design (6 items)
INSERT INTO portfolio_items (title, category, category_label, file_path, file_type, size_class, is_extra, display_order) VALUES
('Arctic Monkeys Edit', 'graphic_design', 'Graphic Design', '/graphic design/arctic monkeys edit.png', 'image', 'size-tall', 0, 1),
('Art Block',           'graphic_design', 'Graphic Design', '/graphic design/art block.png',           'image', 'size-wide', 0, 2),
('Brent Faiyaz Edit',   'graphic_design', 'Graphic Design', '/graphic design/brent faiyaz edit.png',   'image', 'size-large', 0, 3),
('Card',                'graphic_design', 'Graphic Design', '/graphic design/card.png',                'image', 'size-medium', 1, 4),
('Deftones',            'graphic_design', 'Graphic Design', '/graphic design/deftones.png',            'image', 'size-wide', 1, 5),
('Frank Ocean Edit',    'graphic_design', 'Graphic Design', '/graphic design/frack ocean edit.png',    'image', 'size-wide', 1, 6);

-- Animation (4 items)
INSERT INTO portfolio_items (title, category, category_label, file_path, file_type, size_class, is_extra, display_order) VALUES
('2D Animation',    'animation', 'Animation', '/animation/2D Animation.mp4',          'video', 'size-wide',  0, 1),
('3D Animation 02', 'animation', 'Animation', '/animation/3D Animation (2).mov',      'video', 'size-large', 0, 2),
('Casino Machine',  'animation', 'Animation', '/animation/Casino Machine Animation.mp4', 'video', 'size-medium', 0, 3),
('3D Animation',    'animation', 'Animation', '/animation/3d Animation.mov',          'video', 'size-wide',  1, 4);

-- Video Editing (6 items)
INSERT INTO portfolio_items (title, category, category_label, file_path, file_type, size_class, is_extra, display_order) VALUES
('Art Block',           'video_editing', 'Video Editing', '/video editing/Art Block.mov',            'video', 'size-wide',  0, 1),
('Efest After Movie',   'video_editing', 'Video Editing', '/video editing/Efest After Movie.mp4',    'video', 'size-large', 0, 2),
('Train',               'video_editing', 'Video Editing', '/video editing/Train.mp4',                'video', 'size-medium', 0, 3),
('Birthday',            'video_editing', 'Video Editing', '/video editing/birthday.mp4',             'video', 'size-wide',  1, 4),
('Library',             'video_editing', 'Video Editing', '/video editing/Library.mp4',              'video', 'size-wide',  1, 5),
('Mini Vlog',           'video_editing', 'Video Editing', '/video editing/mini vlog.mov',            'video', 'size-wide',  1, 6);
GO

-- Verify
SELECT * FROM portfolio_items ORDER BY category, display_order;
GO
