/**
 * Resort Twitter/X handles database
 *
 * To update a handle: just edit the entry below.
 * Set handle to null if a resort doesn't have an active X account.
 *
 * Handles were compiled from known resort social media as of early 2026.
 * Some smaller resorts may have changed handles — verify before tagging.
 */

export interface ResortInfo {
  handle: string | null;
  officialName: string;
  region: string | null;
}

export const RESORT_HANDLES: Record<string, ResortInfo> = {
  // === COLORADO ===
  vail:            { handle: '@VailMtn', officialName: 'Vail Mountain', region: 'Colorado' },
  breckenridge:    { handle: '@Breck', officialName: 'Breckenridge Ski Resort', region: 'Colorado' },
  steamboat:       { handle: '@SteamboatResort', officialName: 'Steamboat Resort', region: 'Colorado' },
  copper:          { handle: '@CopperMtn', officialName: 'Copper Mountain', region: 'Colorado' },
  telluride:       { handle: '@TellurideResort', officialName: 'Telluride Ski Resort', region: 'Colorado' },
  crestedbutte:    { handle: '@SkiCB', officialName: 'Crested Butte Mountain Resort', region: 'Colorado' },
  beavercreek:     { handle: '@BeaverCreek', officialName: 'Beaver Creek Resort', region: 'Colorado' },
  keystone:        { handle: '@KeystoneResort', officialName: 'Keystone Resort', region: 'Colorado' },
  aspenmountain:   { handle: '@AspenSnowmass', officialName: 'Aspen Mountain', region: 'Colorado' },
  aspenhighlands:  { handle: '@AspenSnowmass', officialName: 'Aspen Highlands', region: 'Colorado' },
  buttermilk:      { handle: '@AspenSnowmass', officialName: 'Buttermilk', region: 'Colorado' },

  // === UTAH ===
  parkcity:        { handle: '@ParkCityMtn', officialName: 'Park City Mountain', region: 'Utah' },
  snowbird:        { handle: '@Snowbird', officialName: 'Snowbird', region: 'Utah' },
  deervalley:      { handle: '@DeerValley', officialName: 'Deer Valley Resort', region: 'Utah' },
  solitude:        { handle: '@SolitudeMtn', officialName: 'Solitude Mountain Resort', region: 'Utah' },

  // === CALIFORNIA ===
  mammoth:         { handle: '@MammothMountain', officialName: 'Mammoth Mountain', region: 'California' },
  palisades:       { handle: '@PalisadesTahoe', officialName: 'Palisades Tahoe', region: 'California' },
  heavenly:        { handle: '@SkiHeavenly', officialName: 'Heavenly Mountain Resort', region: 'California' },
  kirkwood:        { handle: '@KirkwoodMtn', officialName: 'Kirkwood Mountain Resort', region: 'California' },
  northstar:       { handle: '@NorthstarTahoe', officialName: 'Northstar California', region: 'California' },
  junemountain:    { handle: '@JuneMountain', officialName: 'June Mountain', region: 'California' },

  // === WYOMING / MONTANA ===
  jacksonhole:     { handle: '@JacksonHole', officialName: 'Jackson Hole Mountain Resort', region: 'Wyoming/Montana' },
  bigsky:          { handle: '@BigSkyResort', officialName: 'Big Sky Resort', region: 'Wyoming/Montana' },

  // === PACIFIC NORTHWEST ===
  stevenspass:     { handle: '@StevensPass', officialName: 'Stevens Pass', region: 'Pacific Northwest' },
  crystal:         { handle: '@CrystalMt', officialName: 'Crystal Mountain', region: 'Pacific Northwest' },

  // === VERMONT ===
  killington:      { handle: '@KillingtonMtn', officialName: 'Killington Resort', region: 'Vermont' },
  stowe:           { handle: '@Stowe_Resort', officialName: 'Stowe Mountain Resort', region: 'Vermont' },
  okemo:           { handle: '@OkemoMountain', officialName: 'Okemo Mountain Resort', region: 'Vermont' },
  sugarbush:       { handle: '@Sugarbush_VT', officialName: 'Sugarbush Resort', region: 'Vermont' },
  stratton:        { handle: '@StrattonResort', officialName: 'Stratton Mountain', region: 'Vermont' },
  mountsnow:       { handle: '@MountSnow', officialName: 'Mount Snow', region: 'Vermont' },

  // === NEW HAMPSHIRE / MAINE ===
  sugarloaf:       { handle: '@SugarloafMtn', officialName: 'Sugarloaf', region: 'New Hampshire/Maine' },
  sundayriver:     { handle: '@SundayRiver', officialName: 'Sunday River', region: 'New Hampshire/Maine' },
  loon:            { handle: '@LoonMtn', officialName: 'Loon Mountain Resort', region: 'New Hampshire/Maine' },
  attitash:        { handle: '@Attitash', officialName: 'Attitash Mountain Resort', region: 'New Hampshire/Maine' },
  mountsunapee:    { handle: '@MtSunapee', officialName: 'Mount Sunapee', region: 'New Hampshire/Maine' },
  wildcat:         { handle: '@SkiWildcat', officialName: 'Wildcat Mountain', region: 'New Hampshire/Maine' },
  crotched:        { handle: '@CrotchedMtn', officialName: 'Crotched Mountain', region: 'New Hampshire/Maine' },

  // === NEW YORK ===
  hunter:          { handle: '@HunterMountain', officialName: 'Hunter Mountain', region: 'New York' },

  // === PENNSYLVANIA ===
  sevensprings:    { handle: '@7SpringsResort', officialName: 'Seven Springs Mountain Resort', region: 'Pennsylvania' },
  liberty:         { handle: '@LibertyMtn', officialName: 'Liberty Mountain Resort', region: 'Pennsylvania' },
  roundtop:        { handle: '@RoundtopMtnRst', officialName: 'Roundtop Mountain Resort', region: 'Pennsylvania' },
  whitetail:       { handle: '@SkiWhitetail', officialName: 'Whitetail Resort', region: 'Pennsylvania' },
  jackfrost:       { handle: '@JFBB_Resort', officialName: 'Jack Frost', region: 'Pennsylvania' },
  bigboulder:      { handle: '@JFBB_Resort', officialName: 'Big Boulder', region: 'Pennsylvania' },
  laurelmountain:  { handle: null, officialName: 'Laurel Mountain', region: 'Pennsylvania' },

  // === MIDWEST ===
  hiddenvalley:    { handle: null, officialName: 'Hidden Valley', region: 'Midwest' },
  mtbrighton:      { handle: '@MtBrighton', officialName: 'Mt. Brighton', region: 'Midwest' },
  wilmot:          { handle: '@WilmotMtn', officialName: 'Wilmot Mountain', region: 'Midwest' },
  madrivermountain:{ handle: null, officialName: 'Mad River Mountain', region: 'Midwest' },
  snowcreek:       { handle: null, officialName: 'Snow Creek', region: 'Midwest' },
  brandywine:      { handle: '@BrandywineOH', officialName: 'Brandywine', region: 'Midwest' },
  paolipeaks:      { handle: null, officialName: 'Paoli Peaks', region: 'Midwest' },
  alpinevalley:    { handle: null, officialName: 'Alpine Valley', region: 'Midwest' },
  bostonmills:     { handle: '@BostonMillsOH', officialName: 'Boston Mills', region: 'Midwest' },
  aftonalps:       { handle: '@AftonAlps', officialName: 'Afton Alps', region: 'Midwest' },

  // === WESTERN CANADA ===
  whistlerblackcomb:{ handle: '@WhistlerBlckcmb', officialName: 'Whistler Blackcomb', region: 'Western Canada' },
  lakelouise:       { handle: '@SkiLouise', officialName: 'Lake Louise Ski Resort', region: 'Western Canada' },
  banff:            { handle: '@SkiBanff', officialName: 'Banff Sunshine Village', region: 'Western Canada' },
  norquay:          { handle: '@MtNorquay', officialName: 'Mt Norquay', region: 'Western Canada' },
  cypressmountain:  { handle: '@CypressMtn', officialName: 'Cypress Mountain', region: 'Western Canada' },

  // === EASTERN CANADA ===
  tremblant:        { handle: '@Tremblant', officialName: 'Mont Tremblant', region: 'Eastern Canada' },
  blue:             { handle: '@BlueMtnResort', officialName: 'Blue Mountain Resort', region: 'Eastern Canada' },
};

/**
 * Get the X handle for a resort. Returns null if not found or no handle.
 */
export function getResortHandle(resortId: string): string | null {
  return RESORT_HANDLES[resortId]?.handle ?? null;
}

/**
 * Get the official name for a resort.
 */
export function getOfficialName(resortId: string): string {
  return RESORT_HANDLES[resortId]?.officialName ?? resortId;
}

/**
 * Format a resort mention for a post.
 * Returns "@Handle" if available, otherwise just the resort name.
 */
export function formatResortMention(resortId: string): string {
  const info = RESORT_HANDLES[resortId];
  if (!info) return resortId;
  return info.handle ? `${info.officialName} (${info.handle})` : info.officialName;
}

/**
 * Get all resorts that have handles (for tagging).
 */
export function getResortsWithHandles(): Array<{ id: string; handle: string; name: string }> {
  return Object.entries(RESORT_HANDLES)
    .filter(([, info]) => info.handle !== null)
    .map(([id, info]) => ({ id, handle: info.handle!, name: info.officialName }));
}
