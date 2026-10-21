import info from '../version.json';

/** Single source of truth lives in /version.json (bumped on every change, see VERSIONS.md). */
export const APP_VERSION: string = info.version;
