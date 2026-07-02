-- CreateIndex
CREATE INDEX "activity_logs_project_id_idx" ON "activity_logs"("project_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "jira_tasks_project_id_idx" ON "jira_tasks"("project_id");

-- CreateIndex
CREATE INDEX "jira_tasks_jira_key_idx" ON "jira_tasks"("jira_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "test_cases_project_id_idx" ON "test_cases"("project_id");

-- CreateIndex
CREATE INDEX "test_cases_jira_task_id_idx" ON "test_cases"("jira_task_id");

-- CreateIndex
CREATE INDEX "test_runs_test_case_id_idx" ON "test_runs"("test_case_id");

-- CreateIndex
CREATE INDEX "test_runs_executed_by_idx" ON "test_runs"("executed_by");

-- CreateIndex
CREATE INDEX "test_runs_status_idx" ON "test_runs"("status");
