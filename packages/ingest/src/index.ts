/**
 * @openplay/ingest — server-only ingestion pipeline.
 *
 * Pipeline order:
 *   fetch -> hashContent -> (skip if unchanged) -> extractPrograms
 *         -> validateExtraction -> geocode -> entity resolution -> diffFields
 *         -> review queue or auto-apply
 */

export * from "./geocode"
export * from "./entity-resolution"
export * from "./change-detection"
export * from "./extraction-schema"
export * from "./extract"
export * from "./fetch"
export * from "./discover-links"
export * from "./pipeline"
