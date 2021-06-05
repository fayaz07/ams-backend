// const mongoose = require("mongoose");
// const {
//   INSTITUTE_MODERATOR_COLLECTION,
// } = require("../utils/constants").collections;

// const instituteModeratorSchema = new mongoose.Schema(
//   {
//     instituteId: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//     },
//     createdBy: {
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
//   INSTITUTE_MODERATOR_COLLECTION,
//   instituteModeratorSchema
// );
