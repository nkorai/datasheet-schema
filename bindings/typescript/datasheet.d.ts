/* AUTO-GENERATED from schema/datasheet-1.0.schema.json — do not edit. */

/**
 * The design-grade atom: a value + unit + the conditions it holds under + which table it came from + provenance.
 */
export type Measurement = {
  [k: string]: unknown;
};

/**
 * A machine-readable, design-grade schema for electronic-component datasheet specifications. Unlike parametric databases, every value carries the TEST CONDITIONS it was measured under and PROVENANCE back to the datasheet page — the two things that make a spec safe to design from, and the two things no existing standard captures.
 */
export interface DatasheetSchema {
  /**
   * The Datasheet Schema version this document conforms to.
   */
  schemaVersion: '1.0';
  component: ComponentIdentity;
  /**
   * Physical pins with normalized functions, so a tool can wire the part without string-matching vendor pin names.
   */
  pinout?: Pin[];
  /**
   * EVERY specified value, unified. Absolute-maximum, recommended-operating, electrical, thermal, and ESD data all live here as parameters, distinguished by each measurement's `limitClass` rather than by separate tables. This is what lets one envelope describe any component family.
   */
  parameters: Parameter[];
  provenance: Provenance;
  /**
   * Anything ambiguous, conflicting, or spread across variant tables that a human reviewer should know.
   */
  notes?: string[];
}
/**
 * Who the part is. Borrows the Octopart/GS1 identity envelope.
 */
export interface ComponentIdentity {
  /**
   * Manufacturer part number.
   */
  mpn: string;
  manufacturer: string;
  /**
   * Component family. Determines which parameter dictionary applies.
   */
  family: string;
  description?: string;
  /**
   * Package designator as printed, e.g. "SOT-23-5".
   */
  package?: string;
  pinCount?: number;
  lifecycle?: 'active' | 'nrnd' | 'obsolete' | 'unknown';
  /**
   * Moisture sensitivity level, e.g. "MSL1".
   */
  msl?: string;
  /**
   * Qualification / temperature grade, e.g. "-40..125", "AEC-Q100 Grade 1".
   */
  temperatureGrade?: string;
  /**
   * The orderable variants covered by this datasheet.
   */
  orderingVariants?: {
    orderCode: string;
    /**
     * Fixed output option, when this variant pins a voltage.
     */
    outputVoltageV?: number;
    package?: string;
    temperatureGrade?: string;
    /**
     * Tape & reel / tube / etc.
     */
    packing?: string;
  }[];
}
export interface Pin {
  /**
   * 1-indexed physical pin number.
   */
  number: number;
  /**
   * Pin name as printed.
   */
  name: string;
  /**
   * Normalized semantic function.
   */
  function: 'IN' | 'OUT' | 'GND' | 'EN' | 'NC' | 'BYP' | 'ADJ' | 'FB' | 'PG' | 'SENSE' | 'BIAS' | 'PAD';
  type?: 'power' | 'analog' | 'digital_in' | 'digital_out' | 'passive' | 'thermal';
  description?: string;
  sourcePage?: number;
}
/**
 * One canonically-keyed characteristic. A family dictionary (e.g. dictionary/ldo-1.0.json) defines the legal keys, their units, and vendor aliases — but the schema keeps the parameter SHAPE universal so every family reuses it.
 */
export interface Parameter {
  /**
   * Canonical parameter key from the family dictionary, e.g. "dropout_voltage", "psrr", "reference_voltage", "thermal_resistance_junction_ambient".
   */
  key: string;
  /**
   * Human-readable label.
   */
  name?: string;
  /**
   * Family-scoped functional group, e.g. "regulation", "protection".
   */
  group?: string;
  /**
   * Vendor synonyms for this parameter (e.g. psrr ↔ "ripple rejection"). Normalizing naming in the schema, not in downstream code, is what keeps this interoperable across manufacturers.
   */
  aliases?: string[];
  /**
   * One entry per distinct condition set. A parameter specified across several load currents or frequencies (dropout, PSRR, quiescent current) has one measurement per point.
   *
   * @minItems 1
   */
  measurements: [Measurement, ...Measurement[]];
}
/**
 * The audit trail — where every value in this document ultimately came from. No existing standard carries this. It is what makes a spec verifiable rather than merely asserted.
 */
export interface Provenance {
  /**
   * SHA-256 of the exact datasheet PDF bytes.
   */
  datasheetSha256?: string;
  /**
   * Where the datasheet was fetched from.
   */
  sourceUrl?: string;
  /**
   * Revision string as printed, e.g. "SBVS176K — REVISED MARCH 2023".
   */
  datasheetRevision?: string;
  publishedDate?: string;
  fetchedAt?: string;
  /**
   * How the data was produced, e.g. "manual", "llm:claude-sonnet-4-5".
   */
  extractionMethod?: string;
  extractedAt?: string;
  /**
   * 0-1 extraction confidence. Advisory only — does not by itself imply the data is verified.
   */
  confidence?: number;
  /**
   * True only when the data passed a validation suite.
   */
  verified?: boolean;
}
