import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatIsoDate } from "@/templates/_shared/date";

type Priority = "High" | "Medium" | "Low";
type TaskStatus = string;
type ProjectStatus = "active" | "paused" | "completed";
type TaskSortKey = "task" | "project" | "due" | "priority" | "status";
type SortDirection = "asc" | "desc";
type DueState = "overdue" | "today" | "soon" | "normal";

type Project = {
  id: string;
  name: string;
  owner: string;
  status: ProjectStatus;
  workflow: string[];
  createdAt: string;
};

type Task = {
  id: string;
  projectId: string;
  title: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
};

type DashboardState = {
  projects: Project[];
  tasks: Task[];
};

const STORAGE_KEY = "saas-project-management-demo.v2";
const CURRENT_USER_KEY = "saas-project-management-demo.current-user";
const DEFAULT_WORKFLOW = ["todo", "in_progress", "done"];
const TEAM_MEMBERS = [
  "Maya Li",
  "Kai Patel",
  "Owen Ross",
  "Chloe West",
  "Aiden Cole",
  "Nora Chen",
  "Luca Kim",
];

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-xl border border-border bg-panel p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  tone?: "default" | "danger";
};

function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  tone = "default",
}: ConfirmModalProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="text-sm text-text-secondary">{description}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          className={tone === "danger" ? "border-rose-400/40 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30" : ""}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function isoDateFromOffset(dayOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeWorkflowStep(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
}

function parseWorkflowDraft(value: string): string[] {
  const steps = value
    .split(/[\n,]+/)
    .map((step) => normalizeWorkflowStep(step))
    .filter((step) => step.length > 0);
  const unique = Array.from(new Set(steps));
  return unique.length > 0 ? unique : [...DEFAULT_WORKFLOW];
}

function ensureWorkflow(workflow: string[] | undefined): string[] {
  const cleaned = (workflow ?? []).map(normalizeWorkflowStep).filter(Boolean);
  const unique = Array.from(new Set(cleaned));
  return unique.length > 0 ? unique : [...DEFAULT_WORKFLOW];
}

function formatWorkflowStep(step: string): string {
  const text = step.replace(/_/g, " ").trim();
  if (!text) return "unknown";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isDoneStatus(status: string, workflow: string[]): boolean {
  const safeWorkflow = ensureWorkflow(workflow);
  return status === safeWorkflow[safeWorkflow.length - 1];
}

function nextStatusInWorkflow(current: string, workflow: string[]): string {
  const safeWorkflow = ensureWorkflow(workflow);
  const currentIndex = safeWorkflow.indexOf(current);
  if (currentIndex === -1) return safeWorkflow[0];
  if (currentIndex >= safeWorkflow.length - 1) return current;
  return safeWorkflow[currentIndex + 1];
}

function priorityTone(priority: Priority): string {
  if (priority === "High") return "text-rose-200 border-rose-300/35 bg-rose-500/20";
  if (priority === "Medium") return "text-amber-100 border-amber-300/35 bg-amber-500/20";
  return "text-slate-200 border-slate-300/35 bg-slate-500/20";
}

function taskStatusTone(status: string, workflow: string[]): string {
  if (isDoneStatus(status, workflow)) return "text-emerald-200 border-emerald-300/35 bg-emerald-500/20";
  const normalized = status.toLowerCase();
  if (normalized.includes("progress") || normalized.includes("review") || normalized.includes("doing")) {
    return "text-sky-200 border-sky-300/35 bg-sky-500/20";
  }
  return "text-slate-200 border-slate-300/35 bg-slate-500/20";
}

function projectStatusTone(status: ProjectStatus): string {
  if (status === "active") return "text-emerald-200 border-emerald-300/35 bg-emerald-500/20";
  if (status === "paused") return "text-amber-100 border-amber-300/35 bg-amber-500/20";
  return "text-slate-200 border-slate-300/35 bg-slate-500/20";
}

function progressPercent(done: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

function dueState(dueDate: string, isDone: boolean): DueState {
  if (isDone) return "normal";
  const today = todayIsoDate();
  const soonThreshold = isoDateFromOffset(2);
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  if (dueDate <= soonThreshold) return "soon";
  return "normal";
}

function dueTone(state: DueState): string {
  if (state === "overdue") return "bg-rose-500/20 text-rose-100 border border-rose-300/35";
  if (state === "today") return "bg-amber-500/20 text-amber-100 border border-amber-300/35";
  if (state === "soon") return "bg-sky-500/20 text-sky-100 border border-sky-300/35";
  return "text-text-muted";
}

function dueLabel(state: DueState): string {
  if (state === "overdue") return "Overdue";
  if (state === "today") return "Today";
  if (state === "soon") return "Soon";
  return "";
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b);
}

function createSeedState(): DashboardState {
  const projectA: Project = {
    id: createId(),
    name: "Product Launch Hub",
    owner: "Maya Li",
    status: "active",
    workflow: ["todo", "in_progress", "review", "done"],
    createdAt: isoNow(),
  };
  const projectB: Project = {
    id: createId(),
    name: "Mobile Polish Sprint",
    owner: "Kai Patel",
    status: "active",
    workflow: ["backlog", "doing", "done"],
    createdAt: isoNow(),
  };
  const projectC: Project = {
    id: createId(),
    name: "Billing Migration",
    owner: "Owen Ross",
    status: "paused",
    workflow: [...DEFAULT_WORKFLOW],
    createdAt: isoNow(),
  };

  const tasks: Task[] = [
    {
      id: createId(),
      projectId: projectA.id,
      title: "Finalize roadmap v2",
      assignee: "Maya Li",
      dueDate: isoDateFromOffset(0),
      priority: "High",
      status: "in_progress",
      createdAt: isoNow(),
    },
    {
      id: createId(),
      projectId: projectA.id,
      title: "Schedule stakeholder walkthrough",
      assignee: "Chloe West",
      dueDate: isoDateFromOffset(2),
      priority: "Medium",
      status: "todo",
      createdAt: isoNow(),
    },
    {
      id: createId(),
      projectId: projectB.id,
      title: "Ship settings screen QA fixes",
      assignee: "Aiden Cole",
      dueDate: isoDateFromOffset(1),
      priority: "High",
      status: "backlog",
      createdAt: isoNow(),
    },
    {
      id: createId(),
      projectId: projectB.id,
      title: "Accessibility pass for navigation",
      assignee: "Kai Patel",
      dueDate: isoDateFromOffset(7),
      priority: "Low",
      status: "done",
      createdAt: isoNow(),
    },
    {
      id: createId(),
      projectId: projectC.id,
      title: "Review API contract updates",
      assignee: "Owen Ross",
      dueDate: isoDateFromOffset(-1),
      priority: "High",
      status: "todo",
      createdAt: isoNow(),
    },
  ];

  return {
    projects: [projectA, projectB, projectC],
    tasks,
  };
}

function sanitizeStoredState(raw: unknown): DashboardState | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Partial<DashboardState>;
  if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.tasks)) {
    return null;
  }

  const projects: Project[] = parsed.projects
    .map((project) => {
      if (!project || typeof project !== "object") return null;
      if (
        typeof project.id !== "string" ||
        typeof project.name !== "string" ||
        typeof project.owner !== "string" ||
        typeof project.createdAt !== "string"
      ) {
        return null;
      }
      if (project.status !== "active" && project.status !== "paused" && project.status !== "completed") {
        return null;
      }
      return {
        id: project.id,
        name: project.name,
        owner: project.owner,
        status: project.status,
        workflow: ensureWorkflow(project.workflow),
        createdAt: project.createdAt,
      };
    })
    .filter((project): project is Project => Boolean(project));

  const projectIds = new Set(projects.map((project) => project.id));

  const tasks: Task[] = parsed.tasks
    .map((task) => {
      if (!task || typeof task !== "object") return null;
      if (
        typeof task.id !== "string" ||
        typeof task.projectId !== "string" ||
        typeof task.title !== "string" ||
        typeof task.assignee !== "string" ||
        typeof task.dueDate !== "string" ||
        typeof task.createdAt !== "string" ||
        typeof task.status !== "string"
      ) {
        return null;
      }
      if (task.priority !== "High" && task.priority !== "Medium" && task.priority !== "Low") {
        return null;
      }
      if (!projectIds.has(task.projectId)) {
        return null;
      }
      return {
        id: task.id,
        projectId: task.projectId,
        title: task.title,
        assignee: task.assignee,
        dueDate: task.dueDate,
        priority: task.priority,
        status: normalizeWorkflowStep(task.status) || DEFAULT_WORKFLOW[0],
        createdAt: task.createdAt,
      };
    })
    .filter((task): task is Task => Boolean(task));

  return { projects, tasks };
}

function loadInitialState(): DashboardState {
  if (typeof window === "undefined") return createSeedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = sanitizeStoredState(JSON.parse(raw));
    return parsed ?? createSeedState();
  } catch {
    return createSeedState();
  }
}

const priorityRank: Record<Priority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

export default function SaaSProjectManagementDashboardTemplate() {
  const [dashboard, setDashboard] = useState<DashboardState>(() => loadInitialState());
  const [currentUser, setCurrentUser] = useState<string>(() => {
    if (typeof window === "undefined") return TEAM_MEMBERS[0];
    return window.localStorage.getItem(CURRENT_USER_KEY) ?? TEAM_MEMBERS[0];
  });
  const [isCreateProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [isWorkflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [pendingAdvanceTaskId, setPendingAdvanceTaskId] = useState<string | null>(null);
  const [pendingRemoveTaskId, setPendingRemoveTaskId] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectOwner, setProjectOwner] = useState<string>(TEAM_MEMBERS[0]);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("active");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState<string>(TEAM_MEMBERS[0]);
  const [taskPriority, setTaskPriority] = useState<Priority>("Medium");
  const [taskDueDate, setTaskDueDate] = useState(isoDateFromOffset(2));
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskFilterProjectId, setTaskFilterProjectId] = useState("all");
  const [workflowProjectId, setWorkflowProjectId] = useState("");
  const [workflowDraft, setWorkflowDraft] = useState(DEFAULT_WORKFLOW.join(", "));
  const [workflowError, setWorkflowError] = useState("");
  const [taskSort, setTaskSort] = useState<{ key: TaskSortKey; direction: SortDirection }>({
    key: "due",
    direction: "asc",
  });

  useEffect(() => {
    if (!taskProjectId && dashboard.projects.length > 0) {
      setTaskProjectId(dashboard.projects[0].id);
      return;
    }
    if (taskProjectId && !dashboard.projects.some((project) => project.id === taskProjectId)) {
      setTaskProjectId(dashboard.projects[0]?.id ?? "");
    }
  }, [dashboard.projects, taskProjectId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboard));
  }, [dashboard]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CURRENT_USER_KEY, currentUser);
  }, [currentUser]);

  const projectById = useMemo(
    () => new Map(dashboard.projects.map((project) => [project.id, project])),
    [dashboard.projects]
  );

  const tasksWithProject = useMemo(
    () =>
      dashboard.tasks
        .map((task) => ({
          task,
          project: projectById.get(task.projectId),
        }))
        .filter((item): item is { task: Task; project: Project } => Boolean(item.project)),
    [dashboard.tasks, projectById]
  );

  const filteredTasks = useMemo(() => {
    const scoped = tasksWithProject.filter(
      (item) => taskFilterProjectId === "all" || item.project.id === taskFilterProjectId
    );
    return [...scoped].sort((a, b) => {
      let result = 0;

      if (taskSort.key === "task") {
        result = compareText(a.task.title.toLowerCase(), b.task.title.toLowerCase());
      }
      if (taskSort.key === "project") {
        result = compareText(a.project.name.toLowerCase(), b.project.name.toLowerCase());
      }
      if (taskSort.key === "due") {
        result = compareText(a.task.dueDate, b.task.dueDate);
      }
      if (taskSort.key === "priority") {
        result = priorityRank[a.task.priority] - priorityRank[b.task.priority];
      }
      if (taskSort.key === "status") {
        const aStatusIndex = ensureWorkflow(a.project.workflow).indexOf(a.task.status);
        const bStatusIndex = ensureWorkflow(b.project.workflow).indexOf(b.task.status);
        const aRank = aStatusIndex === -1 ? Number.MAX_SAFE_INTEGER : aStatusIndex;
        const bRank = bStatusIndex === -1 ? Number.MAX_SAFE_INTEGER : bStatusIndex;
        result = aRank - bRank;
      }

      if (result === 0) {
        result = compareText(a.task.title.toLowerCase(), b.task.title.toLowerCase());
      }

      return taskSort.direction === "asc" ? result : -result;
    });
  }, [taskFilterProjectId, taskSort, tasksWithProject]);

  const projectProgress = useMemo(
    () =>
      dashboard.projects.map((project) => {
        const relatedTasks = dashboard.tasks.filter((task) => task.projectId === project.id);
        const doneCount = relatedTasks.filter((task) => isDoneStatus(task.status, project.workflow)).length;
        return {
          project,
          doneCount,
          totalCount: relatedTasks.length,
          percent: progressPercent(doneCount, relatedTasks.length),
        };
      }),
    [dashboard.projects, dashboard.tasks]
  );

  const workload = useMemo(() => {
    const map = new Map<string, { owner: string; active: number; done: number }>();
    for (const { task, project } of tasksWithProject) {
      const current = map.get(task.assignee) ?? { owner: task.assignee, active: 0, done: 0 };
      if (isDoneStatus(task.status, project.workflow)) current.done += 1;
      else current.active += 1;
      map.set(task.assignee, current);
    }
    return Array.from(map.values()).sort((a, b) => b.active - a.active || b.done - a.done);
  }, [tasksWithProject]);

  const teamMembers = useMemo(
    () =>
      Array.from(
        new Set([
          ...TEAM_MEMBERS,
          ...dashboard.projects.map((project) => project.owner),
          ...dashboard.tasks.map((task) => task.assignee),
        ])
      ).sort(),
    [dashboard.projects, dashboard.tasks]
  );

  useEffect(() => {
    if (!teamMembers.includes(currentUser)) {
      setCurrentUser(teamMembers[0] ?? TEAM_MEMBERS[0]);
    }
  }, [currentUser, teamMembers]);

  const memberLabel = (name: string): string => (name === currentUser ? `${name} (Me)` : name);
  const myTasksCount = tasksWithProject.filter((item) => item.task.assignee === currentUser).length;
  const myOpenTasksCount = tasksWithProject.filter(
    (item) => item.task.assignee === currentUser && !isDoneStatus(item.task.status, item.project.workflow)
  ).length;

  const activeProjects = dashboard.projects.filter((project) => project.status === "active").length;
  const completedTasks = tasksWithProject.filter((item) =>
    isDoneStatus(item.task.status, item.project.workflow)
  ).length;
  const completionRate = progressPercent(completedTasks, tasksWithProject.length);
  const overdueTasks = tasksWithProject.filter(
    (item) => dueState(item.task.dueDate, isDoneStatus(item.task.status, item.project.workflow)) === "overdue"
  ).length;

  const kpis = [
    { label: "Active Projects", value: String(activeProjects), change: `${dashboard.projects.length} total` },
    { label: "Tasks Completed", value: String(completedTasks), change: `${tasksWithProject.length} tracked` },
    { label: "Completion Rate", value: `${completionRate}%`, change: "Across all tasks" },
    { label: "Overdue Tasks", value: String(overdueTasks), change: overdueTasks > 0 ? "Needs attention" : "All clear" },
  ];

  const workflowProject = dashboard.projects.find((project) => project.id === workflowProjectId) ?? null;

  const pendingAdvanceItem = pendingAdvanceTaskId
    ? tasksWithProject.find((item) => item.task.id === pendingAdvanceTaskId) ?? null
    : null;

  const pendingRemoveItem = pendingRemoveTaskId
    ? tasksWithProject.find((item) => item.task.id === pendingRemoveTaskId) ?? null
    : null;

  function toggleTaskSort(key: TaskSortKey) {
    setTaskSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }

  function sortIndicator(key: TaskSortKey): string {
    if (taskSort.key !== key) return "";
    return taskSort.direction === "asc" ? "^" : "v";
  }

  function openWorkflowModal(projectId: string) {
    const project = dashboard.projects.find((item) => item.id === projectId);
    if (!project) return;
    setWorkflowProjectId(project.id);
    setWorkflowDraft(ensureWorkflow(project.workflow).join(", "));
    setWorkflowError("");
    setWorkflowModalOpen(true);
  }

  function handleSaveWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const project = dashboard.projects.find((item) => item.id === workflowProjectId);
    if (!project) return;

    const parsed = parseWorkflowDraft(workflowDraft);
    if (parsed.length < 2) {
      setWorkflowError("Workflow needs at least 2 steps.");
      return;
    }

    setDashboard((prev) => ({
      ...prev,
      projects: prev.projects.map((item) =>
        item.id === project.id ? { ...item, workflow: parsed } : item
      ),
      tasks: prev.tasks.map((task) => {
        if (task.projectId !== project.id) return task;
        if (parsed.includes(task.status)) return task;
        return { ...task, status: parsed[0] };
      }),
    }));
    setWorkflowModalOpen(false);
  }

  function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) return;
    const nextProject: Project = {
      id: createId(),
      name,
      owner: projectOwner,
      status: projectStatus,
      workflow: [...DEFAULT_WORKFLOW],
      createdAt: isoNow(),
    };

    setDashboard((prev) => ({
      ...prev,
      projects: [nextProject, ...prev.projects],
    }));
    setProjectName("");
    setProjectOwner(currentUser);
    setProjectStatus("active");
    setTaskProjectId(nextProject.id);
    setCreateProjectModalOpen(false);
  }

  function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = taskTitle.trim();
    const assignee = taskAssignee;
    if (!title || !taskProjectId) return;

    const project = dashboard.projects.find((item) => item.id === taskProjectId);
    if (!project) return;
    const workflow = ensureWorkflow(project.workflow);

    const nextTask: Task = {
      id: createId(),
      projectId: taskProjectId,
      title,
      assignee,
      dueDate: taskDueDate,
      priority: taskPriority,
      status: workflow[0],
      createdAt: isoNow(),
    };

    setDashboard((prev) => ({
      ...prev,
      tasks: [nextTask, ...prev.tasks],
    }));
    setTaskTitle("");
    setTaskAssignee(currentUser);
    setTaskPriority("Medium");
    setTaskDueDate(isoDateFromOffset(2));
    setCreateTaskModalOpen(false);
  }

  function archiveProject(projectId: string) {
    setDashboard((prev) => ({
      ...prev,
      projects: prev.projects.map((item) =>
        item.id === projectId ? { ...item, status: "completed" as const } : item
      ),
    }));
  }

  function requestAdvanceTask(taskId: string) {
    setPendingAdvanceTaskId(taskId);
  }

  function confirmAdvanceTask() {
    if (!pendingAdvanceItem) return;
    setDashboard((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => {
        if (task.id !== pendingAdvanceItem.task.id) return task;
        const project = prev.projects.find((item) => item.id === task.projectId);
        const nextStatus = nextStatusInWorkflow(task.status, ensureWorkflow(project?.workflow));
        return { ...task, status: nextStatus };
      }),
    }));
    setPendingAdvanceTaskId(null);
  }

  function requestRemoveTask(taskId: string) {
    setPendingRemoveTaskId(taskId);
  }

  function confirmRemoveTask() {
    if (!pendingRemoveItem) return;
    setDashboard((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((item) => item.id !== pendingRemoveItem.task.id),
    }));
    setPendingRemoveTaskId(null);
  }

  function resetDemoData() {
    setDashboard(createSeedState());
    setTaskSort({ key: "due", direction: "asc" });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-panel/65 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Current User</h2>
            <p className="text-xs text-text-muted">
              Use this to mark who is Me across assignee labels and highlights.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-text-muted">
              Me
              <select
                className="ml-2 rounded-md border border-border bg-surface/70 px-2 py-1 text-xs text-text-primary"
                value={currentUser}
                onChange={(event) => setCurrentUser(event.target.value)}
              >
                {teamMembers.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
            </label>
            <span className="rounded-full border border-accent/35 bg-accent/15 px-2 py-1 text-xs text-accent">
              My tasks: {myTasksCount} total / {myOpenTasksCount} open
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <article
            key={item.label}
            className="rounded-xl border border-border bg-panel/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">{item.value}</p>
            <p className="mt-1 text-xs text-emerald-300">{item.change}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border border-border bg-panel/65 p-4">
          <h2 className="text-base font-semibold">Projects</h2>
          <p className="mt-1 text-xs text-text-muted">
            Create projects, customize workflow, and track progress by board.
          </p>

          <div className="mt-4 space-y-3">
            {projectProgress.map((item) => {
              const isMine = item.project.owner === currentUser;
              const workflowText = ensureWorkflow(item.project.workflow)
                .map((step) => formatWorkflowStep(step))
                .join(" -> ");
              return (
                <div
                  key={item.project.id}
                  className={`rounded-lg border p-3 ${isMine ? "border-accent/55 bg-accent/10" : "border-border-subtle bg-surface/45"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{item.project.name}</p>
                      <p className="text-xs text-text-muted">
                        Owner: {memberLabel(item.project.owner)} {isMine ? "| Your project" : ""} |{" "}
                        {item.totalCount} tasks
                      </p>
                      <p className="mt-1 text-[11px] text-text-muted">Workflow: {workflowText}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${projectStatusTone(item.project.status)}`}
                    >
                      {item.project.status}
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-bg">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                    <span>
                      {item.doneCount}/{item.totalCount} done ({item.percent}%)
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        onClick={() => openWorkflowModal(item.project.id)}
                      >
                        Workflow
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        disabled={item.project.status === "completed"}
                        onClick={() => archiveProject(item.project.id)}
                      >
                        Archive
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-panel/65 p-4">
          <h2 className="text-base font-semibold">Project Actions</h2>
          <p className="mt-1 text-xs text-text-muted">Create new items and reset local demo data.</p>
          <div className="mt-4 space-y-2">
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setProjectOwner(currentUser);
                setCreateProjectModalOpen(true);
              }}
            >
              New Project
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={resetDemoData}
            >
              Reset Demo Data
            </Button>
          </div>

          <div className="mt-4 rounded-lg border border-border-subtle bg-surface/45 p-3 text-xs text-text-muted">
            <p>Selected user: {memberLabel(currentUser)}</p>
            <p className="mt-1">Tasks assigned to me are highlighted in the queue.</p>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-xl border border-border bg-panel/65 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">Task Queue</h2>
              <p className="text-xs text-text-muted">Click headers to sort. Due dates show urgency.</p>
            </div>
            <label className="text-xs text-text-muted">
              Scope
              <select
                className="ml-2 rounded-md border border-border bg-surface/70 px-2 py-1 text-xs text-text-primary"
                value={taskFilterProjectId}
                onChange={(event) => setTaskFilterProjectId(event.target.value)}
              >
                <option value="all">All Projects</option>
                {dashboard.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mb-4">
            <Button
              type="button"
              className="w-full"
              disabled={dashboard.projects.length === 0}
              onClick={() => {
                setTaskAssignee(currentUser);
                setCreateTaskModalOpen(true);
              }}
            >
              New Task
            </Button>
            {dashboard.projects.length === 0 && (
              <p className="mt-2 text-xs text-text-muted">
                Create a project first to enable task creation.
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-border-subtle">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface/60 text-xs uppercase tracking-[0.12em] text-text-muted">
                <tr>
                  <th className="px-3 py-2">
                    <button type="button" className="hover:text-text-primary" onClick={() => toggleTaskSort("task")}>
                      Task {sortIndicator("task")}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button type="button" className="hover:text-text-primary" onClick={() => toggleTaskSort("project")}>
                      Project {sortIndicator("project")}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button type="button" className="hover:text-text-primary" onClick={() => toggleTaskSort("due")}>
                      Due {sortIndicator("due")}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button type="button" className="hover:text-text-primary" onClick={() => toggleTaskSort("priority")}>
                      Priority {sortIndicator("priority")}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button type="button" className="hover:text-text-primary" onClick={() => toggleTaskSort("status")}>
                      Status {sortIndicator("status")}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 && (
                  <tr className="border-t border-border-subtle">
                    <td className="px-3 py-3 text-xs text-text-muted" colSpan={6}>
                      No tasks in this scope.
                    </td>
                  </tr>
                )}
                {filteredTasks.map((item) => {
                  const isMine = item.task.assignee === currentUser;
                  const isDone = isDoneStatus(item.task.status, item.project.workflow);
                  const due = dueState(item.task.dueDate, isDone);
                  const nextStatus = nextStatusInWorkflow(item.task.status, item.project.workflow);
                  const canAdvance = nextStatus !== item.task.status;
                  return (
                    <tr
                      key={item.task.id}
                      className={`border-t ${isMine ? "border-accent/35 bg-accent/10" : "border-border-subtle"}`}
                    >
                      <td className="px-3 py-2 text-text-secondary">
                        <p>{item.task.title}</p>
                        <p className="text-xs text-text-muted">
                          {memberLabel(item.task.assignee)}
                          {isMine ? " | Assigned to me" : ""}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-text-muted">{item.project.name}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-md px-1.5 py-0.5 text-xs ${dueTone(due)}`}>
                          {formatIsoDate(item.task.dueDate)}
                          {dueLabel(due) ? ` (${dueLabel(due)})` : ""}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${priorityTone(item.task.priority)}`}
                        >
                          {item.task.priority}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${taskStatusTone(item.task.status, item.project.workflow)}`}
                        >
                          {formatWorkflowStep(item.task.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            className="px-2 py-1 text-xs"
                            disabled={!canAdvance}
                            onClick={() => requestAdvanceTask(item.task.id)}
                          >
                            Advance
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="px-2 py-1 text-xs text-rose-200 hover:text-rose-100"
                            onClick={() => requestRemoveTask(item.task.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-panel/65 p-4">
            <h2 className="text-base font-semibold">Team Workload</h2>
            <p className="mt-1 text-xs text-text-muted">Open vs completed task counts.</p>
            <div className="mt-3 space-y-2">
              {workload.length === 0 && <p className="text-xs text-text-muted">No team members yet.</p>}
              {workload.map((member) => (
                <div
                  key={member.owner}
                  className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface/45 px-3 py-2"
                >
                  <p className="text-xs text-text-secondary">{memberLabel(member.owner)}</p>
                  <p className="text-xs text-text-muted">
                    {member.active} active | {member.done} done
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={isCreateProjectModalOpen}
        title="Create Project"
        onClose={() => setCreateProjectModalOpen(false)}
      >
        <form className="space-y-3" onSubmit={handleCreateProject}>
          <Input
            placeholder="Project name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
          />
          <label className="block text-xs text-text-muted">
            Owner
            <select
              className="mt-1 w-full rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent/60"
              value={projectOwner}
              onChange={(event) => setProjectOwner(event.target.value)}
            >
              {teamMembers.map((member) => (
                <option key={member} value={member}>
                  {memberLabel(member)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-text-muted">
            Status
            <select
              className="mt-1 w-full rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent/60"
              value={projectStatus}
              onChange={(event) => setProjectStatus(event.target.value as ProjectStatus)}
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="completed">completed</option>
            </select>
          </label>
          <p className="text-xs text-text-muted">
            Default workflow: Todo {"->"} In progress {"->"} Done.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setCreateProjectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isCreateTaskModalOpen}
        title="Create Task"
        onClose={() => setCreateTaskModalOpen(false)}
      >
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleCreateTask}>
          <Input
            placeholder="Task title"
            className="sm:col-span-2"
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
          />
          <label className="text-xs text-text-muted">
            Assignee
            <select
              className="mt-1 w-full rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent/60"
              value={taskAssignee}
              onChange={(event) => setTaskAssignee(event.target.value)}
            >
              {teamMembers.map((member) => (
                <option key={member} value={member}>
                  {memberLabel(member)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-text-muted">
            Project
            <select
              className="mt-1 w-full rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent/60"
              value={taskProjectId}
              onChange={(event) => setTaskProjectId(event.target.value)}
              disabled={dashboard.projects.length === 0}
            >
              {dashboard.projects.length === 0 && <option value="">No projects yet</option>}
              {dashboard.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-text-muted">
            Due date
            <Input
              type="date"
              className="mt-1"
              value={taskDueDate}
              onChange={(event) => setTaskDueDate(event.target.value)}
            />
          </label>
          <label className="text-xs text-text-muted">
            Priority
            <select
              className="mt-1 w-full rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent/60"
              value={taskPriority}
              onChange={(event) => setTaskPriority(event.target.value as Priority)}
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setCreateTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={dashboard.projects.length === 0}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isWorkflowModalOpen}
        title="Edit Project Workflow"
        onClose={() => setWorkflowModalOpen(false)}
      >
        <form className="space-y-3" onSubmit={handleSaveWorkflow}>
          <p className="text-xs text-text-muted">Project: {workflowProject?.name ?? "Unknown"}</p>
          <label className="block text-xs text-text-muted">
            Workflow steps (comma separated)
            <Input
              className="mt-1"
              value={workflowDraft}
              onChange={(event) => {
                setWorkflowDraft(event.target.value);
                setWorkflowError("");
              }}
              placeholder="todo, in_progress, done"
            />
          </label>
          <p className="text-xs text-text-muted">Example: backlog, in_progress, in_review, done</p>
          {workflowError && <p className="text-xs text-rose-200">{workflowError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setWorkflowModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Workflow</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(pendingAdvanceItem)}
        title="Confirm Advance"
        description={
          pendingAdvanceItem
            ? `Move "${pendingAdvanceItem.task.title}" from ${formatWorkflowStep(pendingAdvanceItem.task.status)} to ${formatWorkflowStep(
                nextStatusInWorkflow(pendingAdvanceItem.task.status, pendingAdvanceItem.project.workflow)
              )}?`
            : ""
        }
        confirmLabel="Advance Task"
        onCancel={() => setPendingAdvanceTaskId(null)}
        onConfirm={confirmAdvanceTask}
      />

      <ConfirmModal
        open={Boolean(pendingRemoveItem)}
        title="Confirm Remove"
        description={
          pendingRemoveItem
            ? `Remove task "${pendingRemoveItem.task.title}" from ${pendingRemoveItem.project.name}?`
            : ""
        }
        confirmLabel="Remove Task"
        tone="danger"
        onCancel={() => setPendingRemoveTaskId(null)}
        onConfirm={confirmRemoveTask}
      />
    </div>
  );
}

