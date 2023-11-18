"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeLocation = exports.clearLocations = exports.getLocations = exports.addLocation = void 0;
let locations = [];
function addLocation(range, severity) {
    locations.push({ range, severity });
}
exports.addLocation = addLocation;
function getLocations(severity) {
    return locations
        .filter((loc) => loc.severity === severity)
        .map((loc) => loc.range);
}
exports.getLocations = getLocations;
function clearLocations(severity) {
    locations = locations.filter((loc) => loc.severity !== severity);
}
exports.clearLocations = clearLocations;
function removeLocation(range, severity) {
    locations = locations.filter((loc) => loc.severity !== severity || !loc.range.isEqual(range));
}
exports.removeLocation = removeLocation;
//# sourceMappingURL=codeLocationStorage.js.map