let globalMediumOccurrenceCounter = 0;
let globalCriticalOccurrenceCounter = 0;

export function incrementCounter() {
  globalMediumOccurrenceCounter++;
}

export function decrementCounter() {
  globalMediumOccurrenceCounter--;
}

export function resetCounter() {
  globalMediumOccurrenceCounter = 0;
}

export function getCounter() {
  return globalMediumOccurrenceCounter;
}

export function incrementCounterCritical() {
  globalCriticalOccurrenceCounter++;
}

export function decrementCounterCritical() {
  globalCriticalOccurrenceCounter--;
}

export function resetCounterCritical() {
  globalCriticalOccurrenceCounter = 0;
}

export function getCounterCritical() {
  return globalCriticalOccurrenceCounter;
}