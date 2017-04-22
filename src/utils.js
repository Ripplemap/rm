// for making conditional class making easier in react
export const classMaker = (a, b, class_1, class_2) => a === b ? class_1: class_2

// check if a string is a date for applying condition formatting to years.
// I should use indexOf to check against an array of dates but ¯\_(ツ)_/¯
export function isDate(str) {
  for (var i = 1999; i < 2050; i++) {
    if (str === i) return true
  }
  return false
}
