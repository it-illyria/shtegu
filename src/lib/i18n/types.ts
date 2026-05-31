/** All user-visible strings in Shtegu. Both sq.ts and en.ts must satisfy this type. */
export interface Dictionary {
  // App
  appName: string;
  appTagline: string;

  // Nav/layout
  allTrails: string;
  feedbackLink: string;
  navExplore: string;
  navNearMe: string;
  navSaved: string;
  navSafety: string;
  navActivity: string;
  navCommunity: string;
  navGear: string;
  navCompare: string;

  // Footer
  footerDisclaimer: string;
  footerSafetyLink: string;

  // Trail list
  searchPlaceholder: string;
  allDifficulties: string;
  /** Template: {filtered}/{total} */
  trailCount: string;
  noTrailsFound: string;
  filterDifficultyLabel: string;
  filterRegionLabel: string;
  filterAllRegions: string;
  regionNorth: string;
  regionWest: string;
  regionSouthEast: string;
  regionSouth: string;

  // Trail detail
  distance: string;
  ascent: string;
  duration: string;
  season: string;
  loadingMap: string;
  navigate: string;
  stopNavigation: string;
  locationOff: string;
  elevation: string;
  weather: string;
  logistics: string;
  reviews: string;
  /** Template: {source} */
  routeSource: string;
  /** Template: {m} */
  accuracy: string;

  // Difficulty
  easy: string;
  moderate: string;
  hard: string;
  expert: string;

  // Safety notice (compact)
  safetyShort: string;
  safetyDisclaimerLink: string;

  // Safety page
  safetyBackHome: string;
  safetyHeading: string;
  safetyIntro: string;
  safetyPlanningTitle: string;
  safetyPlanningBody: string;
  safetyDataTitle: string;
  safetyDataBody: string;
  safetyRiskTitle: string;
  safetyRiskBody: string;
  safetyRiskList: [string, string, string, string, string];
  safetyEmergencyTitle: string;
  safetyEmergencyBody: string;
  safetyLiabilityTitle: string;
  safetyLiabilityBody: string;
  safetyAttributionTitle: string;
  safetyAttributionBody: string;

  // Feedback
  feedbackBackLink: string;
  feedbackHeading: string;
  feedbackSubheading: string;
  feedbackNoConfig: string;
  feedbackSuccess: string;
  feedbackTypeLabel: string;
  feedbackSuggestion: string;
  feedbackComplaint: string;
  feedbackOther: string;
  feedbackMessageLabel: string;
  feedbackMessagePlaceholder: string;
  feedbackEmailLabel: string;
  feedbackEmailHint: string;
  feedbackEmailPlaceholder: string;
  feedbackSendButton: string;
  feedbackSending: string;
  feedbackErrorWait: string;
  feedbackErrorFail: string;

  // Near me page
  nearMeHeading: string;
  nearMeSubheading: string;

  // Nearby component
  findNearMe: string;
  updateLocation: string;
  locating: string;
  /** Template: {error} */
  locationError: string;
  locationDenied: string;
  locationUnavailable: string;
  locationTimeout: string;
  locationUnsupported: string;
  locationDeniedHelp: string;
  locationRetry: string;
  nearbyBrowseFallback: string;
  locationPrompt: string;
  /** Template: {count} */
  nearestTrails: string;
  nearestTrail: string;
  noTrailsAvailable: string;
  /** Template: {m} */
  distanceMeters: string;
  /** Template: {km} */
  distanceKm: string;

  // Map
  trailhead: string;
  trailStartLabel: string;
  trailEndLabel: string;
  destination: string;
  downloadOfflineMap: string;
  downloading: string;
  offlineMapReady: string;
  downloadFailed: string;
  pointsOfInterest: string;
  /** Template: {name} */
  mapAria: string;
  poiWater: string;
  poiSpring: string;
  poiViewpoint: string;
  poiHut: string;
  poiPass: string;

  // Elevation
  loadingElevation: string;
  elevationUnavailable: string;
  elevationAria: string;
  /** Template: {m} */
  elevationMin: string;
  /** Template: {m} */
  elevationMax: string;
  /** Template: {m} */
  elevationTotalAscent: string;
  /** Y-axis unit label on the elevation chart */
  elevationUnitM: string;
  /** X-axis start label on the elevation chart */
  elevationStartKm: string;
  /** Template: {km} — x-axis end label */
  elevationEndKm: string;

  // Weather
  loadingWeather: string;
  weatherUnavailable: string;
  weatherToday: string;
  /** Template: {kph} */
  weatherWind: string;

  // Reviews
  reviewsNoConfig: string;
  reviewsSignInRequired: string;
  reviewsNamePlaceholder: string;
  reviewsRatingLabel: string;
  /** Template: {n} */
  reviewsRatingOption: string;
  /** Template: {n} */
  reviewsRatingAria: string;
  reviewsTextPlaceholder: string;
  reviewsPost: string;
  reviewsPosting: string;
  reviewsErrorWait: string;
  reviewsErrorSession: string;
  reviewsErrorDuplicate: string;
  reviewsErrorTooMany: string;
  reviewsErrorFail: string;
  reviewsNone: string;
  reviewsGuestBadge: string;
  /** Fallback author name for signed-in users without a display name */
  reviewsMember: string;
  /** Fallback author name for anonymous/guest users */
  reviewsAnonymous: string;

  // Auth
  authLoading: string;
  authSignOut: string;
  authEmailPlaceholder: string;
  authSendMagicLink: string;
  authSending: string;
  authCheckInbox: string;
  authError: string;
  /** Template: {seconds} */
  authCooldown: string;

  // Theme toggle
  themeSwitchLight: string;
  themeSwitchDark: string;

  // Language toggle
  langAlbanian: string;
  langEnglish: string;

  // Home hero
  homeEyebrow: string;
  homeHeroTagline: string;
  homeTrailsLabel: string;
  homeRegionsLabel: string;
  homeCountryLabel: string;
  heroFeaturedTrail: string;
  heroViewTrail: string;
  heroSaveTrail: string;
  heroSavedTrail: string;
  heroStatDistance: string;
  heroStatElevation: string;
  heroStatTime: string;

  // Footer
  footerColophon: string;
  footerMadeWith: string;

  // Trail edit / contributions
  editSuggestButton: string;
  editModalTitle: string;
  editModalDesc: string;
  editNameLabel: string;
  editNameSqLabel: string;
  editRegionLabel: string;
  editSummaryLabel: string;
  editDifficultyLabel: string;
  editDistanceLabel: string;
  editAscentLabel: string;
  editDurationLabel: string;
  editBestMonthsLabel: string;
  editLogisticsLabel: string;
  editRouteLabel: string;
  editRouteHint: string;
  /** Template: {name} */
  editRouteSelected: string;
  /** Template: {n} */
  editRouteParsed: string;
  editRouteError: string;
  editMessageLabel: string;
  editMessagePlaceholder: string;
  editSubmit: string;
  editSubmitting: string;
  editSuccess: string;
  editErrorFail: string;
  editCancel: string;
  editNoConfig: string;

  // Condition reports
  conditionHeading: string;
  conditionGood: string;
  conditionMuddy: string;
  conditionOvergrown: string;
  conditionClosed: string;
  conditionNone: string;
  conditionSubmit: string;
  conditionSubmitting: string;
  conditionNotes: string;
  conditionErrorWait: string;
  conditionErrorFail: string;
  /** Template: {days} */
  conditionReportedAgo: string;
  conditionToday: string;

  // Photos
  photosHeading: string;
  photosUpload: string;
  photosUploading: string;
  photosNone: string;
  photosErrorSize: string;
  photosErrorUpload: string;

  // GPX download
  downloadGpx: string;

  // Saved trails / bookmarks
  savedHeading: string;
  savedEmpty: string;
  savedBookmark: string;
  savedUnsave: string;

  // Activity page
  activityHeading: string;
  activityTotalHikes: string;
  activityTotalKm: string;
  activityTotalAscent: string;
  activityStreak: string;
  activityLogHike: string;
  activityTrailLabel: string;
  activityDateLabel: string;
  activityDurationLabel: string;
  activityNotesLabel: string;
  activitySubmit: string;
  activitySubmitting: string;
  activityNone: string;
  activitySignInPrompt: string;
  activityDelete: string;

  // Gear checklist
  gearHeading: string;
  gearSubheading: string;
  gearBackHome: string;
  gearProgress: string;
  gearReset: string;
  gearAllDone: string;
  gearItemsOf: string;

  // Share
  shareButton: string;
  shareCopied: string;

  // Log hike (quick link from trail detail)
  logHikeButton: string;

  // GPX import (near-me page)
  gpxImportButton: string;
  gpxImportHeading: string;
  gpxImportClear: string;
  gpxImportError: string;
  gpxImportDistance: string;

  // Trail comparison page
  compareHeading: string;
  compareSubheading: string;
  comparePickFirst: string;
  comparePickSecond: string;
  comparePickPlaceholder: string;
  compareBackHome: string;
  compareDistance: string;
  compareAscent: string;
  compareDuration: string;
  compareDifficulty: string;
  compareSeason: string;
  compareRegion: string;
  compareDescription: string;
  compareNoTrails: string;
  compareEmptyState: string;

  // Trail proposals (new trail submission)
  proposeButton: string;
  proposeModalTitle: string;
  proposeModalDesc: string;
  proposeNotes: string;
  proposeNotesPlaceholder: string;
  proposeRouteHint: string;
  proposeSubmit: string;
  proposeSubmitting: string;
  proposeSuccess: string;
  proposeErrorFail: string;
}
