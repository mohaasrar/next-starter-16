/**
 * Application constants
 */

export enum FILTER_MODES {
  CONTAINS = "contains",
  EQUALS = "equals",
  BETWEEN = "between",
}

export const PAGINATION_DEFAULTS = {
  pageSize: 10,
  pageIndex: 0,
} as const;

export const MOBILE_BREAKPOINT = 768;

export const DEBOUNCE_DELAY = 500;

