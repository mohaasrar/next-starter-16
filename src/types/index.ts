/**
 * Shared types for the application
 */

import { FILTER_MODES } from "@/lib/constants";
import { DateRange } from "react-day-picker";

export type FilterColumnsValue<T> = {
  mode: FILTER_MODES;
  value?: T;
};

