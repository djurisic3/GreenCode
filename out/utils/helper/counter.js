"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCounterCritical = exports.resetCounterCritical = exports.decrementCounterCritical = exports.incrementCounterCritical = exports.getCounter = exports.resetCounter = exports.decrementCounter = exports.incrementCounter = void 0;
let globalMediumOccurrenceCounter = 0;
let globalCriticalOccurrenceCounter = 0;
function incrementCounter() {
    globalMediumOccurrenceCounter++;
}
exports.incrementCounter = incrementCounter;
function decrementCounter() {
    globalMediumOccurrenceCounter--;
}
exports.decrementCounter = decrementCounter;
function resetCounter() {
    globalMediumOccurrenceCounter = 0;
}
exports.resetCounter = resetCounter;
function getCounter() {
    return globalMediumOccurrenceCounter;
}
exports.getCounter = getCounter;
function incrementCounterCritical() {
    globalCriticalOccurrenceCounter++;
}
exports.incrementCounterCritical = incrementCounterCritical;
function decrementCounterCritical() {
    globalCriticalOccurrenceCounter--;
}
exports.decrementCounterCritical = decrementCounterCritical;
function resetCounterCritical() {
    globalCriticalOccurrenceCounter = 0;
}
exports.resetCounterCritical = resetCounterCritical;
function getCounterCritical() {
    return globalCriticalOccurrenceCounter;
}
exports.getCounterCritical = getCounterCritical;
//# sourceMappingURL=counter.js.map