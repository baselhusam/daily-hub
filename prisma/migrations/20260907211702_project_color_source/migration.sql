-- Remember whether a project's colour was derived from its logo or chosen by hand,
-- so a new logo can refresh an auto colour without overwriting a manual one.
ALTER TABLE "Project" ADD COLUMN "colorSource" TEXT NOT NULL DEFAULT 'auto';
