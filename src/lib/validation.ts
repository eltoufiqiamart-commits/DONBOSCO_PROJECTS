```ts
import { z } from "zod";

const optionalText = (limit = 12000) =>
  z.string().trim().max(limit).nullable().optional().transform(
    (value) => value?.trim() || null
  );

const translated = (_englishMin = 0, limit = 12000) =>
  z.object({
    en: z.string().trim().max(limit).optional().default(""),
    ar: optionalText(limit),
    it: optionalText(limit),
  });

const requiredTranslated = (minimum = 1, limit = 12000) =>
  z.object({
    en: z.string().trim().min(minimum).max(limit),
    ar: optionalText(limit),
    it: optionalText(limit),
  });

const safeSlug = z
  .string()
  .trim()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug");

const safeHttpsUrl = z
  .string()
  .url()
  .max(1200)
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "HTTPS URLs only.");

const optionalHttpsUrl = z
  .union([z.literal(""), safeHttpsUrl])
  .nullable()
  .optional()
  .transform((value) => (value === "" ? null : value));

export const projectInputSchema = z.object({
  slug: safeSlug,

  title: requiredTranslated(2, 240),

  shortDescription: translated(0, 900),
  description: translated(0, 18000),
  problemStatement: translated(0, 10000),
  objectives: translated(0, 10000),
  proposedSolution: translated(0, 12000),
  technicalImplementation: translated(0, 18000),
  academicProgram: translated(0, 300),
  projectDuration: translated(0, 200),
  supervisorName: translated(0, 160),
  coverAlt: translated(0, 300),

  departmentId: z.string().uuid(),
  teamId: z.string().uuid().nullable().optional(),

  graduationYear: z.number().int().min(1900).max(2200),
  completionDate: z.string().date().nullable().optional(),

  status: z.enum([
    "draft",
    "pending",
    "published",
    "rejected",
    "archived",
  ]),

  featured: z.boolean().default(false),
  awardWinning: z.boolean().default(false),

  industryStatus: z
    .enum(["none", "suitable", "seeking_partner", "in_development"])
    .default("none"),

  coverImagePath: z.string().max(500).nullable().optional(),
  demoUrl: optionalHttpsUrl,
  demoVisible: z.boolean().optional(),

  technicalSpecifications: z
    .record(
      z.string().trim().min(1).max(120),
      z.object({
        label: translated(1, 120),
        value: translated(1, 1000),
      })
    )
    .default({})
    .refine(
      (value) => Object.keys(value).length <= 40,
      "Too many specifications."
    ),

  tags: z
    .array(
      z.object({
        slug: safeSlug,
        label_en: z.string().trim().min(1).max(80),
        label_ar: optionalText(80),
        label_it: optionalText(80),
      })
    )
    .max(20)
    .default([]),

  categories: z
    .array(
      z.object({
        slug: safeSlug,
        label_en: z.string().trim().min(1).max(80),
        label_ar: optionalText(80),
        label_it: optionalText(80),
      })
    )
    .max(12)
    .default([]),

  media: z
    .array(
      z
        .object({
          kind: z.enum(["image", "video", "document"]),
          bucket_name: z.enum([
            "project-gallery",
            "approved-documents",
          ]),
          object_path: z.string().max(500).nullable().optional(),
          video_url: safeHttpsUrl.nullable().optional(),

          title_en: optionalText(240),
          title_ar: optionalText(240),
          title_it: optionalText(240),

          caption_en: optionalText(1200),
          caption_ar: optionalText(1200),
          caption_it: optionalText(1200),

          alt_en: optionalText(300),
          alt_ar: optionalText(300),
          alt_it: optionalText(300),

          sort_order: z.number().int().min(0).max(1000).default(0),
          is_public_approved: z.boolean().default(false),
        })
        .superRefine((item, context) => {
          if (
            item.kind === "video" &&
            (!item.video_url || item.object_path)
          ) {
            context.addIssue({
              code: "custom",
              message: "Invalid video media.",
            });
          }

          if (
            item.kind !== "video" &&
            (!item.object_path || item.video_url)
          ) {
            context.addIssue({
              code: "custom",
              message: "Invalid file media.",
            });
          }

          if (
            item.kind === "image" &&
            item.bucket_name !== "project-gallery"
          ) {
            context.addIssue({
              code: "custom",
              message: "Invalid image bucket.",
            });
          }

          if (
            item.kind === "document" &&
            item.bucket_name !== "approved-documents"
          ) {
            context.addIssue({
              code: "custom",
              message: "Invalid document bucket.",
            });
          }
        })
    )
    .max(40)
    .default([]),

  awards: z
    .array(
      z.object({
        title_en: z.string().trim().min(2).max(240),
        title_ar: optionalText(240),
        title_it: optionalText(240),

        issuer_en: optionalText(240),
        issuer_ar: optionalText(240),
        issuer_it: optionalText(240),

        award_date: z.string().date().nullable().optional(),
        verified: z.boolean().default(false),
      })
    )
    .max(10)
    .default([]),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;

export const teamInputSchema = z.object({
  slug: safeSlug,

  name: requiredTranslated(2, 200),
  description: translated(0, 1000),

  departmentId: z.string().uuid().nullable().optional(),
  graduationYear: z.number().int().min(1900).max(2200).nullable().optional(),

  imagePath: z.string().max(500).nullable().optional(),

  isPublic: z.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]),

  memberIds: z.array(z.string().uuid()).max(40).default([]),
});

export const studentInputSchema = z.object({
  displayName: requiredTranslated(2, 160),
  bio: translated(0, 1200),
  isPublicProfile: z.boolean().default(false),
});

export const departmentInputSchema = z.object({
  name: requiredTranslated(2, 180),
  description: translated(0, 3000),

  coverImagePath: z.string().max(500).nullable().optional(),

  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(1000),
});

export const inquiryInputSchema = z.object({
  organization: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),

  category: z.enum(["general", "project", "applied"]),

  projectSlug: z.string().trim().max(180).nullable().optional(),
  message: z.string().trim().min(20).max(5000),

  consent: z.literal(true),
  website: z.string().max(200).optional(),
});
```
