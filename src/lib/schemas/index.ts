/**
 * Single entry point for every contract. Import from "@/lib/schemas".
 * Rules:
 *  - Types are always `z.infer` of a schema here. Never hand-write a type that
 *    describes the same thing.
 *  - Objects we own are `.strict()`. External responses are `.passthrough()`.
 *    Import rows are `.loose()` because source files gain columns.
 *  - Changing a domain schema is a contract amendment: note it in docs/PLAN.md.
 */
export * from "./api";
export * from "./caaspp";
export * from "./common";
export * from "./dashboard";
export * from "./enrollment";
export * from "./external";
export * from "./school";
export * from "./url-state";
