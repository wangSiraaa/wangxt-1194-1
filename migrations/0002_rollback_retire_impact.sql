-- ===== 增量迁移:回滚 / 退役 / 量产影响范围 =====

-- 1. 质量结果新增返修结论列
ALTER TABLE quality_results ADD COLUMN repair_conclusion TEXT;

-- 2. 焊接程序新增退役追踪列
ALTER TABLE welding_programs ADD COLUMN retired_at TEXT;
ALTER TABLE welding_programs ADD COLUMN retired_by TEXT;

-- 3. 工位表(工位主数据)
CREATE TABLE IF NOT EXISTS workstations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  line TEXT,
  program_code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_workstations_program ON workstations(program_code);

-- 4. 生产订单表
CREATE TABLE IF NOT EXISTS production_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL,
  product_name TEXT NOT NULL,
  workstation_id INTEGER NOT NULL,
  program_code TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (workstation_id) REFERENCES workstations(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_program ON production_orders(program_code);
CREATE INDEX IF NOT EXISTS idx_orders_workstation ON production_orders(workstation_id);

-- 5. 生产焊缝表
CREATE TABLE IF NOT EXISTS production_welds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  workstation_id INTEGER NOT NULL,
  program_code TEXT NOT NULL,
  weld_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (order_id) REFERENCES production_orders(id),
  FOREIGN KEY (workstation_id) REFERENCES workstations(id)
);

CREATE INDEX IF NOT EXISTS idx_pwelds_program ON production_welds(program_code);
CREATE INDEX IF NOT EXISTS idx_pwelds_order ON production_welds(order_id);
CREATE INDEX IF NOT EXISTS idx_pwelds_workstation ON production_welds(workstation_id);

-- ===== 种子数据:返修结论回填 =====
UPDATE quality_results SET repair_conclusion = 'no_repair' WHERE result = 'qualified';
UPDATE quality_results SET repair_conclusion = 'need_repair' WHERE result = 'unqualified';

-- ===== 种子数据:工位(按 program_code 部署) =====
INSERT INTO workstations (id, code, name, line, program_code) VALUES
(1, 'WS-A01-1', '车身侧围点焊工位-1', '车身主线', 'WLD-A01'),
(2, 'WS-A01-2', '车身侧围点焊工位-2', '车身主线', 'WLD-A01'),
(3, 'WS-B02',   '底盘弧焊工位',       '底盘线',   'WLD-B02'),
(4, 'WS-C03',   '电池托架点焊工位',   '电池线',   'WLD-C03'),
(5, 'WS-D04',   '前围凸焊螺母工位',   '前围线',   'WLD-D04');

-- ===== 种子数据:生产订单 =====
INSERT INTO production_orders (id, order_no, product_name, workstation_id, program_code, quantity, status) VALUES
(1, 'ORD-2026-001', '车身总成-A 批次', 1, 'WLD-A01', 120, 'in_progress'),
(2, 'ORD-2026-002', '车身总成-B 批次', 2, 'WLD-A01', 80,  'in_progress'),
(3, 'ORD-2026-003', '底盘总成-1',      3, 'WLD-B02', 60,  'in_progress'),
(4, 'ORD-2026-004', '电池包壳体-C',     4, 'WLD-C03', 40,  'in_progress'),
(5, 'ORD-2026-005', '前围总成-2',       5, 'WLD-D04', 50,  'completed');

-- ===== 种子数据:生产焊缝 =====
INSERT INTO production_welds (order_id, workstation_id, program_code, weld_no, status) VALUES
(1, 1, 'WLD-A01', 'PW-A01-001', 'completed'),
(1, 1, 'WLD-A01', 'PW-A01-002', 'completed'),
(1, 1, 'WLD-A01', 'PW-A01-003', 'pending'),
(2, 2, 'WLD-A01', 'PW-A01-004', 'completed'),
(2, 2, 'WLD-A01', 'PW-A01-005', 'pending'),
(3, 3, 'WLD-B02', 'PW-B02-001', 'completed'),
(3, 3, 'WLD-B02', 'PW-B02-002', 'pending'),
(4, 4, 'WLD-C03', 'PW-C03-001', 'pending'),
(5, 5, 'WLD-D04', 'PW-D04-001', 'completed'),
(5, 5, 'WLD-D04', 'PW-D04-002', 'completed');
