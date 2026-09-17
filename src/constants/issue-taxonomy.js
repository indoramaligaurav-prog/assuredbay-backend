/**
 * Buyer issue taxonomy — Phase 2 adds `noEvidenceRequired` (already existed
 * for not_received) and `minEvidenceCount` for every other reason, so the
 * backend can enforce a minimum number of live-captured photos.
 */

const ALL_CONDITIONS = ['NEW', 'REFURBISHED', 'RECONDITIONED', 'OVERHAULED', 'USED', 'AS_IS'];

const ISSUE_TAXONOMY = [
  {
    code: 'wrong_item',
    label: 'I received a different item',
    description: 'The item delivered is a different product, model, part, size, or variant than what you ordered.',
    policyRelevant: true,
    minEvidenceCount: 2,
    conditions: ALL_CONDITIONS,
    subreasons: [
      { code: 'different_product', label: 'Different product delivered' },
      { code: 'different_model', label: 'Different manufacturer or model delivered' },
      { code: 'different_spec', label: 'Different part number or specification delivered' },
      { code: 'different_variant', label: 'Different quantity, size, capacity, voltage, or variant delivered' }
    ]
  },
  {
    code: 'condition_mismatch',
    label: "The item's physical condition differs from the listing",
    description: "The delivered item's physical state materially differs from the listing images or description.",
    policyRelevant: true,
    minEvidenceCount: 2,
    conditions: ALL_CONDITIONS.filter((c) => c !== 'AS_IS'),
    subreasons: [
      { code: 'undisclosed_damage', label: 'Noticeable undisclosed physical damage' },
      { code: 'cracked_broken', label: 'Cracked or broken' },
      { code: 'undisclosed_wear', label: 'Significant undisclosed wear' },
      { code: 'deformed', label: 'Dented, bent, deformed, corroded, leaking, contaminated, or burnt' },
      { code: 'other_condition', label: 'A material physical condition not visible or stated in the listing' }
    ]
  },
  {
    code: 'missing_parts',
    label: 'Parts, quantity, or listed contents are missing',
    description: 'Something explicitly shown or stated as included was not delivered.',
     policyRelevant: false,
    minEvidenceCount: 2,
    conditions: ALL_CONDITIONS,
    subreasons: [
      { code: 'partial_quantity', label: 'Part of the ordered quantity is missing' },
      { code: 'essential_component', label: 'An essential component is missing' },
      { code: 'accessory_missing', label: 'A listed charger, cable, controller, manual, tool, or accessory is missing' },
      { code: 'documentation_missing', label: 'Listed documentation or certification is missing' },
      { code: 'package_missing', label: 'One or more packages from a multi-package order are missing' }
    ]
  },
  {
    code: 'not_working',
    label: 'The item does not work as stated',
    description: 'The listing represented the item as working/tested/functional, but it materially fails that representation.',
    policyRelevant: true,
    minEvidenceCount: 2,
    conditions: ALL_CONDITIONS.filter((c) => c !== 'AS_IS'),
    subreasons: [
      { code: 'wont_power_on', label: 'Will not power on or start' },
      { code: 'function_fails', label: 'Advertised function does not operate' },
      { code: 'fails_basic_test', label: 'Stops, trips, overheats, leaks, or fails during a basic test' },
      { code: 'intermittent', label: 'Intermittent failure' },
      { code: 'performance_gap', label: 'Output, performance, or operation materially differs from the listing' },
      { code: 'error_fault', label: 'Error or fault prevents normal use' }
    ]
  },
  {
    code: 'damaged_in_delivery',
    label: 'The item was damaged during delivery',
    description: 'The product appears to have been damaged while packed, handled, or transported.',
    policyRelevant: false,
    minEvidenceCount: 3, // packaging shot + item shot(s), per spec guidance for transit damage
    conditions: ALL_CONDITIONS,
    subreasons: [
      { code: 'both_damaged', label: 'Outer packaging and item both damaged' },
      { code: 'item_damaged_only', label: 'Item damaged with no obvious outer-package damage' },
      { code: 'mishandling', label: 'Moisture, impact, crushing, puncture, or mishandling damage' },
      { code: 'protection_failed', label: 'Pallet, crate, container, or internal protection failed' }
    ]
  },
  {
    code: 'not_received',
    label: 'I did not receive the item',
    description: 'Routes directly to the support team — no photo/video evidence required.',
    policyRelevant: false,
    noEvidenceRequired: true,
    minEvidenceCount: 0,
    conditions: ALL_CONDITIONS,
    subreasons: [
      { code: 'shows_delivered_not_received', label: 'Tracking says delivered, but the shipment was not received' },
      { code: 'stalled_tracking', label: 'Tracking has not progressed beyond the delivery deadline' },
      { code: 'wrong_address', label: 'Delivery was made to the wrong address or recipient' },
      { code: 'partial_shipment', label: 'Only part of a multi-package shipment arrived' }
    ]
  },
  {
    code: 'authenticity_safety',
    label: 'Authenticity, safety, or documentation concern',
    description: 'Serious concerns that require specialist review.',
    policyRelevant: false,
    minEvidenceCount: 2,
    conditions: ALL_CONDITIONS,
    subreasons: [
      { code: 'suspected_counterfeit', label: 'Suspected counterfeit or altered identity' },
      { code: 'altered_serial', label: 'Serial number, data plate, mark, or label appears altered' },
      { code: 'safety_risk', label: 'Product presents an undisclosed safety risk' }
    ]
  }
];

const ISSUE_TAXONOMY_MAP = ISSUE_TAXONOMY.reduce((acc, t) => {
  acc[t.code] = t;
  return acc;
}, {});

module.exports = { ISSUE_TAXONOMY, ISSUE_TAXONOMY_MAP, ALL_CONDITIONS };