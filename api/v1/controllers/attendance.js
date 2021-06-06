const { errors } = require("../utils/constants");
const success = require("../utils/constants").successMessages;
const ClassControllers = require("./class");
const StudentControllers = require("./student");
const mongoose = require("mongoose");

async function postAttendance(req, res) {
  const instituteId = req.institute._id;

  var errMsg = null;
  if (!req.body.studentId) errMsg = "Student Id is required";
  else if (!req.body.classId) errMsg = "Class Id is required";
  else if (!req.body.subjectId) errMsg = "Subject Id is required";
  else if (!req.body.date) errMsg = "Date is required";

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

  const classInstance = await ClassControllers.getClassById(req.body.classId);

  if (!classInstance || !classInstance._id) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Class not found",
    });
  }

  const enabledDays = classInstance.attendance.filter((e) => e == sDate);
  if (enabledDays != 1) {
    return res.status(400).json({
      status: errors.FAILED,
      message:
        "Attendance is not enabled on this day, please ask your moderator to enable the attendance",
    });
  }
}

async function createAttendanceSlot(req, res) {
  //  const instituteId = req.institute._id;

  var errMsg = null;
  if (!req.body.classId) errMsg = "Class Id is required";
  else if (!req.body.date) errMsg = "Date is required";

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

  const result = await ClassControllers.addAttendanceSlot(classId, sDate);

  if (result.n == result.nModified) {
    var subjectsList = [];

    classData.subjects.forEach((e) => {
      subjectsList.push({
        subId: e.subjectId,
        hours: 0,
      });
    });

    const attSlot = {
      date: sDate,
      classId: classData._id,
      attendance: subjectsList,
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
  postAttendance,
  createAttendanceSlot,
};
