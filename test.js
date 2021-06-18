function makeTimeZeroForDate(date) {
  return new Date(Date.parse(date.toString().substr(0, 10) + "T00:00:00.000Z"));
}

console.log(makeTimeZeroForDate("2021-06-15T18:30:00.000Z"));
