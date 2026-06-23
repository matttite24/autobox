/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as auth from "../auth.js";
import type * as banks from "../banks.js";
import type * as categories from "../categories.js";
import type * as clients from "../clients.js";
import type * as datil from "../datil.js";
import type * as debug from "../debug.js";
import type * as finances from "../finances.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as notifications from "../notifications.js";
import type * as organizations from "../organizations.js";
import type * as payment_networks from "../payment_networks.js";
import type * as payroll from "../payroll.js";
import type * as purchases from "../purchases.js";
import type * as reports from "../reports.js";
import type * as sales from "../sales.js";
import type * as search from "../search.js";
import type * as services from "../services.js";
import type * as users from "../users.js";
import type * as vehicles from "../vehicles.js";
import type * as wipe from "../wipe.js";
import type * as work_orders from "../work_orders.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  auth: typeof auth;
  banks: typeof banks;
  categories: typeof categories;
  clients: typeof clients;
  datil: typeof datil;
  debug: typeof debug;
  finances: typeof finances;
  http: typeof http;
  inventory: typeof inventory;
  notifications: typeof notifications;
  organizations: typeof organizations;
  payment_networks: typeof payment_networks;
  payroll: typeof payroll;
  purchases: typeof purchases;
  reports: typeof reports;
  sales: typeof sales;
  search: typeof search;
  services: typeof services;
  users: typeof users;
  vehicles: typeof vehicles;
  wipe: typeof wipe;
  work_orders: typeof work_orders;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
