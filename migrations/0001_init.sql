-- 焊接程序变更审批系统 初始化脚本

CREATE TABLE IF NOT EXISTS welding_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_code TEXT NOT NULL,
  version TEXT NOT NULL,
  name TEXT NOT NULL,
  parameters TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS trial_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_no TEXT NOT NULL,
  program_id INTEGER NOT NULL,
  weld_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  arranged_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (program_id) REFERENCES welding_programs(id)
);

CREATE TABLE IF NOT EXISTS trial_welds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weld_no TEXT NOT NULL,
  batch_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (batch_id) REFERENCES trial_batches(id)
);

CREATE TABLE IF NOT EXISTS quality_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weld_id INTEGER NOT NULL UNIQUE,
  tensile_strength REAL,
  appearance_grade TEXT,
  result TEXT NOT NULL,
  inspected_by TEXT NOT NULL,
  remark TEXT,
  inspected_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (weld_id) REFERENCES trial_welds(id)
);

CREATE TABLE IF NOT EXISTS release_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  released_by TEXT NOT NULL,
  in_production INTEGER NOT NULL DEFAULT 0,
  released_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (program_id) REFERENCES welding_programs(id)
);

CREATE INDEX IF NOT EXISTS idx_programs_status ON welding_programs(status);
CREATE INDEX IF NOT EXISTS idx_batches_program ON trial_batches(program_id);
CREATE INDEX IF NOT EXISTS idx_welds_batch ON trial_welds(batch_id);
CREATE INDEX IF NOT EXISTS idx_releases_program ON release_records(program_id);

-- ===== 种子数据 =====

-- 程序版本(覆盖各状态)
INSERT INTO welding_programs (id, program_code, version, name, parameters, status, created_by) VALUES
(1, 'WLD-A01', 'v1.0', '车身侧围点焊程序', '{"电流":12000,"时间":12,"压力":2.5}', 'in_production', '李工'),
(2, 'WLD-B02', 'v1.2', '底盘弧焊程序', '{"电流":13500,"时间":15,"速度":0.8}', 'published', '李工'),
(3, 'WLD-C03', 'v2.0', '电池托架点焊程序', '{"电流":11000,"时间":10,"压力":2.2}', 'ready_to_publish', '王工'),
(4, 'WLD-D04', 'v1.1', '前围凸焊螺母程序', '{"电流":14000,"时间":8,"压力":3.0}', 'locked', '王工'),
(5, 'WLD-E05', 'v1.0', '后纵梁弧焊程序', '{"电流":12800,"时间":14,"速度":0.9}', 'trialing', '李工'),
(6, 'WLD-F06', 'v1.0', '顶盖激光焊程序', '{"功率":3000,"速度":1.2}', 'pending_trial', '赵工'),
(7, 'WLD-G07', 'v0.9', '门内板点焊程序(草稿)', '{"电流":11500}', 'draft', '赵工');

-- 试焊批次
INSERT INTO trial_batches (id, batch_no, program_id, weld_count, status, arranged_by) VALUES
(1, 'TB-2026-001', 1, 3, 'completed', '张班长'),
(2, 'TB-2026-002', 2, 3, 'completed', '张班长'),
(3, 'TB-2026-003', 3, 2, 'completed', '张班长'),
(4, 'TB-2026-004', 4, 2, 'completed', '刘班长'),
(5, 'TB-2026-005', 5, 2, 'trialing', '刘班长');

-- 试焊件
INSERT INTO trial_welds (id, weld_no, batch_id, status) VALUES
(1, 'W-001', 1, 'qualified'),
(2, 'W-002', 1, 'qualified'),
(3, 'W-003', 1, 'qualified'),
(4, 'W-004', 2, 'qualified'),
(5, 'W-005', 2, 'qualified'),
(6, 'W-006', 2, 'qualified'),
(7, 'W-007', 3, 'qualified'),
(8, 'W-008', 3, 'qualified'),
(9, 'W-009', 4, 'qualified'),
(10, 'W-010', 4, 'unqualified'),
(11, 'W-011', 5, 'qualified'),
(12, 'W-012', 5, 'pending');

-- 质量结果(对应已检测试焊件)
INSERT INTO quality_results (weld_id, tensile_strength, appearance_grade, result, inspected_by, remark) VALUES
(1, 4250, 'pass', 'qualified', '陈质检', '焊缝成型良好'),
(2, 4310, 'pass', 'qualified', '陈质检', '拉力达标'),
(3, 4180, 'marginal', 'qualified', '陈质检', '外观临界但拉力合格'),
(4, 4400, 'pass', 'qualified', '陈质检', '优秀'),
(5, 4275, 'pass', 'qualified', '陈质检', '合格'),
(6, 4290, 'pass', 'qualified', '陈质检', '合格'),
(7, 4150, 'pass', 'qualified', '陈质检', '合格'),
(8, 4220, 'pass', 'qualified', '陈质检', '合格'),
(9, 4080, 'marginal', 'qualified', '陈质检', '外观临界'),
(10, 3650, 'fail', 'unqualified', '陈质检', '拉力不足,焊点虚焊'),
(11, 4200, 'pass', 'qualified', '陈质检', '合格');

-- 发布记录
INSERT INTO release_records (id, program_id, released_by, in_production) VALUES
(1, 1, '李工', 1),
(2, 2, '李工', 0);
