-- Remember whether a project's colour was derived from its logo or chosen by hand,
-- so a new logo can refresh an auto colour without overwriting a manual one.
ALTER TABLE "Project" ADD COLUMN "colorSource" TEXT NOT NULL DEFAULT 'auto';

-- Until this release the only way to give a project a colour was to set one
-- explicitly through the MCP tools — there was no picker in the UI — so any
-- colour already in the database was a deliberate choice. Mark those manual so
-- a logo can never quietly overwrite them.
UPDATE "Project" SET "colorSource" = 'manual' WHERE "color" IS NOT NULL;
