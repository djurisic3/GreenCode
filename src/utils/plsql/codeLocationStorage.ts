import * as vscode from 'vscode';

interface LocationWithSeverity {
  range: vscode.Range;
  severity: 'high' | 'medium';
}

let locations: LocationWithSeverity[] = [];

export function addLocation(range: vscode.Range, severity: 'high' | 'medium'): void {
  locations.push({ range, severity });
}

export function getLocations(severity: 'high' | 'medium'): vscode.Range[] {
  return locations.filter(loc => loc.severity === severity).map(loc => loc.range);
}

export function clearLocations(): void {
  locations = [];
}

export function removeLocation(range: vscode.Range, severity: 'high' | 'medium'): void {
    locations = locations.filter(loc => loc.severity !== severity || !loc.range.isEqual(range));
  }
  