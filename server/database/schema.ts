import { pgTable, text, timestamp, uuid, boolean, numeric } from 'drizzle-orm/pg-core'

export const sites = pgTable('sites', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteCode: text('site_code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  address: text('address'),
  email: text('email'),
  website: text('website'),
  phone: text('phone'),
  fax: text('fax'),
  siteLogo: text('site_logo'),
  siteLogoThumbnail: text('site_logo_thumbnail'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

export const divisions = pgTable('divisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

export const employees = pgTable('employees', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  nik: text('nik').notNull().unique(),
  fullName: text('full_name').notNull(),
  unitId: uuid('unit_id'),
  identityNumber: text('identity_number'),
  phoneNumber: text('phone_number'),
  picture: text('picture'),
  pictureThumbnail: text('picture_thumbnail'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

export const units = pgTable('units', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  unitCode: text('unit_code').notNull().unique(),
  divisionId: uuid('division_id').notNull().references(() => divisions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  location: text('location'),
  headOfUnit: uuid('head_of_unit').references(() => employees.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull().default('user'),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'set null' }),
  siteId: uuid('site_id').references(() => sites.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
})

export const indicatorCategories = pgTable('indicator_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

export const indicators = pgTable('indicators', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  indicatorCategoryId: uuid('indicator_category_id').notNull().references(() => indicatorCategories.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(),
  judul: text('judul').notNull(),
  dimensiMutu: text('dimensi_mutu'),
  tujuan: text('tujuan'),
  definisiOperasional: text('definisi_operasional'),
  formula: text('formula'),
  numerator: text('numerator'),
  denominator: text('denominator'),
  target: numeric('target'),
  targetWeight: numeric('target_weight').default(0).notNull(),
  targetUnit: text('target_unit'), // "percentage" or "day"
  targetKeterangan: text('target_keterangan'), // ">", "<", "=", ">=", "<="
  targetIsZero: boolean('target_is_zero').default(false),
  targetCalculationFormula: text('target_calculation_formula'), // "N/D", "N-D", "(N/D)*100"
  documentFile: text('document_file'),
  entryFrequency: text('entry_frequency').default('monthly').notNull(), // "daily" or "monthly"
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

export const indicatorUnits = pgTable('indicator_units', {
  id: uuid('id').defaultRandom().primaryKey(),
  indicatorId: uuid('indicator_id').notNull().references(() => indicators.id, { onDelete: 'cascade' }),
  unitId: uuid('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const indicatorEntries = pgTable('indicator_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryCode: text('entry_code').notNull().unique(),
  unitId: uuid('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }),
  entryDate: timestamp('entry_date').notNull(),
  entryFrequency: text('entry_frequency').notNull(), // 'daily' or 'monthly'
  notes: text('notes'),
  status: text('status').notNull().default('proposed'), // 'proposed', 'checked', 'pending', 'finish'
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'restrict' }),
  auditorNotes: text('auditor_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

export const indicatorEntryItems = pgTable('indicator_entry_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  indicatorEntryId: uuid('indicator_entry_id').notNull().references(() => indicatorEntries.id, { onDelete: 'cascade' }),
  indicatorId: uuid('indicator_id').notNull().references(() => indicators.id, { onDelete: 'cascade' }),
  numeratorValue: numeric('numerator_value'),
  denominatorValue: numeric('denominator_value'),
  skor: numeric('skor'),
  numeratorDenominatorResult: numeric('numerator_denominator_result'),
  isAlreadyChecked: boolean('is_already_checked').default(false).notNull(),
  isNeedPDCA: boolean('is_need_pdca').default(false).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const indicatorPdcas = pgTable('indicator_pdcas', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryItemId: uuid('entry_item_id').notNull().references(() => indicatorEntryItems.id, { onDelete: 'cascade' }),
  pdcaDate: timestamp('pdca_date').notNull(),
  problemTitle: text('problem_title').notNull(),
  stepDescription: text('step_description'),
  planDescription: text('plan_description'),
  doDescription: text('do_description'),
  checkStudy: text('check_study'),
  action: text('action'),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

export const indicatorEntryVerificationLogs = pgTable('indicator_entry_verification_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  indicatorEntryId: uuid('indicator_entry_id').notNull().references(() => indicatorEntries.id, { onDelete: 'cascade' }),
  previousStatus: text('previous_status').notNull(),
  newStatus: text('new_status').notNull(),
  notes: text('notes'),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Activity Logs - untuk tracking aktifitas user
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  userName: text('user_name').notNull(), // Simpan nama user untuk referensi jika user dihapus
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(), // LOGIN, LOGOUT, CREATE, UPDATE, DELETE, VIEW, etc.
  module: text('module').notNull(), // auth, users, indicators, indicator-entries, etc.
  description: text('description').notNull(),
  details: text('details'), // JSON string untuk data tambahan
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Site = typeof sites.$inferSelect
export type NewSite = typeof sites.$inferInsert

export type Division = typeof divisions.$inferSelect
export type NewDivision = typeof divisions.$inferInsert

export type Employee = typeof employees.$inferSelect
export type NewEmployee = typeof employees.$inferInsert

export type Unit = typeof units.$inferSelect
export type NewUnit = typeof units.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

export type IndicatorCategory = typeof indicatorCategories.$inferSelect
export type NewIndicatorCategory = typeof indicatorCategories.$inferInsert

export type Indicator = typeof indicators.$inferSelect
export type NewIndicator = typeof indicators.$inferInsert

export type IndicatorUnit = typeof indicatorUnits.$inferSelect
export type NewIndicatorUnit = typeof indicatorUnits.$inferInsert

export type IndicatorEntry = typeof indicatorEntries.$inferSelect
export type NewIndicatorEntry = typeof indicatorEntries.$inferInsert

export type IndicatorEntryItem = typeof indicatorEntryItems.$inferSelect
export type NewIndicatorEntryItem = typeof indicatorEntryItems.$inferInsert

export type IndicatorPdca = typeof indicatorPdcas.$inferSelect
export type NewIndicatorPdca = typeof indicatorPdcas.$inferInsert

export type IndicatorEntryVerificationLog = typeof indicatorEntryVerificationLogs.$inferSelect
export type NewIndicatorEntryVerificationLog = typeof indicatorEntryVerificationLogs.$inferInsert

export type ActivityLog = typeof activityLogs.$inferSelect
export type NewActivityLog = typeof activityLogs.$inferInsert
