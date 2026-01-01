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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const divisions = pgTable('divisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
})

export const indicatorCategories = pgTable('indicator_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const indicators = pgTable('indicators', {
  id: uuid('id').defaultRandom().primaryKey(),
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
  targetUnit: text('target_unit'), // "percentage" or "day"
  targetKeterangan: text('target_keterangan'), // ">", "<", "=", ">=", "<="
  targetIsZero: boolean('target_is_zero').default(false),
  targetCalculationFormula: text('target_calculation_formula'), // "N/D", "N-D", "(N/D)*100"
  documentFile: text('document_file'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
