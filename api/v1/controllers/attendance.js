const { errors } = require("../utils/constants");
const success = require("../utils/constants").successMessages;
const ClassControllers = require("./class");
const StudentControllers = require("./student");
const mongoose = require("mongoose");

async function postAttendanceForMultipleStudents(req, res) {
  var errMsg = null;
  if (!req.body.attendance) errMsg = "Attendance field is required";
  else if (!Array.isArray(req.body.attendance))
    errMsg = "Attendance field must be an array";
  else if (req.body.attendance.length < 1)
    errMsg = "Attendance field is required";
  else if (!req.body.classId) errMsg = "Class Id is required";
  else if (!req.body.subjectId) errMsg = "Subject Id is required";
  else if (!req.body.date) errMsg = "Date is required";

  /*

  */

  var sDate = null;
  try {
    sDate = Date.parse(req.body.date);
  } catch (err) {
    errMsg = "Invalid date format";
  }

  if (errMsg)
    return res.status(400).json({
      status: errors.FAILED,
      message: errMsg,
    });

  const classId = mongoose.Types.ObjectId(req.body.classId);

  const classData = await ClassControllers.getClassByIdAndProjection(classId, {
    students: 1,
    subjects: 1,
  });

  if (!classData || !classData._id) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Class not found",
    });
  }

  // check if subject is available
  const subject = new String(req.body.subjectId).trim();
  var isValidSubject = false;

  classData.subjects.forEach((e) => {
    const s = new String(e.subjectId).trim();
    // console.log(s);
    // console.log(subject);
    // console.log(s == subject);
    if (s == subject) {
      isValidSubject = true;
    }
  });
  if (!isValidSubject) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Invalid subject",
    });
  }

  // "studentId": "60bcb42809db206581791442",
  // "hours": 1,

  const canPostAttendance = await await ClassControllers.getClassCountByConditionAndProjection(
    { _id: classId, attendance: { $in: [sDate] } }
  );
  if (canPostAttendance == 1) {
    await StudentControllers.postAttendanceForASubject(classData.students);

    return res.status(200).json({
      status: success.SUCCESS,
      message: "Attendance posted successfully",
    });
  } else {
    return res.status(403).json({
      status: errors.FAILED,
      message:
        "Attendance slot is not enabled on this day, please ask your moderator to enable slot",
    });
  }
}

async function createAttendanceSlot(req, res) {
  //  const instituteId = req.institute._id;

  var errMsg = null;
  if (!req.body.classId) errMsg = "Class Id is required";
  else if (!req.body.date) errMsg = "Date is required";
  else if (!req.body.subjects) errMsg = "Subjects are required";

  var sDate = null;
  try {
    sDate = Date.parse(req.body.date);
  } catch (err) {
    errMsg = "Invalid date format";
  }

  if (errMsg)
    return res.status(400).json({
      status: errors.FAILED,
      message: errMsg,
    });

  const classId = mongoose.Types.ObjectId(req.body.classId);

  const classData = await ClassControllers.getClassByIdAndProjection(classId, {
    students: 1,
    subjects: 1,
  });

  if (!classData || !classData._id) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Class not found",
    });
  }

  const subjectsList = [];
  var totalHours = 0;
  classData.subjects.forEach((e) => {
    var hoursForThisSubject = req.body.subjects[e.subjectId.toString().trim()];
    totalHours += hoursForThisSubject;
    subjectsList.push({
      subjectId: mongoose.Types.ObjectId(e.subjectId.toString()),
      maxHours: hoursForThisSubject ?? 0,
    });
  });

  if (totalHours > 8) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Total hours cannot exceed 8",
    });
  }

  const subjectsMap = {
    date: sDate,
    subjects: subjectsList,
  };

  // check if slot is already created for the specific date
  const alreadyAvailable = await ClassControllers.checkIfSlotIsCreated(
    classId,
    sDate
  );
  // console.log(alreadyAvailable);
  if (alreadyAvailable >= 1) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Attendance slot already created for that date",
    });
  }

  const result = await ClassControllers.addAttendanceSlot(classId, subjectsMap);

  if (result.n == result.nModified) {
    var subList = [];
    classData.subjects.forEach((e) => {
      subList.push({
        subId: e.subjectId,
        hours: 0,
      });
    });

    const attSlot = {
      date: sDate,
      classId: classData._id,
      attendance: subList,
    };

    // create slots in students list also
    const updateResult = await StudentControllers.createAttendanceSlots(
      classData.students,
      attSlot
    );
    //console.log(updateResult);
    if (updateResult.n == updateResult.nModified) {
      return res.status(201).json({
        status: success.SUCCESS,
        message: "Attendance slot created",
      });
    } else {
      return res.status(403).json({
        status: errors.FAILED,
        message:
          "Failed to create attendance slot for students, please contact admin",
      });
    }
  } else {
    return res.status(403).json({
      status: errors.FAILED,
      message: "Failed to create attendance slot",
    });
  }
}

module.exports = {
  postAttendanceForMultipleStudents,
  createAttendanceSlot,
};
