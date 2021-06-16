function getStartEndDatesByMonthYear(month, year) {
  return {
    start: new Date(`${year}-${getMonth(month)}-01T00:00:00.000Z`),
    end: new Date(
      `${year}-${getMonth(month)}-${getEndingDateOfMonth(
        month,
        year
      )}T00:00:00.000Z`
    ),
  };
}

function getMonth(month) {
  if (parseInt(month) > 9) {
    return month;
  }
  return `0${parseInt(month)}`;
}

function getEndingDateOfMonth(month, year) {
  switch (parseInt(month)) {
    case 1:
      return 31;
    case 2:
      if (isLeapYear(year)) {
        return 29;
      }
      return 28;
    case 3:
      return 31;
    case 4:
      return 30;
    case 5:
      return 31;
    case 6:
      return 30;
    case 7:
      return 31;
    case 8:
      return 31;
    case 9:
      return 30;
    case 10:
      return 31;
    case 11:
      return 30;
    case 12:
      return 31;
  }
}

function isLeapYear(year) {
  if ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0) return true;
  return false;
}

module.exports = {
  getStartEndDatesByMonthYear,
};
