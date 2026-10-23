import test from "node:test";
import assert from "node:assert/strict";
import { locales } from "../src/i18n/locales";
import { getDictionary } from "../src/i18n/dictionaries";
import { sniffMediaMime } from "../src/lib/file-signatures";
import { departmentInputSchema, inquiryInputSchema, projectInputSchema, studentInputSchema, teamInputSchema } from "../src/lib/validation";
import { localizedField, visibleDemoUrl } from "../src/types/domain";
import { isMissingDemoSchemaError } from "../src/lib/demo-schema";

const localizedBlank = { en: "", ar: "", it: "" };
const projectBody = {
  slug: "student-project-2026",
  title: { en: "Student project", ar: "مشروع طلابي", it: "Progetto studentesco" },
  shortDescription: localizedBlank,
  description: localizedBlank,
  problemStatement: localizedBlank,
  objectives: localizedBlank,
  proposedSolution: localizedBlank,
  technicalImplementation: localizedBlank,
  academicProgram: localizedBlank,
  projectDuration: localizedBlank,
  supervisorName: localizedBlank,
  coverAlt: localizedBlank,
  departmentId: "00000000-0000-4000-8000-000000000001",
  graduationYear: 2026,
  status: "draft" as const,
  technicalSpecifications: {},
  tags: [],
  categories: [],
  media: [],
  awards: [],
};

test("all user-facing dictionary keys exist in English, Arabic, and Italian", () => {
  const dictionaries = locales.map((locale) => getDictionary(locale));
  const referenceKeys = Object.keys(dictionaries[0]).sort();
  for (const dictionary of dictionaries) {
    assert.deepEqual(Object.keys(dictionary).sort(), referenceKeys);
    assert.ok(Object.values(dictionary).every((value) => typeof value === "string" && value.length > 0));
  }
  assert.equal(getDictionary("ar")["language.label"], "اختيار اللغة");
});

test("localized content falls back to English when a requested translation is blank", () => {
  const item = { title_en: "Machine vision", title_ar: "  ", title_it: "Visione artificiale" };
  assert.equal(localizedField(item, "title", "ar"), "Machine vision");
  assert.equal(localizedField(item, "title", "it"), "Visione artificiale");
});

test("server-side file-signature sniffing accepts JPEG, PNG, WebP, and PDF headers only", () => {
  assert.equal(sniffMediaMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(sniffMediaMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(sniffMediaMime(new TextEncoder().encode("RIFF0000WEBP")), "image/webp");
  assert.equal(sniffMediaMime(new TextEncoder().encode("%PDF-1.7")), "application/pdf");
  assert.equal(sniffMediaMime(new TextEncoder().encode("<script>")), null);
});

test("project validation requires translated titles and rejects malformed file/video records", () => {
  assert.equal(projectInputSchema.safeParse(projectBody).success, true);
  assert.equal(projectInputSchema.safeParse({ ...projectBody, title: { en: "Title", ar: "", it: "" } }).success, false);
  const invalidMedia = { ...projectBody, media: [{ kind: "image", bucket_name: "approved-documents", object_path: "admin/image.webp" }] };
  assert.equal(projectInputSchema.safeParse(invalidMedia).success, false);
  const unsafeVideo = { ...projectBody, media: [{ kind: "video", bucket_name: "project-gallery", object_path: null, video_url: "javascript:alert(1)" }] };
  assert.equal(projectInputSchema.safeParse(unsafeVideo).success, false);
});

test("department, team, and student public names require all three locales", () => {
  const department = departmentInputSchema.safeParse({
    name: { en: "Mechanical Engineering", ar: "الهندسة الميكانيكية", it: "Ingegneria meccanica" },
    description: localizedBlank,
    isActive: true,
    displayOrder: 1,
  });
  assert.equal(department.success, true);
  assert.equal(departmentInputSchema.safeParse({ name: { en: "Mechanical", ar: "", it: "" }, description: localizedBlank, displayOrder: 1 }).success, false);

  const team = { slug: "team-one", name: { en: "Team One", ar: "الفريق الأول", it: "Team Uno" }, description: localizedBlank, status: "draft" as const, memberIds: [] };
  assert.equal(teamInputSchema.safeParse(team).success, true);
  assert.equal(teamInputSchema.safeParse({ ...team, name: { en: "Team One", ar: "", it: "" } }).success, false);
  assert.equal(studentInputSchema.safeParse({ displayName: { en: "Student", ar: "طالب", it: "Studente" }, bio: localizedBlank, isPublicProfile: false }).success, true);
});

test("professional inquiries require consent, valid email, and a sufficiently detailed message", () => {
  const inquiry = { organization: "Institute", contactName: "Alex Smith", email: "alex@example.org", category: "general", message: "Please contact me to discuss an engineering project.", consent: true };
  assert.equal(inquiryInputSchema.safeParse(inquiry).success, true);
  assert.equal(inquiryInputSchema.safeParse({ ...inquiry, consent: false }).success, false);
  assert.equal(inquiryInputSchema.safeParse({ ...inquiry, email: "not-an-email" }).success, false);
});

test("the public site name is Don Bosco Cairo Projects in every locale", () => {
  assert.equal(getDictionary("en")["site.name"], "DON BOSCO CAIRO PROJECTS");
  assert.equal(getDictionary("ar")["site.name"], "مشروعات دون بوسكو القاهرة");
  assert.equal(getDictionary("it")["site.name"], "Progetti Don Bosco Cairo");
});

test("project demo links are only published when visible and https", () => {
  // A normal visible https link is returned (URL() normalises a bare origin).
  assert.equal(visibleDemoUrl({ demo_url: "https://demo.example.org/project", demo_visible: true }),
    "https://demo.example.org/project");
  assert.equal(visibleDemoUrl({ demo_url: "https://demo.example.org", demo_visible: true }),
    "https://demo.example.org/");
  // Hidden by the administrator.
  assert.equal(visibleDemoUrl({ demo_url: "https://demo.example.org", demo_visible: false }), null);
  // Nothing stored, or only whitespace.
  assert.equal(visibleDemoUrl({ demo_url: null, demo_visible: true }), null);
  assert.equal(visibleDemoUrl({ demo_url: "   ", demo_visible: true }), null);
  assert.equal(visibleDemoUrl({}), null);
  assert.equal(visibleDemoUrl(null), null);
  // Never render an unsafe or malformed value, even if it reached the database.
  assert.equal(visibleDemoUrl({ demo_url: "javascript:alert(1)", demo_visible: true }), null);
  assert.equal(visibleDemoUrl({ demo_url: "http://demo.example.org", demo_visible: true }), null);
  assert.equal(visibleDemoUrl({ demo_url: "not a url", demo_visible: true }), null);
  // Column missing entirely (migration 007 not applied) behaves like "no demo".
  assert.equal(visibleDemoUrl({ demo_url: undefined, demo_visible: undefined }), null);
});

test("the project schema accepts only https demo links and preserves omitted optional demo fields", () => {
  const base = projectBody;
  assert.equal(projectInputSchema.safeParse({ ...base, demoUrl: "https://demo.example.org" }).success, true);
  assert.equal(projectInputSchema.safeParse({ ...base, demoUrl: "" }).success, true);
  assert.equal(projectInputSchema.safeParse({ ...base, demoUrl: null }).success, true);
  assert.equal(projectInputSchema.safeParse({ ...base, demoUrl: "http://demo.example.org" }).success, false);
  assert.equal(projectInputSchema.safeParse({ ...base, demoUrl: "javascript:alert(1)" }).success, false);

  const parsed = projectInputSchema.safeParse(base);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    // Omitted fields must remain omitted so an older or temporarily disabled form
    // cannot accidentally clear an existing demo link or reset its visibility.
    const serialized = JSON.parse(JSON.stringify(parsed.data)) as Record<string, unknown>;
    assert.equal("demoVisible" in serialized, false);
    assert.equal("demoUrl" in serialized, false);
  }
});


test("only missing demo schema/RPC errors are cached as unavailable", () => {
  assert.equal(isMissingDemoSchemaError({ code: "PGRST202", message: "Could not find the function in the schema cache" }), true);
  assert.equal(isMissingDemoSchemaError({ code: "PGRST204", message: "Could not find the 'demo_url' column in the schema cache" }), true);
  assert.equal(isMissingDemoSchemaError({ code: "42703", message: "column demo_url does not exist" }), true);
  assert.equal(isMissingDemoSchemaError({ code: "ETIMEDOUT", message: "request timed out" }), false);
  assert.equal(isMissingDemoSchemaError({ code: "42501", message: "permission denied" }), false);
  assert.equal(isMissingDemoSchemaError(null), false);
});
