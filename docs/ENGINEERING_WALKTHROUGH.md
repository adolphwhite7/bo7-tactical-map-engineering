# Engineering walkthrough

## Coordinate spaces are an explicit contract

The map system distinguishes coordinates in the playable region from coordinates in the complete image. The stored position is expressed as a percentage of the playable region; border margins reserve the non-playable part of the image.

For the horizontal axis, the forward transform is:

```text
displayX = left + (rawX / 100) × (100 − left − right)
```

The inverse transform removes the margin and rescales the remaining width. Vertical coordinates apply the same reasoning with top and bottom margins. [MapScreen.tsx](../client/screens/MapScreen.tsx) contains the UI transforms; the independent [coordinate module](../scripts/map-coordinate-algorithm.js) documents and exposes the conversion workflow for external calibration.

The [coordinate example](../examples/coordinate-review.test.js) deliberately uses unequal margins so that swapping axes or assuming a centered playable area would produce the wrong answer. It also checks a known pixel position and both directions of aspect-preserving viewport layout. The module rounds inverse coordinates to two decimal places and pixel results to whole pixels.

## Rendering and interaction

[MapScreen.tsx](../client/screens/MapScreen.tsx) combines the selected map, current dimensions, zoom controls, strategy overlays, and game-mode objectives. Its layout computes the rendered image dimensions while preserving aspect ratio. Markers and labels are separate concerns: the marker identifies a position, while the text needs room and a connector that remains understandable.

[POIMarkerLabel.tsx](../client/components/POIMarkerLabel.tsx) contains label and connector rendering. [CalibratableDot.tsx](../client/components/CalibratableDot.tsx) and [CalibratableLabel.tsx](../client/components/CalibratableLabel.tsx) expose direct manipulation for the calibration workflow. The map screen persists calibration state with AsyncStorage and can send development calibration updates to a configured backend.

The reviewable design question is how one coordinate contract moves through source data, dragging, local persistence, and display. The separate conversion module makes that contract inspectable without the map artwork.

## Tactical information as a separate screen

The typed [navigation stack](../client/navigation/RootStackNavigator.tsx) passes a selected point of interest and map ID to [POIDetailModal.tsx](../client/screens/POIDetailModal.tsx). The detail screen combines descriptive content, a zoomable image, ratings, and a Strategic Advantage Matrix visualization. [SAMRadarChart.tsx](../client/components/SAMRadarChart.tsx) implements the SVG chart and score-card presentation.

This separation lets map navigation concentrate on location and interaction while the detail screen carries richer information. The original tactical-content datasets and associated images remain outside this package.

## Ratings and error handling

[ratingsService.ts](../client/services/ratingsService.ts) uses Firebase transactions to update aggregate count and score, subscriptions to receive changes, and local storage to remember the user's previous rating. The distinction between a first rating and a revised rating is visible in the transaction logic. Its local fallback is also visible for review; a local value is not evidence of a successful backend write.

[ErrorBoundary.tsx](../client/components/ErrorBoundary.tsx) contains React boundary handling. [crashReporter.ts](../client/services/crashReporter.ts) contains the application's Firebase Analytics reporting adapter. The private Firebase configuration and any event records are excluded.

## Tradeoffs and ongoing work

This source favors an explicit map workflow: inspectable JSON-driven map selection, percentage coordinate transforms, and direct calibration controls. It also concentrates substantial interaction state in a large map screen. Separating that state into smaller units is a possible future maintenance direction, not a refactor performed for this portfolio.

The coordinate example uses valid image sizes, aspect ratios, and border configurations. It is not a validator for malformed map data. Mobile rendering, touch ergonomics, backend behavior, and release qualification remain separate from the mathematical checks available here.
