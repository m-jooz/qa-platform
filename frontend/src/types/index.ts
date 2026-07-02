export interface ApiResponse<T> {
  success: boolean
  statusCode: number
  data: T
  timestamp: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'LEAD' | 'TESTER' | 'VIEWER'
}

export interface UserSummary {
  id: string
  name: string
  email: string
}

export interface Project {
  id: string
  name: string
  type: 'WEB' | 'ANDROID' | 'IOS'
  description: string | null
  jiraProjectKey: string | null
  jiraBaseUrl: string | null
  jiraEmail: string
  createdAt: string
  stats: {
    testCasesCount: number
    jiraTasksCount: number
  }
}

export interface JiraTask {
  id: string
  projectId: string
  jiraKey: string
  title: string
  currentStatus: string | null
  currentAssignee: string | null
  jiraUrl: string | null
  jiraUpdatedAt: string | null
  syncedAt: string
  unseen: boolean
}

export interface JiraTaskSummary {
  id: string
  jiraKey: string
  title: string
  currentStatus: string | null
  jiraUrl: string | null
}

export interface TestCase {
  id: string
  projectId: string
  jiraTaskId: string | null
  title: string
  steps: string
  expectedResult: string
  platform: 'WEB' | 'ANDROID' | 'IOS'
  type: 'MANUAL' | 'E2E' | 'API' | 'UNIT' | 'PERFORMANCE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  createdBy: string
  createdAt: string
  creator: UserSummary
  jiraTask: JiraTaskSummary | null
}

export interface TestCaseDetail extends TestCase {
  project: {
    id: string
    name: string
  }
}

export interface Attachment {
  id: string
  testRunId: string
  fileUrl: string
  type: 'IMAGE' | 'VIDEO'
  createdAt: string
}

export interface TestRun {
  id: string
  testCaseId: string
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED'
  actualResult: string | null
  notes: string | null
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null
  isBug: boolean
  bugDetails: string | null
  bugStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  bugReviewedBy: string | null
  bugReviewedAt: string | null
  rejectReason: string | null
  jiraCommentId: string | null
  jiraStatusBefore: string | null
  jiraStatusAfter: string | null
  jiraReassignedTo: string | null
  retestOfRunId: string | null
  executedBy: string
  executedAt: string
  executor: UserSummary
  bugReviewer: UserSummary | null
  attachments: Attachment[]
  testCase: {
    id: string
    title: string
    steps: string
    expectedResult: string
    platform: 'WEB' | 'ANDROID' | 'IOS'
    projectId: string
    jiraTaskId: string | null
  }
}

export interface Report {
  id: string
  title: string
  shareToken: string
  createdAt: string
  creator: UserSummary
}

export interface DashboardOverview {
  totalTestCases: number
  totalTestRuns: number
  passCount: number
  failCount: number
  blockedCount: number
  skippedCount: number
  passRate: number
  failRate: number
  blockedRate: number
  skippedRate: number
  totalBugs: number
  pendingBugs: number
  approvedBugs: number
  rejectedBugs: number
}

export interface DashboardPlatformStat {
  platform: 'WEB' | 'ANDROID' | 'IOS'
  total: number
  pass: number
  fail: number
}

export interface DashboardActivity {
  id: string
  action: string
  entityType: string
  entityId: string
  userName: string
  createdAt: string
}

export interface DashboardPendingBugReview {
  id: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null
  testCaseTitle: string
  executedByName: string
  executedAt: string
}

export interface DashboardData {
  project: {
    id: string
    name: string
    type: 'WEB' | 'ANDROID' | 'IOS'
  }
  overview: DashboardOverview
  byPlatform: DashboardPlatformStat[]
  recentActivity: DashboardActivity[]
  unseenJiraTasks: number
  pendingBugReviews: DashboardPendingBugReview[]
}

export interface Notification {
  id: string
  message: string
  isRead: boolean
  createdAt: string
}
