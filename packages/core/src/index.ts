/**
 * @openplay/core — platform-agnostic domain layer.
 *
 * INVARIANT: nothing in this package may import React, react-dom, next/*, a DOM
 * global, or a Node built-in. The tsconfig omits the "dom" lib to enforce this at
 * compile time. That constraint is what lets an Expo app consume this package
 * unchanged; breaking it silently forks the business logic between platforms.
 */

export * from "./domain/enums"
export * from "./domain/geo"
export * from "./domain/program"
export * from "./domain/provenance"
export * from "./domain/registration"
export * from "./domain/eligibility"
export * from "./domain/sport"

export * from "./search/ranking"
export * from "./format"

export * as tokens from "./tokens"
