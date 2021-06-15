const { errors } = require("../utils/constants");
const success = require("../utils/constants").successMessages;
const ClassControllers = require("./class");
const StudentControllers = require("./student");
const mongoose = require("mongoose");
const Class = require("../models/class");

async function postAttendanceForSingleSubject(req, res) {
  var errMsg = null;
  if (!req.body.students) errMsg = "Students map field is required";
  // else if (!Array.isArray(req.body.attendance))
  //   errMsg = "Attendance field must be an array";
  // else if (!(req.body.students instanceof Set))
  //   errMsg = "Students field must be an Map";
  // else if (req.body.students.keys.length < 1)
  //   errMsg = "Students field is required";
  else if (!req.body.classId) errMsg = "Class Id is required";
  else if (!req.body.subjectId) errMsg = "Subject Id is required";
  else if (!req.body.date) errMsg = "Date is required";

  var sDate = null;
  try {
    sDate = new Date(Date.parse(req.body.date));
  } catch (err) {
    errMsg = "Invalid date format";
  }

  if (errMsg)
    return res.status(400).json({
      status: errors.FAILED,
      message: errMsg,
    });

  // console.log(sDate);
  // console.log(sDate.toISOString());

  const classId = mongoose.Types.ObjectId(req.body.classId);

  const classData = await Class.findOne(
    { _id: classId },
    { attendance: { $elemMatch: { date: sDate } }, students: 1 }
  );

  if (!classData || classData.attendance.length == 0) {
    return res.status(403).json({
      status: errors.FAILED,
      message:
        "Attendance slot is not enabled on this day, please ask your moderator to enable slot",
    });
  }

  // console.log(classData);

  const slot = classData.attendance[0];
  // console.log(slot);

  // check if subject is present in the class's subjects and attendanceAlreadyPosted
  const subject = new String(req.body.subjectId).trim();
  var isValidSubject = false,
    alreadyPosted = false;
  var maxHoursForThisSubject = 0;
  var sIndex = -1;

  slot.subjects.forEach((e) => {
    const s = new String(e.subjectId).trim();
    // console.log(s);
    // console.log(subject);
    // console.log(s == subject);
    // console.log(e);
    if (s == subject) {
      isValidSubject = true;
      alreadyPosted = e.posted;
      maxHoursForThisSubject = e.maxHours;
    }
    sIndex++;
  });
  var subjectError = null;
  if (!isValidSubject) {
    subjectError = "SubjectId is not valid";
  }
  if (alreadyPosted) {
    subjectError = "Attendance for this subject already posted";
  }
  if (subjectError) {
    return res.status(403).json({
      status: errors.FAILED,
      message: subjectError,
    });
  }
  // console.log(classData);

  // run through students list and check if all students are available
  var unavailableStudents = [];
  var attendanceList = {};
  classData.students.forEach((e) => {
    const sid = e.toString().trim();
    var hrs = req.body.students[sid];
    if (!hrs && hrs != 0) {
      unavailableStudents.push(sid);
    } else {
      if (hrs > maxHoursForThisSubject) {
        hrs = maxHoursForThisSubject;
      }
      attendanceList[e] = hrs ?? 0;
      // attendanceList.set(e, hrs ?? 0);
    }
  });
  if (unavailableStudents.length > 0) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Attendance not specified for following students",
      data: {
        students: unavailableStudents,
      },
    });
  }

  await StudentControllers.postAttendanceForASubject(
    classData.students,
    attendanceList,
    sDate,
    subject
  );
  classData.attendance[0].subjects[sIndex - 1].posted = true;
  await classData.save();

  return res.status(200).json({
    status: success.SUCCESS,
    message: "Attendance posted successfully",
  });
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
    const sid = e.sId.toString().trim();

    var hoursForThisSubject = req.body.subjects[sid];
    // console.log(hoursForThisSubject);
    if (!hoursForThisSubject && hoursForThisSubject != 0) {
      unavailableSubjects.push(sid);
    } else {
      totalHours += hoursForThisSubject;
      subjectsList.push({
        subjectId: e.sId,
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
    var subList = {};
    classData.subjects.forEach((e) => {
      subList[e.sId] = -1;
    });

    const attSlot = {
      date: sDate,
      classId: classData._id,
      subjects: subList,
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

async function getAttSlotForClassAndDate(classId, sDate) {
  // console.log(sDate);
  const cll = await Class.aggregate([
    {
      $match: { _id: classId },
    },
    {
      $limit: 1,
    },
    {
      $group: {
        _id: "$_id",
        attendance: { $addToSet: "$attendance" },
        students: { $addToSet: "$students" },
      },
    },
    { $unwind: "$attendance" },
    {
      $match: { attendance: { $elemMatch: { date: sDate } } },
    },
    {
      $limit: 1,
    },
    {
      $project: {
        attendance: { date: 1, subjects: 1 },
        students: 1,
      },
    },
  ]);
  return cll;
}

module.exports = {
  postAttendanceForSingleSubject,
  createAttendanceSlot,
  getAttendanceSlotsForClass,
};
