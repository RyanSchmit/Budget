// This app runs single-user with no authentication. Every table still
// carries a `user_id` so the data migrated out of the previous hosted
// setup keeps working unchanged, so each request is stamped with one
// fixed id instead of one decoded from a token.
//
// LOCAL_USER_ID must match the user_id already present on the migrated
// rows, otherwise existing data will be invisible to the API.
const LOCAL_USER_ID = process.env.LOCAL_USER_ID;
const LOCAL_USER_EMAIL = process.env.LOCAL_USER_EMAIL || "local@localhost";

if (!LOCAL_USER_ID) {
  throw new Error("LOCAL_USER_ID is not set — check your .env file");
}

function localUser(req, _res, next) {
  req.user = { id: LOCAL_USER_ID, email: LOCAL_USER_EMAIL };
  next();
}

module.exports = localUser;
module.exports.LOCAL_USER_ID = LOCAL_USER_ID;
