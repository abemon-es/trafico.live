-- Camera.snapshotFailDays: consecutive daily runs whose snapshot wasn't an
-- image. See services/collector/tasks/camera/snapshots.ts.
--
-- The app role has no DDL: apply as trafico_admin, then
-- `prisma migrate resolve --applied 20261021060000_camera_snapshot_fail_days`
-- (PLAYBOOK, "Migrations do NOT auto-apply"). A constant default makes this a
-- catalogue-only change in Postgres 11+: no table rewrite.

ALTER TABLE "Camera" ADD COLUMN IF NOT EXISTS "snapshotFailDays" INTEGER NOT NULL DEFAULT 0;
