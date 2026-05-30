import type { Dictionary } from "./types";

const en: Dictionary = {
  // App
  appName: "Shtegu",
  appTagline: "Hiking trails across Albania — discover, plan, navigate.",

  // Nav/layout
  allTrails: "All trails",
  feedbackLink: "Feedback",
  navExplore: "Explore",
  navNearMe: "Near Me",
  navSaved: "Saved",
  navSafety: "Safety",
  navActivity: "Activity",
  navCommunity: "Community",
  navGear: "Gear",
  navCompare: "Compare",

  // Footer
  footerDisclaimer:
    "Shtegu is a planning aid, not a navigation device. Routes may be approximate — hike responsibly.",
  footerSafetyLink: "Safety & disclaimer",

  // Trail list
  searchPlaceholder: "Search by name or region…",
  allDifficulties: "All difficulties",
  trailCount: "{filtered} of {total} trails",
  noTrailsFound: "No trails match your search.",
  filterDifficultyLabel: "Difficulty",
  filterRegionLabel: "Region",
  filterAllRegions: "All regions",
  regionNorth: "North & North-East",
  regionWest: "West",
  regionSouthEast: "South-East",
  regionSouth: "South",

  // Trail detail
  distance: "Distance",
  ascent: "Ascent",
  duration: "Duration",
  season: "Season",
  loadingMap: "Loading map…",
  navigate: "Navigate (use my location)",
  stopNavigation: "Stop navigation",
  locationOff: "Location off",
  elevation: "Elevation",
  weather: "Weather",
  logistics: "Getting there & logistics",
  reviews: "Reviews",
  routeSource: "Route data: {source}",
  accuracy: "±{m} m",

  // Difficulty
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
  expert: "Expert",

  // Safety notice (compact)
  safetyShort:
    "⚠️ Routes and stats may be approximate or outdated — don't rely on Shtegu as your only navigation. Check conditions, carry a map, and hike responsibly.",
  safetyDisclaimerLink: "Safety & disclaimer",

  // Safety page
  safetyBackHome: "← Home",
  safetyHeading: "Safety & Disclaimer",
  safetyIntro: "Please read this before relying on Shtegu in the mountains.",
  safetyPlanningTitle: "A planning tool, not a navigation device",
  safetyPlanningBody:
    "Shtegu is an information and planning tool. It is not a certified navigation system. Do not rely on it as your only means of finding your way. Always carry an offline map, compass and/or a dedicated GPS, and know how to use them.",
  safetyDataTitle: "Trail data may be approximate or wrong",
  safetyDataBody:
    "Routes come from OpenStreetMap and community sources. Some are hand-traced approximations and may be inaccurate, outdated, or incomplete. Distance, ascent, difficulty, weather and points of interest are estimates derived from third-party data and can be incorrect. Verify conditions locally before you set out.",
  safetyRiskTitle: "Hiking carries real risk",
  safetyRiskBody:
    "Mountain terrain, fast-changing weather, river crossings, wildlife and remoteness can be dangerous. The Albanian Alps in particular are remote, with limited mobile coverage and limited rescue services. You are responsible for your own safety:",
  safetyRiskList: [
    "Plan your route and check the forecast before leaving.",
    "Tell someone your plan and expected return time.",
    "Carry enough water, food, warm/waterproof layers and a first-aid kit.",
    "Assess your own fitness and experience honestly, and turn back when needed.",
    "Do not hike alone in remote areas if you can avoid it.",
  ],
  safetyEmergencyTitle: "Emergency",
  safetyEmergencyBody:
    "In Albania, the general emergency number is 112. Coverage may be unavailable in remote valleys — plan accordingly.",
  safetyLiabilityTitle: "Limitation of liability",
  safetyLiabilityBody:
    'Shtegu is provided "as is", without warranty of any kind. To the fullest extent permitted by law, the authors and contributors accept no liability for any injury, loss, or damage arising from use of this app or reliance on its data. Use it at your own risk.',
  safetyAttributionTitle: "Data & attribution",
  safetyAttributionBody:
    "Map data © OpenStreetMap contributors (ODbL). Basemap tiles © Protomaps. Weather and elevation via Open-Meteo. Points of interest via the OpenStreetMap Overpass API.",

  // Feedback
  feedbackBackLink: "← All trails",
  feedbackHeading: "Feedback",
  feedbackSubheading:
    "Found a bug, wrong trail data, or have an idea? Tell us — complaints and suggestions both welcome.",
  feedbackNoConfig:
    "Feedback needs a Formspree form ID. Add NEXT_PUBLIC_FORMSPREE_ID to .env.local to enable the form.",
  feedbackSuccess: "Thank you — your feedback was sent. 🙏",
  feedbackTypeLabel: "Type",
  feedbackSuggestion: "Suggestion",
  feedbackComplaint: "Complaint",
  feedbackOther: "Other",
  feedbackMessageLabel: "Message",
  feedbackMessagePlaceholder: "What's on your mind? Bugs, missing trails, wrong data, ideas…",
  feedbackEmailLabel: "Email",
  feedbackEmailHint: "(optional, if you want a reply)",
  feedbackEmailPlaceholder: "you@example.com",
  feedbackSendButton: "Send feedback",
  feedbackSending: "Sending…",
  feedbackErrorWait: "Please wait a few seconds before sending again.",
  feedbackErrorFail: "Couldn't send — please try again.",

  // Near me page
  nearMeHeading: "Trails near me",
  nearMeSubheading: "Share your location to see the closest trailheads, nearest first.",

  // Nearby component
  findNearMe: "Find trails near me",
  updateLocation: "Update my location",
  locating: "Locating you…",
  locationError: "Couldn't get your location: {error}",
  locationDenied: "Permission denied",
  locationUnavailable: "Location unavailable",
  locationTimeout: "Timed out — try again",
  locationUnsupported: "Geolocation not supported",
  locationDeniedHelp: "Click the lock icon in your address bar and allow 'Location' for this site, then retry.",
  locationRetry: "Try again",
  nearbyBrowseFallback: "Browse trails by region",
  locationPrompt: 'Tap "Find trails near me" to enable location and see the closest trails.',
  nearestTrails: "Showing the {count} nearest trails by straight-line distance.",
  nearestTrail: "Showing the {count} nearest trail by straight-line distance.",
  noTrailsAvailable: "No trails available.",
  distanceMeters: "{m} m away",
  distanceKm: "{km} km away",

  // Map
  trailhead: "Trailhead",
  destination: "Destination",
  downloadOfflineMap: "Download offline map",
  downloading: "Downloading…",
  offlineMapReady: "Offline map ready ✓",
  downloadFailed: "Download failed — retry",
  pointsOfInterest: "Points of interest",
  mapAria: "Map of {name}",
  poiWater: "Water",
  poiSpring: "Spring",
  poiViewpoint: "Viewpoint",
  poiHut: "Hut",
  poiPass: "Pass",

  // Elevation
  loadingElevation: "Loading elevation…",
  elevationUnavailable: "Elevation data unavailable.",
  elevationAria: "Elevation profile: elevation in metres versus distance in kilometres",
  elevationMin: "Min {m} m",
  elevationMax: "Max {m} m",
  elevationTotalAscent: "Total ascent {m} m",
  elevationUnitM: "m",
  elevationStartKm: "0 km",
  elevationEndKm: "{km} km",

  // Weather
  loadingWeather: "Loading weather…",
  weatherUnavailable: "Weather unavailable.",
  weatherToday: "Today",
  weatherWind: "wind {kph} km/h",

  // Reviews
  reviewsNoConfig:
    "Reviews need Supabase configured. Add your keys to .env.local to enable community reviews.",
  reviewsSignInRequired: "Sign in with your email to leave a review.",
  reviewsNamePlaceholder: "Your name (optional)",
  reviewsRatingLabel: "Rating",
  reviewsRatingOption: "{n} ★",
  reviewsRatingAria: "{n} out of 5",
  reviewsTextPlaceholder: "How was the trail? Conditions, tips, warnings…",
  reviewsPost: "Post a review",
  reviewsPosting: "Posting…",
  reviewsErrorWait: "Please wait a few seconds before posting again.",
  reviewsErrorSession: "Couldn't start a session — try again.",
  reviewsErrorDuplicate: "You've already reviewed this trail.",
  reviewsErrorTooMany: "You've posted several reviews recently — try again later.",
  reviewsErrorFail: "Couldn't post — please try again.",
  reviewsNone: "No reviews yet — be the first.",
  reviewsGuestBadge: "guest",
  reviewsMember: "Member",
  reviewsAnonymous: "Anonymous",

  // Auth
  authLoading: "…",
  authSignOut: "Sign out",
  authEmailPlaceholder: "you@example.com",
  authSendMagicLink: "Send magic link",
  authSending: "Sending…",
  authCheckInbox: "Check your inbox for a magic link.",
  authError: "Try again.",

  // Theme toggle
  themeSwitchLight: "Switch to light mode",
  themeSwitchDark: "Switch to dark mode",

  // Language toggle
  langAlbanian: "SQ",
  langEnglish: "EN",

  // Home hero
  homeEyebrow: "Albania · Alpine Trails",
  homeHeroTagline: "Discover Albania's mountain trails.",
  homeTrailsLabel: "trails",
  homeRegionsLabel: "regions",
  homeCountryLabel: "Albania",
  heroFeaturedTrail: "Featured Trail",
  heroViewTrail: "View Trail",
  heroSaveTrail: "Save Trail",
  heroSavedTrail: "Saved",
  heroStatDistance: "Distance",
  heroStatElevation: "Elevation Gain",
  heroStatTime: "Est. Time",

  // Footer
  footerColophon: "Shtegu — Alpine Trails in Albania",
  footerMadeWith: "Made with care for Albania's mountains.",

  // Trail edit / contributions
  editSuggestButton: "Suggest an edit",
  editModalTitle: "Suggest a correction",
  editModalDesc: "All fields are pre-filled — only change what needs fixing. Your edit will be reviewed before going live.",
  editNameLabel: "Trail name (English)",
  editNameSqLabel: "Trail name (Albanian)",
  editRegionLabel: "Region",
  editSummaryLabel: "Description",
  editDifficultyLabel: "Difficulty",
  editDistanceLabel: "Distance (km)",
  editAscentLabel: "Ascent (m)",
  editDurationLabel: "Duration (h)",
  editBestMonthsLabel: "Best months",
  editLogisticsLabel: "Logistics (one item per line)",
  editRouteLabel: "Route file (.gpx, .kml, .kmz, .tcx, .fit, .geojson)",
  editRouteHint: "Upload a corrected route file to replace the existing geometry.",
  editRouteSelected: "File: {name}",
  editRouteParsed: "{n} points parsed.",
  editRouteError: "Couldn't read this file — try a .gpx or .geojson.",
  editMessageLabel: "Reason for this change",
  editMessagePlaceholder: "What's wrong? What are you fixing?",
  editSubmit: "Submit for review",
  editSubmitting: "Submitting…",
  editSuccess: "Thank you — your edit has been submitted and will be reviewed before going live.",
  editErrorFail: "Couldn't submit — please try again.",
  editCancel: "Cancel",
  editNoConfig: "Contributions require Supabase. Add your keys to .env.local.",

  // Condition reports
  conditionHeading: "Current Conditions",
  conditionGood: "Good",
  conditionMuddy: "Muddy",
  conditionOvergrown: "Overgrown",
  conditionClosed: "Closed",
  conditionNone: "No recent condition reports.",
  conditionSubmit: "Report condition",
  conditionSubmitting: "Submitting…",
  conditionNotes: "Notes (optional)",
  conditionErrorWait: "Please wait 24 hours before reporting again.",
  conditionErrorFail: "Couldn't submit — please try again.",
  conditionReportedAgo: "{days} days ago",
  conditionToday: "Today",

  // Photos
  photosHeading: "Photos",
  photosUpload: "Add photo",
  photosUploading: "Uploading…",
  photosNone: "No photos yet — be the first!",
  photosErrorSize: "File must be under 5 MB",
  photosErrorUpload: "Upload failed",

  // GPX download
  downloadGpx: "Download GPX",

  // Saved trails / bookmarks
  savedHeading: "Saved Trails",
  savedEmpty: "No saved trails yet. Tap the bookmark on any trail to save it.",
  savedBookmark: "Save trail",
  savedUnsave: "Remove bookmark",

  // Activity page
  activityHeading: "My Activity",
  activityTotalHikes: "Hikes",
  activityTotalKm: "km hiked",
  activityTotalAscent: "m ascent",
  activityStreak: "day streak",
  activityLogHike: "Log a hike",
  activityTrailLabel: "Trail",
  activityDateLabel: "Date",
  activityDurationLabel: "Duration (minutes)",
  activityNotesLabel: "Notes",
  activitySubmit: "Log hike",
  activitySubmitting: "Saving…",
  activityNone: "No hikes logged yet. Start exploring!",
  activitySignInPrompt: "Sign in to track your hikes and see your stats.",
  activityDelete: "Delete",

  // Gear checklist
  gearHeading: "Gear Checklist",
  gearSubheading: "Everything you need before heading into the Albanian mountains.",
  gearBackHome: "← Home",
  gearProgress: "{done} of {total} packed",
  gearReset: "Reset",
  gearAllDone: "You're ready to go! 🎒",
  gearItemsOf: "{done}/{total}",

  // Share
  shareButton: "Share",
  shareCopied: "Copied!",

  // Log hike (quick link from trail detail)
  logHikeButton: "Log this hike",

  // GPX import
  gpxImportButton: "Import GPX",
  gpxImportHeading: "Imported route",
  gpxImportClear: "Clear",
  gpxImportError: "Couldn't read GPX file",
  gpxImportDistance: "Distance",

  // Trail comparison
  compareHeading: "Compare Trails",
  compareSubheading: "Select two trails to compare side by side.",
  comparePickFirst: "Trail A",
  comparePickSecond: "Trail B",
  comparePickPlaceholder: "Pick a trail…",
  compareBackHome: "← All trails",
  compareDistance: "Distance",
  compareAscent: "Ascent",
  compareDuration: "Duration",
  compareDifficulty: "Difficulty",
  compareSeason: "Season",
  compareRegion: "Region",
  compareDescription: "Description",
  compareNoTrails: "No trails found.",
  compareEmptyState: "Select two trails above to compare them side by side.",

  // Trail proposals
  proposeButton: "Propose a trail",
  proposeModalTitle: "Propose a New Trail",
  proposeModalDesc: "Know a trail that isn't listed yet? Fill in the details and attach a GPX or GeoJSON file — we'll review it and add it to the map.",
  proposeNotes: "Notes for the reviewer",
  proposeNotesPlaceholder: "Anything the reviewer should know: access, seasonal closures, source of the route data…",
  proposeRouteHint: "Attach a GPX or GeoJSON to place the trail on the map. Without a file it can still be reviewed but won't appear until geometry is added.",
  proposeSubmit: "Submit proposal",
  proposeSubmitting: "Submitting…",
  proposeSuccess: "Thank you — your trail proposal has been submitted and will be reviewed before going live.",
  proposeErrorFail: "Couldn't submit — please try again.",
};

export default en;
