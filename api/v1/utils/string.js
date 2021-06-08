function createUsername(name) {
  var username;
  const arr = name.split(" ");
  if (arr.length > 1) {
    username = arr[arr.length - 1] + "." + arr[0].toString().substring(0, 1);
  } else {
    username = name;
  }
  return username.toLowerCase();
}

function removeSpecialChars(name) {
  return name
    .replace(/[^\w\s]/gi, "")
    .replace("_", "")
    .toString();
}

module.exports = {
  removeSpecialChars,
  createUsername,
};
