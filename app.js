const STORAGE_KEY = "jobSearchAssistant.v1";

const defaultState = {
  profile: {
    targetRole: "",
    locationPreference: "",
    candidateName: "",
    candidateEmail: "",
    skills: "",
    experience: "",
    summary: "",
  },
  jobs: [],
  selectedJobId: "",
};

let state = loadState();

const views = document.querySelectorAll(".view");
const navItems = document.querySelectorAll(".nav-item");
const emptyTemplate = document.querySelector("#emptyState");

const fields = {
  targetRole: document.querySelector("#targetRole"),
  locationPreference: document.querySelector("#locationPreference"),
  candidateName: document.querySelector("#candidateName"),
  candidateEmail: document.querySelector("#candidateEmail"),
  skills: document.querySelector("#skills"),
  experience: document.querySelector("#experience"),
  summary: document.querySelector("#summary"),
  company: document.querySelector("#company"),
  role: document.querySelector("#role"),
  applyLink: document.querySelector("#applyLink"),
  jobStatus: document.querySelector("#jobStatus"),
  jobDescription: document.querySelector("#jobDescription"),
  tailorJob: document.querySelector("#tailorJob"),
  resumeDraft: document.querySelector("#resumeDraft"),
  coverDraft: document.querySelector("#coverDraft"),
};

document.querySelector("#saveProfile").addEventListener("click", saveProfile);
document.querySelector("#saveJob").addEventListener("click", saveJob);
document.querySelector("#clearJobForm").addEventListener("click", clearJobForm);
document.querySelector("#generateDraft").addEventListener("click", generateDraft);
document.querySelector("#markApplied").addEventListener("click", markSelectedApplied);
document.querySelector("#exportData").addEventListener("click", exportData);
document.querySelector("#importData").addEventListener("change", importData);

document.querySelectorAll("[data-jump]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.jump));
});

navItems.forEach((item) => {
  item.addEventListener("click", () => showView(item.dataset.view));
});

hydrateProfile();
render();

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return structuredClone(defaultState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showView(viewId) {
  views.forEach((view) => view.classList.toggle("active", view.id === viewId));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
}

function hydrateProfile() {
  Object.entries(state.profile).forEach(([key, value]) => {
    if (fields[key]) fields[key].value = value;
  });
}

function saveProfile() {
  Object.keys(state.profile).forEach((key) => {
    state.profile[key] = fields[key].value.trim();
  });
  persist();
  render();
}

function saveJob() {
  const company = fields.company.value.trim();
  const role = fields.role.value.trim();
  const description = fields.jobDescription.value.trim();

  if (!company || !role || !description) {
    alert("Add a company, role, and job description before saving.");
    return;
  }

  const existingId = fields.company.dataset.editingId;
  const job = {
    id: existingId || crypto.randomUUID(),
    company,
    role,
    applyLink: fields.applyLink.value.trim(),
    status: fields.jobStatus.value,
    description,
    createdAt: existingId
      ? state.jobs.find((item) => item.id === existingId)?.createdAt
      : new Date().toISOString(),
    resumeDraft: existingId
      ? state.jobs.find((item) => item.id === existingId)?.resumeDraft || ""
      : "",
    coverDraft: existingId
      ? state.jobs.find((item) => item.id === existingId)?.coverDraft || ""
      : "",
  };

  state.jobs = existingId
    ? state.jobs.map((item) => (item.id === existingId ? job : item))
    : [job, ...state.jobs];
  state.selectedJobId = job.id;
  persist();
  clearJobForm();
  render();
}

function clearJobForm() {
  fields.company.value = "";
  fields.role.value = "";
  fields.applyLink.value = "";
  fields.jobStatus.value = "Saved";
  fields.jobDescription.value = "";
  delete fields.company.dataset.editingId;
}

function render() {
  renderMetrics();
  renderJobs();
  renderTailorOptions();
  renderQueue();
  renderToday();
}

function renderMetrics() {
  const scores = state.jobs.map((job) => scoreJob(job).score);
  const average = scores.length
    ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
    : 0;

  document.querySelector("#savedJobsCount").textContent = state.jobs.length;
  document.querySelector("#queuedAppsCount").textContent = state.jobs.filter(
    (job) => job.status === "Queued",
  ).length;
  document.querySelector("#appliedCount").textContent = state.jobs.filter(
    (job) => job.status === "Applied",
  ).length;
  document.querySelector("#avgMatchScore").textContent = `${average}%`;
}

function renderJobs() {
  const list = document.querySelector("#jobsList");
  list.replaceChildren();

  if (!state.jobs.length) {
    list.append(emptyTemplate.content.cloneNode(true));
    return;
  }

  state.jobs.forEach((job) => list.append(createJobCard(job, true)));
}

function renderTailorOptions() {
  fields.tailorJob.replaceChildren();
  state.jobs.forEach((job) => {
    const option = document.createElement("option");
    option.value = job.id;
    option.textContent = `${job.role} at ${job.company}`;
    fields.tailorJob.append(option);
  });

  if (state.selectedJobId) fields.tailorJob.value = state.selectedJobId;
  renderMatchSummary();
}

function renderQueue() {
  const list = document.querySelector("#queueList");
  const queued = state.jobs.filter((job) => ["Queued", "Applied"].includes(job.status));
  list.replaceChildren();

  if (!queued.length) {
    list.append(emptyTemplate.content.cloneNode(true));
    return;
  }

  queued.forEach((job) => list.append(createJobCard(job, false)));
}

function renderToday() {
  const list = document.querySelector("#todayList");
  list.replaceChildren();

  const needsWork = state.jobs
    .filter((job) => job.status !== "Applied" && job.status !== "Rejected")
    .slice(0, 5);

  if (!needsWork.length) {
    list.append(emptyTemplate.content.cloneNode(true));
    return;
  }

  needsWork.forEach((job) => list.append(createJobCard(job, false)));
}

function createJobCard(job, editable) {
  const card = document.createElement("article");
  card.className = "job-card";

  const score = scoreJob(job).score;
  card.innerHTML = `
    <header>
      <div>
        <h3>${escapeHtml(job.role)} at ${escapeHtml(job.company)}</h3>
        <p>${truncate(job.description, 180)}</p>
      </div>
      <span class="pill">${job.status} · ${score}% match</span>
    </header>
    <div class="card-actions"></div>
  `;

  const actions = card.querySelector(".card-actions");
  actions.append(actionButton("Tailor", () => {
    state.selectedJobId = job.id;
    persist();
    renderTailorOptions();
    showView("tailor");
  }));

  if (job.applyLink) {
    actions.append(actionButton("Open apply link", () => window.open(job.applyLink, "_blank")));
  }

  if (editable) {
    actions.append(actionButton("Edit", () => editJob(job), "secondary"));
    actions.append(actionButton("Delete", () => deleteJob(job.id), "danger"));
  }

  const checkbox = document.createElement("label");
  checkbox.className = "select-row";
  checkbox.innerHTML = `<input type="checkbox" data-queue-id="${job.id}" /> Select`;
  actions.append(checkbox);

  return card;
}

function actionButton(label, onClick, className = "secondary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function editJob(job) {
  fields.company.value = job.company;
  fields.role.value = job.role;
  fields.applyLink.value = job.applyLink;
  fields.jobStatus.value = job.status;
  fields.jobDescription.value = job.description;
  fields.company.dataset.editingId = job.id;
  showView("jobs");
}

function deleteJob(id) {
  state.jobs = state.jobs.filter((job) => job.id !== id);
  if (state.selectedJobId === id) state.selectedJobId = "";
  persist();
  render();
}

function generateDraft() {
  const job = currentTailorJob();
  if (!job) {
    alert("Add a job before generating a tailored draft.");
    return;
  }

  saveProfile();
  const analysis = scoreJob(job);
  const profile = state.profile;
  const keywords = analysis.matched.concat(analysis.missing).slice(0, 12);
  const bullets = splitLines(profile.experience).slice(0, 6);
  const tailoredBullets = bullets.map((bullet) => {
    const keyword = keywords.find((item) => !bullet.toLowerCase().includes(item.toLowerCase()));
    return keyword ? `${bullet} Emphasize ${keyword}.` : bullet;
  });

  const resumeDraft = [
    `${profile.candidateName || "Candidate"} · ${profile.candidateEmail || "email@example.com"}`,
    `${profile.targetRole || job.role} · ${profile.locationPreference || "Location flexible"}`,
    "",
    "SUMMARY",
    profile.summary ||
      `Experienced candidate targeting ${job.role} roles with strengths aligned to ${job.company}'s needs.`,
    "",
    "TARGETED SKILLS",
    keywords.length ? keywords.join(" · ") : profile.skills,
    "",
    "EXPERIENCE HIGHLIGHTS",
    ...tailoredBullets.map((bullet) => `- ${bullet}`),
  ].join("\n");

  const coverDraft = [
    `Dear ${job.company} hiring team,`,
    "",
    `I am excited to apply for the ${job.role} role. My background in ${profile.skills || "the required skills"} aligns strongly with the work described in your posting, especially ${analysis.matched.slice(0, 4).join(", ") || "the core responsibilities of the role"}.`,
    "",
    `In my recent work, I have ${splitLines(profile.experience)[0] || "delivered measurable outcomes across complex projects"}. I would bring that same practical, outcome-oriented approach to ${job.company}.`,
    "",
    "Thank you for your time and consideration. I would welcome the chance to discuss how my experience maps to this role.",
    "",
    `Sincerely,\n${profile.candidateName || "Candidate"}`,
  ].join("\n");

  job.resumeDraft = resumeDraft;
  job.coverDraft = coverDraft;
  job.status = "Queued";
  state.selectedJobId = job.id;
  fields.resumeDraft.value = resumeDraft;
  fields.coverDraft.value = coverDraft;
  persist();
  render();
}

function renderMatchSummary() {
  const job = currentTailorJob();
  const box = document.querySelector("#matchSummary");
  if (!job) {
    box.innerHTML = "Add a saved job to see match analysis.";
    fields.resumeDraft.value = "";
    fields.coverDraft.value = "";
    return;
  }

  const analysis = scoreJob(job);
  fields.resumeDraft.value = job.resumeDraft || "";
  fields.coverDraft.value = job.coverDraft || "";
  box.innerHTML = `
    <strong>${analysis.score}% match</strong>
    <p>${analysis.matched.length} profile keywords found, ${analysis.missing.length} useful keywords to consider.</p>
    <div class="keyword-list">
      ${analysis.missing.slice(0, 12).map((word) => `<span class="keyword">${escapeHtml(word)}</span>`).join("")}
    </div>
  `;
}

fields.tailorJob.addEventListener("change", () => {
  state.selectedJobId = fields.tailorJob.value;
  persist();
  renderMatchSummary();
});

fields.resumeDraft.addEventListener("input", () => {
  const job = currentTailorJob();
  if (!job) return;
  job.resumeDraft = fields.resumeDraft.value;
  persist();
});

fields.coverDraft.addEventListener("input", () => {
  const job = currentTailorJob();
  if (!job) return;
  job.coverDraft = fields.coverDraft.value;
  persist();
});

function currentTailorJob() {
  const id = fields.tailorJob.value || state.selectedJobId;
  return state.jobs.find((job) => job.id === id) || state.jobs[0];
}

function markSelectedApplied() {
  const selected = [...document.querySelectorAll("[data-queue-id]:checked")].map(
    (item) => item.dataset.queueId,
  );

  state.jobs = state.jobs.map((job) =>
    selected.includes(job.id) ? { ...job, status: "Applied", appliedAt: new Date().toISOString() } : job,
  );
  persist();
  render();
}

function scoreJob(job) {
  const profileWords = keywordSet(
    `${state.profile.targetRole} ${state.profile.skills} ${state.profile.experience} ${state.profile.summary}`,
  );
  const jobWords = keywordSet(`${job.role} ${job.description}`);
  const matched = jobWords.filter((word) => profileWords.includes(word));
  const missing = jobWords.filter((word) => !profileWords.includes(word)).slice(0, 24);
  const score = jobWords.length ? Math.min(98, Math.round((matched.length / jobWords.length) * 100)) : 0;
  return { score, matched, missing };
}

function keywordSet(text) {
  const stop = new Set([
    "and",
    "the",
    "with",
    "for",
    "you",
    "our",
    "are",
    "that",
    "this",
    "from",
    "will",
    "your",
    "have",
    "has",
    "job",
    "role",
    "work",
  ]);

  return [...new Set(text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stop.has(word)))]
    .slice(0, 80);
}

function splitLines(value) {
  return value
    .split(/\n|;/)
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);
}

function truncate(value, length) {
  const safe = escapeHtml(value);
  return safe.length > length ? `${safe.slice(0, length)}...` : safe;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `job-search-assistant-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importData(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      state = { ...defaultState, ...JSON.parse(reader.result) };
      persist();
      hydrateProfile();
      render();
    } catch {
      alert("That file was not a valid export.");
    }
  });
  reader.readAsText(file);
}
