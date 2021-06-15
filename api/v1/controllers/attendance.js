const { errors } = require("../utils/constants");
const success = require("../utils/constants").successMessages;
const ClassControllers = require("./class");
const StudentControllers = require("./student");
const mongoose = require("mongoose");
const Class = require("../models/class");

async function postAttendanceForSingleSubject(req, res) {
  var errMsg = null;
  if (!req.body.attendance) errMsg = "Attendance field is required";
  else if (!Array.isArray(req.body.attendance))
    errMsg = "Attendance field must be an array";
  else if (req.body.attendance.length < 1)
    errMsg = "Attendance field is required";
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
  console.log(req.body);
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

  var unavailableSubjects = [];

  classData.subjects.forEach((e) => {
    // check if unavailable
    const sid = e.subjectId.toString().trim();

    var hoursForThisSubject = req.body.subjects[sid];
    // console.log(hoursForThisSubject);
    if (!hoursForThisSubject && hoursForThisSubject != 0) {
      unavailableSubjects.push(sid);
    } else {
      totalHours += hoursForThisSubject;
      subjectsList.push({
        subjectId: e.subjectId,
        maxHours: hoursForThisSubject ?? 0,
      });
    }
  });

  if (unavailableSubjects.length > 0) {
    return res.status(400).json({
      status: errors.FAILED,
      message:
        "Hours not specified for following subjects: " +
        unavailableSubjects.join(", "),
    });
  }

  if (totalHours > 10 || totalHours < 2) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Total hours must be between 2 and 10",
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

async function getAttendanceSlotsForClass(req, res) {
  if (!req.params.classId) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "ClassId is required",
    });
  }

  const cid = mongoose.Types.ObjectId(req.params.classId);

  const cll = await Class.aggregate([
    {
      $match: { _id: cid },
    },
    {
      $limit: 1,
    },
    {
      $group: { _id: "$_id", attendance: { $addToSet: "$attendance" } },
    },
    { $project: { attendance: { date: 1, subjects: 1 } } },
    { $unwind: "$attendance" },
    {
      $sort: { "attendance.date": 1 },
    },
    {
      $limit: 10,
    },
  ]);
  //console.log(cll);

  return res.status(200).json({
    status: success.SUCCESS,
    message: "Fetched slots",
    data: {
      slots: cll[0].attendance,
    },
  });
}

module.exports = {
  postAttendanceForSingleSubject,
  createAttendanceSlot,
  getAttendanceSlotsForClass,
};
