import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

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

export type Site = typeof sites.$inferSelect
export type NewSite = typeof sites.$inferInsert

export type Division = typeof divisions.$inferSelect
export type NewDivision = typeof divisions.$inferInsert

export type Employee = typeof employees.$inferSelect
export type NewEmployee = typeof employees.$inferInsert

export type Unit = typeof units.$inferSelect
export type NewUnit = typeof units.$inferInsert
