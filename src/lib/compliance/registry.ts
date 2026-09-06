// ============================================================================
// src/lib/compliance/registry.ts
// SIH PS26034 — Master Rule Registry & Version Resolver
//
// Invariants:
//   - Rules must be traceable to rule code and immutable rule version.
//   - Preserves all 6 DEMO rules already seeded in Supabase database.
//   - Supports loading dynamic rules from Supabase and fallback canonical rules.
// ============================================================================

import type { EvaluatableRule } from './types';
import type { Rule } from '@/types/database.types';

/**
 * Fallback canonical master rules representing the 6 existing rules in the DB.
 * Used when database is unreachable or for deterministic offline unit testing.
 */
export const PRESERVED_DEMO_RULES: EvaluatableRule[] = [
  {
    id: 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
    ruleCode: 'DEMO-LM-MRP-001',
    title: '[DEMO] MRP Mandatory Declaration',
    description:
      '[DEMO / TEST RULE] This is a structural placeholder rule. Real rule text must be verified from the Legal Metrology (Packaged Commodities) Rules, 2011, Gazette of India.',
    targetField: 'mrp',
    severity: 'CRITICAL',
    conditionOperator: 'REGEX_MATCH',
    conditionParameters: {
      pattern: '(?i)(?:MRP|Maximum Retail Price).*(?:incl|inclusive).*(?:all taxes|tax)',
      required_present: true,
    },
    expectedConstraintText: 'MRP declaration must state inclusive of all taxes',
    enabled: true,
    currentVersion: 'v2024.1',
  },
  {
    id: 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
    ruleCode: 'DEMO-LM-NET-QTY-001',
    title: '[DEMO] Net Quantity with SI Unit',
    description:
      '[DEMO / TEST RULE] This is a structural placeholder rule. Real rule text must be verified from authoritative sources.',
    targetField: 'net_quantity',
    severity: 'CRITICAL',
    conditionOperator: 'REGEX_MATCH',
    conditionParameters: {
      pattern: '^[0-9]+(?:\\.[0-9]+)?\\s*(?:g|kg|ml|l|m|L|mL|N)$',
      required_present: true,
    },
    expectedConstraintText: 'Net quantity must be expressed with standard SI unit symbol',
    enabled: true,
    currentVersion: 'v2024.1',
  },
  {
    id: 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
    ruleCode: 'DEMO-LM-MFG-DATE-001',
    title: '[DEMO] Manufacturing Date Required',
    description:
      '[DEMO / TEST RULE] This is a structural placeholder rule. Real rule text must be verified from authoritative sources.',
    targetField: 'manufacturing_date',
    severity: 'MAJOR',
    conditionOperator: 'EXISTS',
    conditionParameters: {
      required_present: true,
    },
    expectedConstraintText: 'Month and year of manufacture or packing must be declared',
    enabled: true,
    currentVersion: 'v2024.1',
  },
  {
    id: 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa',
    ruleCode: 'DEMO-LM-MANUFACTURER-001',
    title: '[DEMO] Manufacturer Information Required',
    description:
      '[DEMO / TEST RULE] This is a structural placeholder rule. Real rule text must be verified from authoritative sources.',
    targetField: 'name_address_manufacturer',
    severity: 'CRITICAL',
    conditionOperator: 'EXISTS',
    conditionParameters: {
      required_fields: ['name', 'address'],
      required_present: true,
    },
    expectedConstraintText: 'Complete legal name and postal address of manufacturer/packer must be declared',
    enabled: true,
    currentVersion: 'v2024.1',
  },
  {
    id: 'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa',
    ruleCode: 'DEMO-LM-CONSUMER-CARE-001',
    title: '[DEMO] Consumer Care Contact Required',
    description:
      '[DEMO / TEST RULE] This is a structural placeholder rule. Real rule text must be verified from authoritative sources.',
    targetField: 'consumer_care',
    severity: 'MAJOR',
    conditionOperator: 'EXISTS',
    conditionParameters: {
      required_fields: ['phone', 'email'],
      required_present: true,
    },
    expectedConstraintText: 'Consumer care contact details (phone and email) must be declared',
    enabled: true,
    currentVersion: 'v2024.1',
  },
  {
    id: 'aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa',
    ruleCode: 'DEMO-LM-FONT-HEIGHT-001',
    title: '[DEMO] Minimum Font Height Requirement',
    description:
      '[DEMO / TEST RULE] Structural placeholder for font height requirement. Pixel threshold is a placeholder; real calibrated mm values must be sourced from gazette.',
    targetField: 'font_measurement',
    severity: 'MAJOR',
    conditionOperator: 'NUMERIC_GTE',
    conditionParameters: {
      note: 'DEMO placeholder threshold only — real mm values to be configured from Legal Metrology Rules Schedule',
      minimum_pixel_height: 15,
    },
    expectedConstraintText: 'Mandatory declaration text must meet minimum character height requirement',
    enabled: true,
    currentVersion: 'v2024.1',
  },
];

/**
 * Loads active rules for a specific ruleset version from the database, falling back
 * to the canonical preserved rules if the database is unpopulated or offline.
 */
export async function getActiveRules(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any,
  rulesetVersion: string = 'v2024.1'
): Promise<EvaluatableRule[]> {
  if (!supabase) {
    return PRESERVED_DEMO_RULES.filter((r) => r.enabled && r.currentVersion === rulesetVersion);
  }

  try {
    const { data: dbRules, error: rulesError } = await (
      supabase.from('rules') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: boolean) => Promise<{
            data: Rule[] | null;
            error: Error | null;
          }>;
        };
      }
    )
      .select('*')
      .eq('enabled', true);

    if (rulesError || !dbRules || dbRules.length === 0) {
      return PRESERVED_DEMO_RULES.filter((r) => r.enabled && r.currentVersion === rulesetVersion);
    }

    // Map database rules to EvaluatableRule objects
    return dbRules.map((r) => ({
      id: r.id,
      ruleCode: r.rule_code,
      title: r.title,
      description: r.description,
      // Handle legacy targetField in DB ('manufacturer_info' maps to 'name_address_manufacturer')
      targetField:
        r.target_field === 'manufacturer_info' ? 'name_address_manufacturer' : r.target_field,
      severity: r.severity,
      conditionOperator: r.condition_operator as EvaluatableRule['conditionOperator'],
      conditionParameters: (r.condition_parameters as Record<string, unknown>) || {},
      expectedConstraintText: r.expected_constraint_text,
      enabled: r.enabled,
      currentVersion: r.current_version || rulesetVersion,
    }));
  } catch {
    return PRESERVED_DEMO_RULES.filter((r) => r.enabled && r.currentVersion === rulesetVersion);
  }
}
