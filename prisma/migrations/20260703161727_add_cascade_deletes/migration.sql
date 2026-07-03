-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_project_id_fkey";

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
