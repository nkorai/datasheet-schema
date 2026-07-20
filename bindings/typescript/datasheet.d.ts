/* AUTO-GENERATED from schema/datasheet-1.0.schema.json. do not edit. */

/**
 * A value with its unit, the conditions under which it holds, the table it came from, and provenance.
 */
export type Measurement = {
  [k: string]: unknown;
};

/**
 * A machine-readable schema for electronic-component datasheet specifications. Each value records the test conditions under which it holds and a reference to its source in the datasheet. Existing standards omit both.
 */
export interface DatasheetSchema {
  /**
   * The Datasheet Schema version this document conforms to.
   */
  schemaVersion: '1.0';
  component: ComponentIdentity;
  /**
   * Physical pins with normalized functions, so a tool can bind a pin by function rather than by vendor pin name.
   */
  pinout?: Pin[];
  /**
   * All specified values. Absolute-maximum, recommended-operating, electrical, thermal, and ESD data are held here as parameters and distinguished by each measurement's limitClass rather than by separate tables. This allows one envelope to describe any component family.
   */
  parameters: Parameter[];
  provenance: Provenance;
  /**
   * Free text for a reviewer, covering anything ambiguous, conflicting, or spread across variant tables.
   */
  notes?: string[];
}
/**
 * Identifying information for the part.
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
   * Package designator as printed, for example SOT-23-5.
   */
  package?: string;
  pinCount?: number;
  lifecycle?: 'active' | 'nrnd' | 'obsolete' | 'unknown';
  /**
   * Moisture sensitivity level, for example MSL1.
   */
  msl?: string;
  /**
   * Qualification or temperature grade, for example -40..125 or AEC-Q100 Grade 1.
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
     * Tape and reel, tube, or similar.
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
 * One canonically-keyed characteristic. A family dictionary, for example dictionary/ldo-1.0.json, defines the legal keys, their units, and vendor aliases. The schema keeps the parameter shape family-agnostic so every family reuses it.
 */
export interface Parameter {
  /**
   * Canonical parameter key from the family dictionary, for example dropout_voltage, psrr, reference_voltage, or thermal_resistance_junction_ambient.
   */
  key: string;
  /**
   * Human-readable label.
   */
  name?: string;
  /**
   * Family-scoped functional group, for example regulation or protection.
   */
  group?: string;
  /**
   * Vendor synonyms for this parameter, for example ripple rejection for psrr. Normalizing naming in the schema rather than in downstream code keeps documents interoperable across manufacturers.
   */
  aliases?: string[];
  /**
   * One entry per distinct condition set. A parameter specified across several load currents or frequencies, such as dropout, PSRR, or quiescent current, has one measurement per point.
   *
   * @minItems 1
   */
  measurements: [Measurement, ...Measurement[]];
}
/**
 * The record of where every value in this document came from. It is what allows a specification to be verified rather than only asserted.
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
   * Revision string as printed, for example SBVS176K REVISED MARCH 2023.
   */
  datasheetRevision?: string;
  publishedDate?: string;
  fetchedAt?: string;
  /**
   * How the data was produced, for example manual or llm:claude-sonnet-4-5.
   */
  extractionMethod?: string;
  extractedAt?: string;
  /**
   * Extraction confidence from 0 to 1. Advisory only. It does not by itself imply the data is verified.
   */
  confidence?: number;
  /**
   * True only when the data passed a validation suite.
   */
  verified?: boolean;
}
