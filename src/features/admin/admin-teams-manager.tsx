"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Users, X } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { localizedField } from "@/types/domain";
import { LocalizedInput } from "@/features/admin/admin-project-form";
import { MediaUploader } from "@/features/admin/media-uploader";

type Localized = { en: string; ar: string; it: string };
type DepartmentRow = { id: string; name_en: string; name_ar?: string; name_it?: string };
type StudentRow = { id: string; display_name_en: string; display_name_ar: string | null; display_name_it: string | null; bio_en: string | null; bio_ar: string | null; bio_it: string | null; is_public_profile: boolean };
type TeamRow = { id: string; slug: string; name_en: string; name_ar: string | null; name_it: string | null; short_description_en: string | null; short_description_ar: string | null; short_description_it: string | null; department_id: string | null; graduation_year: number | null; image_path: string | null; is_public: boolean; status: "draft" | "published" | "archived"; team_members?: Array<{ student?: { id: string } | null }> };
type TeamDraft = { slug: string; name: Localized; description: Localized; departmentId: string; graduationYear: string; imagePath: string; isPublic: boolean; status: "draft" | "published" | "archived"; memberIds: string[] };
type StudentDraft = { name: Localized; bio: Localized; isPublicProfile: boolean };
const blankLocalized = (): Localized => ({ en: "", ar: "", it: "" });
const blankTeam = (): TeamDraft => ({ slug: "", name: blankLocalized(), description: blankLocalized(), departmentId: "", graduationYear: "", imagePath: "", isPublic: false, status: "draft", memberIds: [] });
const blankStudent = (): StudentDraft => ({ name: blankLocalized(), bio: blankLocalized(), isPublicProfile: false });
function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150); }

export function AdminTeamsManager({ locale }: { locale: Locale }) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamDraft, setTeamDraft] = useState<TeamDraft | null>(null);
  const [teamId, setTeamId] = useState("");
  const [studentDraft, setStudentDraft] = useState<StudentDraft | null>(null);
  const [studentId, setStudentId] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/teams", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error("load_failed");
      setTeams(result.teams ?? []); setStudents(result.students ?? []); setDepartments(result.departments ?? []);
    } catch { setError(t(locale, "admin.errorLoading")); }
    finally { setLoading(false); }
  }, [locale]);
  useEffect(() => { void load(); }, [load]);

  function editTeam(team?: TeamRow) {
    setError(""); setNotice("");
    if (!team) { setTeamId(""); setTeamDraft(blankTeam()); return; }
    setTeamId(team.id);
    setTeamDraft({ slug: team.slug, name: { en: team.name_en, ar: team.name_ar ?? "", it: team.name_it ?? "" }, description: { en: team.short_description_en ?? "", ar: team.short_description_ar ?? "", it: team.short_description_it ?? "" }, departmentId: team.department_id ?? "", graduationYear: team.graduation_year ? String(team.graduation_year) : "", imagePath: team.image_path ?? "", isPublic: team.is_public, status: team.status, memberIds: (team.team_members ?? []).map((item) => item.student?.id).filter((id): id is string => Boolean(id)) });
  }

  async function saveTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!teamDraft) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(teamId ? `/api/admin/teams/${teamId}` : "/api/admin/teams", { method: teamId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...teamDraft, departmentId: teamDraft.departmentId || null, graduationYear: teamDraft.graduationYear ? Number(teamDraft.graduationYear) : null, imagePath: teamDraft.imagePath || null }) });
      if (!response.ok) throw new Error("save_failed");
      setTeamDraft(null); setNotice(t(locale, "admin.teamSaved")); await load();
    } catch { setError(t(locale, "admin.projectSaveError")); }
    finally { setBusy(false); }
  }

  function editStudent(student?: StudentRow) {
    setError(""); setNotice("");
    if (!student) { setStudentId(""); setStudentDraft(blankStudent()); return; }
    setStudentId(student.id);
    setStudentDraft({ name: { en: student.display_name_en, ar: student.display_name_ar ?? "", it: student.display_name_it ?? "" }, bio: { en: student.bio_en ?? "", ar: student.bio_ar ?? "", it: student.bio_it ?? "" }, isPublicProfile: student.is_public_profile });
  }

  async function saveStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!studentDraft) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(studentId ? `/api/admin/students/${studentId}` : "/api/admin/students", { method: studentId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: studentDraft.name, bio: studentDraft.bio, isPublicProfile: studentDraft.isPublicProfile }) });
      if (!response.ok) throw new Error("save_failed");
      setStudentDraft(null); setNotice(t(locale, "admin.studentSaved")); await load();
    } catch { setError(t(locale, "admin.projectSaveError")); }
    finally { setBusy(false); }
  }

  function toggleMember(studentIdValue: string, checked: boolean) {
    if (!teamDraft) return;
    setTeamDraft({ ...teamDraft, memberIds: checked ? [...new Set([...teamDraft.memberIds, studentIdValue])] : teamDraft.memberIds.filter((id) => id !== studentIdValue) });
  }

  const visibleTeams = teams.filter((team) => [team.name_en, team.name_ar, team.name_it, team.slug].some((value) => value?.toLowerCase().includes(teamSearch.toLowerCase())));
  const visibleStudents = students.filter((student) => [student.display_name_en, student.display_name_ar, student.display_name_it].some((value) => value?.toLowerCase().includes(studentSearch.toLowerCase())));

  return (
    <div className="admin-teams-manager">
      <div className="admin-teams-actions"><button type="button" className="button button-red" onClick={() => editTeam()}><Plus size={16} />{t(locale, "admin.addTeam")}</button><button type="button" className="button button-outline-dark" onClick={() => editStudent()}><Plus size={16} />{t(locale, "admin.addStudent")}</button></div>
      {notice && <p className="form-success-text" role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}

      {teamDraft && <form className="admin-panel-card admin-entity-form" onSubmit={saveTeam}>
        <div className="admin-card-heading"><div><p className="eyebrow">{t(locale, "admin.teamsTitle")}</p><h2>{teamId ? t(locale, "admin.editTeam") : t(locale, "admin.addTeam")}</h2></div><button className="icon-button" type="button" aria-label={t(locale, "common.close")} onClick={() => setTeamDraft(null)}><X size={18} /></button></div>
        <LocalizedInput label={t(locale, "admin.teamName")} value={teamDraft.name} onChange={(name) => setTeamDraft({ ...teamDraft, name, ...(!teamId && !teamDraft.slug && name.en ? { slug: slugify(name.en) } : {}) })} required="all" maxLength={200} />
        <label className="form-field"><span>{t(locale, "admin.teamSlug")}</span><input value={teamDraft.slug} onChange={(event) => setTeamDraft({ ...teamDraft, slug: slugify(event.target.value) })} required maxLength={160} /></label>
        <LocalizedInput label={t(locale, "admin.shortDescription")} value={teamDraft.description} onChange={(description) => setTeamDraft({ ...teamDraft, description })} multiline maxLength={1000} />
        <div className="form-grid-three"><label className="form-field"><span>{t(locale, "admin.teamDepartment")}</span><select value={teamDraft.departmentId} onChange={(event) => setTeamDraft({ ...teamDraft, departmentId: event.target.value })}><option value="">{t(locale, "admin.statusNone")}</option>{departments.map((department) => <option key={department.id} value={department.id}>{department[`name_${locale}`] || department.name_en}</option>)}</select></label><label className="form-field"><span>{t(locale, "admin.teamYear")}</span><input type="number" min="1900" max="2200" value={teamDraft.graduationYear} onChange={(event) => setTeamDraft({ ...teamDraft, graduationYear: event.target.value })} /></label><label className="form-field"><span>{t(locale, "admin.teamStatus")}</span><select value={teamDraft.status} onChange={(event) => setTeamDraft({ ...teamDraft, status: event.target.value as TeamDraft["status"] })}><option value="draft">{t(locale, "admin.teamDraft")}</option><option value="published">{t(locale, "admin.teamPublished")}</option><option value="archived">{t(locale, "admin.statusArchived")}</option></select></label></div>
        <MediaUploader locale={locale} purpose="team" label={t(locale, "admin.teamImage")} hint={t(locale, "admin.mediaHint")} value={teamDraft.imagePath || null} onChange={(path) => setTeamDraft({ ...teamDraft, imagePath: path ?? "" })} />
        <label className="check-control"><input type="checkbox" checked={teamDraft.isPublic} onChange={(event) => setTeamDraft({ ...teamDraft, isPublic: event.target.checked })} /><span>{t(locale, "admin.teamPublic")}</span></label>
        <fieldset className="member-selector"><legend>{t(locale, "admin.members")}</legend><p>{t(locale, "admin.selectMembers")}</p>{students.length ? <div className="member-checkbox-grid">{students.map((student) => <label className="check-control" key={student.id}><input type="checkbox" checked={teamDraft.memberIds.includes(student.id)} onChange={(event) => toggleMember(student.id, event.target.checked)} /><span>{localizedField(student, "display_name", locale) || student.display_name_en}{!student.is_public_profile && <small>{t(locale, "admin.profileHidden")}</small>}</span></label>)}</div> : <p>{t(locale, "admin.noStudents")}</p>}</fieldset>
        <div className="admin-form-actions"><button type="button" className="button button-outline-dark" onClick={() => setTeamDraft(null)}>{t(locale, "common.cancel")}</button><button type="submit" className="button button-red" disabled={busy}>{busy ? t(locale, "common.saving") : t(locale, "admin.saveTeam")} <Save size={16} /></button></div>
      </form>}

      {studentDraft && <form className="admin-panel-card admin-entity-form" onSubmit={saveStudent}>
        <div className="admin-card-heading"><div><p className="eyebrow">{t(locale, "admin.teamsTitle")}</p><h2>{studentId ? t(locale, "admin.editStudent") : t(locale, "admin.addStudent")}</h2></div><button className="icon-button" type="button" aria-label={t(locale, "common.close")} onClick={() => setStudentDraft(null)}><X size={18} /></button></div>
        <LocalizedInput label={t(locale, "admin.studentName")} value={studentDraft.name} onChange={(name) => setStudentDraft({ ...studentDraft, name })} required="all" maxLength={160} />
        <LocalizedInput label={t(locale, "admin.studentBio")} value={studentDraft.bio} onChange={(bio) => setStudentDraft({ ...studentDraft, bio })} multiline maxLength={1200} />
        <label className="check-control"><input type="checkbox" checked={studentDraft.isPublicProfile} onChange={(event) => setStudentDraft({ ...studentDraft, isPublicProfile: event.target.checked })} /><span>{t(locale, "admin.studentPublic")}</span></label>
        <p className="form-help">{t(locale, "detail.privateDataNote")}</p>
        <div className="admin-form-actions"><button type="button" className="button button-outline-dark" onClick={() => setStudentDraft(null)}>{t(locale, "common.cancel")}</button><button type="submit" className="button button-red" disabled={busy}>{busy ? t(locale, "common.saving") : t(locale, "admin.saveStudent")} <Save size={16} /></button></div>
      </form>}

      {loading ? <div className="admin-loading-state">{t(locale, "common.loading")}</div> : <div className="admin-people-grid">
        <section className="admin-panel-card"><div className="admin-card-heading"><div><p className="eyebrow">{t(locale, "admin.teamsTitle")}</p><h2>{t(locale, "admin.teamsTitle")}</h2></div><Users size={19} /></div><input className="admin-list-search" value={teamSearch} onChange={(event) => setTeamSearch(event.target.value)} placeholder={t(locale, "admin.searchTeams")} />
          {visibleTeams.length ? <ul className="admin-entity-list">{visibleTeams.map((team) => <li key={team.id}><div><strong>{localizedField(team, "name", locale) || team.slug}</strong><span>{team.graduation_year ?? "—"} · {team.status === "published" && team.is_public ? t(locale, "admin.teamPublished") : t(locale, "admin.teamDraft")}</span></div><button type="button" className="button button-outline-dark button-small" onClick={() => editTeam(team)}>{t(locale, "common.edit")}</button></li>)}</ul> : <p className="admin-empty-text">{t(locale, "admin.noTeams")}</p>}
        </section>
        <section className="admin-panel-card"><div className="admin-card-heading"><div><p className="eyebrow">{t(locale, "admin.studentProfiles")}</p><h2>{t(locale, "admin.studentName")}</h2></div></div><input className="admin-list-search" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder={t(locale, "admin.searchStudents")} />
          {visibleStudents.length ? <ul className="admin-entity-list">{visibleStudents.map((student) => <li key={student.id}><div><strong>{localizedField(student, "display_name", locale) || student.display_name_en}</strong><span>{student.is_public_profile ? t(locale, "admin.studentPublic") : t(locale, "admin.profileHidden")}</span></div><button type="button" className="button button-outline-dark button-small" onClick={() => editStudent(student)}>{t(locale, "common.edit")}</button></li>)}</ul> : <p className="admin-empty-text">{t(locale, "admin.noStudents")}</p>}
        </section>
      </div>}
    </div>
  );
}
