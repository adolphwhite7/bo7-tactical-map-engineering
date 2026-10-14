# Source selection and dependencies

## Included

The `client/` directory contains selected application source for screens, navigation, map interactions, tactical components, themes, hooks, ratings, image prefetching, and error reporting. `scripts/map-coordinate-algorithm.js` is the application's standalone coordinate utility. These selected source files retain their original contents.

`examples/coordinate-review.test.js`, the small root package manifest, and this documentation were added for this engineering review package. The example imports the existing coordinate utility and supplies example dimensions and points. The app's original game datasets remain outside this package.

## Application boundaries

The full application uses Expo 54, React Native 0.81, React 19, React Navigation, SVG components, Firebase, AsyncStorage, and TanStack Query. The root package manifest here describes only the dependency-free coordinate checks. It is not an installation manifest for the full mobile application.

The omitted application inputs include:

- Map-content JSON files and their associated image registry.
- Game artwork, screenshots, and other binary assets.
- Firebase project configuration and platform build configuration.
- Backend deployment configuration, service credentials, and operational records.

As a result, the selected frontend is available for source review while the coordinate example is directly executable. No mock Firebase backend or replacement game content has been added.

## External integrations visible in source

- `client/lib/query-client.ts` reads `EXPO_PUBLIC_DOMAIN` at runtime. The package supplies no hostname or service configuration.
- The map screen contains a calibration-save route and the home screen contains a development-only file-download route. These are application integration points; no server or operational download content is included.
- `ratingsService.ts` and `crashReporter.ts` import the omitted Firebase configuration. They include integration logic, not credentials, project IDs, stored ratings, or telemetry records.
- The menu retains links to the project's public support site, `https://tacguideapps.com/`, and privacy page. The error-boundary comment links to React documentation. The query helper contains a localhost example in a comment.

Running the advertised coordinate checks does not execute the React Native frontend or contact any of these services.
