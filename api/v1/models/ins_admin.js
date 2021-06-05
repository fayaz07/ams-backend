// const mongoose = require("mongoose");
// const {
//   INSTITUTE_ADMIN_COLLECTION,
// } = require("../utils/constants").collections;

// const instituteAdminSchema = new mongoose.Schema(
//   {
//     instituteId: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//     },
//     username: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     password: {
//       type: String,
//       required: true,
//     },
//     name: {
//       type: String,
//       required: true,
//     },
//     photoUrl: String,
//     contactNo: String,
//     refreshToken: {
//       type: String,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// module.exports = mongoose.model(
//   INSTITUTE_ADMIN_COLLECTION,
//   instituteAdminSchema
// );
