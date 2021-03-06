const { errors } = require("../utils/constants");
const success = require("../utils/constants").successMessages;
const ClassControllers = require("./class");
const StudentControllers = require("./student");
const mongoose = require("mongoose");
const Class = require("../models/class");
const Calendar = require("../utils/calendar");
const Student = require("../models/student");
const Subject = require("../models/subject");
const AccountContants = require("../utils/constants").account;

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
    sDate = Calendar.makeTimeZeroForDate(sDate);
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
    {
      attendance: { $elemMatch: { date: sDate } },
      students: 1,
      subjects: 1,
      classTeacher: 1,
    }
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
  });

  // req.role
  // check if the user is admin/moderator
  if (
    req.role != AccountContants.accRoles.instituteAdmin &&
    req.role != AccountContants.accRoles.instituteModerator
  ) {
    // not admin or not moderator
    // check if the accessing user is classTeacher or current subject's teacher
    if (classData.classTeacher.toString() != req.authUser.userId.toString()) {
      let isSubjectTeacher = false;
      classData.subjects.forEach((sub) => {
        const s = new String(sub.sId).trim();
        // console.log(sub);
        if (s == subject) {
          if (sub.tId.toString() == req.authUser.userId.toString()) {
            isSubjectTeacher = true;
          }
        }
      });
      if (!isSubjectTeacher) {
        return res.status(403).json({
          status: errors.FAILED,
          message: "You are not allowed to post attendance",
        });
      }
    }
  }

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
  classData.attendance[0].subjects.forEach((sub) => {
    if (sub.subjectId.toString() == subject) {
      sub.posted = true;
    }
  });
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
    sDate = Calendar.makeTimeZeroForDate(sDate);
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
    startDate: 1,
    endDate: 1,
  });

  if (!classData || !classData._id) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Class not found",
    });
  }

  if (sDate < classData.startDate || sDate > classData.endDate) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Slots can only be created within the academic year",
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
      subList[e.sId] = 0;
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
  var errMsg = null;

  if (!req.query.classId) {
    errMsg = "ClassId is required";
  }
  if (!req.query.month) {
    errMsg = "Month is required";
  }
  if (req.query.month < 1 || req.query.month > 12) {
    errMsg = "Invalid value for month";
  }
  if (!req.query.year) {
    errMsg = "Year is required";
  }
  if (req.query.year < 2021 || req.query.year > 2030) {
    errMsg = "Invalid value for year";
  }

  if (errMsg)
    return res.status(400).json({
      status: errors.FAILED,
      message: errMsg,
    });

  const cid = mongoose.Types.ObjectId(req.query.classId);
  const { start, end } = Calendar.getStartEndDatesByMonthYear(
    req.query.month,
    req.query.year
  );

  if (req.query.subjects) {
    const cll = await slotsWithSubjects(cid, start, end);

    if (cll.length > 0) console.log(cll[0].attendance);

    return res.status(200).json({
      status: success.SUCCESS,
      message: "Fetched slots with subjects",
      data: {
        slots: cll,
      },
    });
  } else {
    const cll = await slotsWithOutSubjects(cid, start, end);

    return res.status(200).json({
      status: success.SUCCESS,
      message: "Fetched slots",
      data: {
        slots: cll,
      },
    });
  }
}

async function slotsWithSubjects(cid, start, end) {
  const cll = await Class.aggregate([
    {
      $match: { _id: cid },
    },
    {
      $project: {
        attendance: {
          $filter: {
            input: "$attendance",
            as: "arr",
            cond: {
              $and: [
                { $gte: ["$$arr.date", start] },
                { $lte: ["$$arr.date", end] },
              ],
            },
          },
        },
      },
    },
  ]);
  var res = {};
  if (cll.length > 0) {
    cll[0].attendance.forEach((e) => {
      res[new Date(e.date).toISOString()] = e.subjects;
    });
  }

  return res;
}

async function slotsWithOutSubjects(cid, start, end) {
  const cll = await Class.aggregate([
    {
      $match: { _id: cid },
    },
    {
      $project: {
        attendance: {
          $filter: {
            input: "$attendance",
            as: "arr",
            cond: {
              $and: [
                { $gte: ["$$arr.date", start] },
                { $lte: ["$$arr.date", end] },
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        "attendance.subjects": 0,
      },
    },
  ]);

  var res = [];
  if (cll.length > 0) {
    cll[0].attendance.forEach((e) => {
      res.push(e.date);
    });
  }

  return res;
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

async function getStudentAttendanceReportByMonth(req, res) {
  var errMsg = null;

  if (!req.query.studentId) {
    errMsg = "StudentId is required";
  }
  if (!req.query.month) {
    errMsg = "Month is required";
  }
  if (req.query.month < 1 || req.query.month > 12) {
    errMsg = "Invalid value for month";
  }
  if (!req.query.year) {
    errMsg = "Year is required";
  }
  if (req.query.year < 2021 || req.query.year > 2030) {
    errMsg = "Invalid value for year";
  }

  if (errMsg)
    return res.status(400).json({
      status: errors.FAILED,
      message: errMsg,
    });

  const sId = mongoose.Types.ObjectId(req.query.studentId);
  const { start, end } = Calendar.getStartEndDatesByMonthYear(
    req.query.month,
    req.query.year
  );

  const studentAttendance = await Student.aggregate([
    {
      $match: { _id: sId },
    },
    {
      $project: {
        classId: 1,
        attendance: {
          $filter: {
            input: "$attendance",
            as: "arr",
            cond: {
              $and: [
                { $gte: ["$$arr.date", start] },
                { $lte: ["$$arr.date", end] },
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        attendance: {
          classId: 0,
          date: 0,
        },
      },
    },
  ]);
  // console.log(studentAttendance[0]);
  // console.log(studentAttendance[0].attendance);

  const maxHoursSubjectMap = await Class.aggregate([
    {
      $match: { _id: studentAttendance[0].classId },
    },
    {
      $project: {
        subjects: 1,
        attendance: {
          $filter: {
            input: "$attendance",
            as: "arr",
            cond: {
              $and: [
                { $gte: ["$$arr.date", start] },
                { $lte: ["$$arr.date", end] },
              ],
            },
          },
        },
      },
    },
  ]);

  // console.log(maxHoursSubjectMap);
  // console.log(maxHoursSubjectMap[0].attendance);

  var report = {};

  const temp = maxHoursSubjectMap[0].subjects;
  for (i = 0; i < temp.length; i++) {
    // console.log(temp[i]);
    const t = temp[i];
    report[t.sId.toString()] = { tId: t.tId, attended: 0, held: 0 };
  }

  const studentArr = studentAttendance[0].attendance;
  const subArr = maxHoursSubjectMap[0].attendance;

  for (var i = 0; i < studentArr.length; i++) {
    // attendance slots total
    subArr[i].subjects.forEach((ss) => {
      // if (ss.posted) {
      // console.log(ss);
      // console.log(report.get(ss.subjectId.toString()));
      // console.log(st.subjects[ss.subjectId.toString()]);
      // console.log("-------------");
      // }
      const t = report[ss.subjectId.toString()];
      t.attended += parseInt(studentArr[i].subjects[ss.subjectId.toString()]);
      t.held += parseInt(ss.maxHours);
      report[ss.subjectId.toString()] = t;
    });
  }

  // console.log(report);

  /*
    {
      sub: {
      teacher: 
      attended:
      held:
      }
    }
  */

  return res.status(200).json({
    status: success.SUCCESS,
    message: "Fetched attendance report",
    data: {
      report: report,
      startDate: start,
      endDate: end,
    },
  });
}

async function getClassAttendanceReportByMonth(req, res) {
  var errMsg = null;

  if (!req.query.classId) {
    errMsg = "ClassId is required";
  }
  if (!req.query.month) {
    errMsg = "Month is required";
  }
  if (req.query.month < 1 || req.query.month > 12) {
    errMsg = "Invalid value for month";
  }
  if (!req.query.year) {
    errMsg = "Year is required";
  }
  if (req.query.year < 2021 || req.query.year > 2030) {
    errMsg = "Invalid value for year";
  }

  if (errMsg)
    return res.status(400).json({
      status: errors.FAILED,
      message: errMsg,
    });

  const cId = mongoose.Types.ObjectId(req.query.classId);
  const { start, end } = Calendar.getStartEndDatesByMonthYear(
    req.query.month,
    req.query.year
  );

  const classAttendanceHours = await Class.aggregate([
    {
      $match: { _id: cId },
    },
    {
      $project: {
        subjects: 1,
        // students: 1,
        attendance: {
          $filter: {
            input: "$attendance",
            as: "arr",
            cond: {
              $and: [
                { $gte: ["$$arr.date", start] },
                { $lte: ["$$arr.date", end] },
              ],
            },
          },
        },
      },
    },
  ]);
  // console.log(classAttendanceHours);
  // console.log(classAttendanceHours[0].attendance);

  // building student-teacher map and sub-hours map model
  /**
   *  {
   *    sub1: 4,
   *    sub2: 3
   *  }
   */
  const subHoursMapModel = {};
  const subjectTeacherMap = {};

  const subjectsTeachersArr = classAttendanceHours[0].subjects;
  const subjectsArr = [];
  for (i = 0; i < subjectsTeachersArr.length; i++) {
    // console.log(temp[i]);
    const t = subjectsTeachersArr[i];
    subjectTeacherMap[t.sId.toString()] = t.tId;
    subHoursMapModel[t.sId.toString()] = 0;
    subjectsArr.push(t.sId);
  }

  // pull subjects
  const subjectNames = await Subject.find({ _id: subjectsArr }, { name: 1 });

  const subjectNamesMap = {};
  for (var i = 0; i < subjectNames.length; i++) {
    subjectNamesMap[subjectNames[i]._id.toString()] = subjectNames[i].name;
  }

  // console.log(subHoursMap);
  // console.log(subjectTeacherMap);

  /**
   *  {
   *    date1: {
   *      sub1: 4,
   *      sub2: 3
   *    }
   *  }
   */
  const subHoursMap = Object.assign({}, subHoursMapModel);
  // build dates - subjects - heldHours map
  const attendanceArr = classAttendanceHours[0].attendance;
  for (i = 0; i < attendanceArr.length; i++) {
    // console.log(attendanceArr[i]);
    const t = attendanceArr[i];
    t.subjects.forEach((s) => {
      if (s.posted) {
        subHoursMap[s.subjectId.toString()] += parseInt(s.maxHours);
      }
    });
  }
  // console.log(subHoursMap);
  // console.log(subHoursMapModel);

  const studentsArr = await Student.aggregate([
    {
      $match: { classId: cId },
    },
    {
      $project: {
        // classId: 1,
        name: 1,
        rollNumber: 1,
        attendance: {
          $filter: {
            input: "$attendance",
            as: "arr",
            cond: {
              $and: [
                { $gte: ["$$arr.date", start] },
                { $lte: ["$$arr.date", end] },
                { $eq: ["$$arr.classId", cId] },
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        attendance: {
          classId: 0,
          date: 0,
        },
      },
    },
  ]);
  // console.log(studentsArr[0]);
  // console.log(studentAttendance[0].attendance);

  const stAttReport = [];

  // loop through students
  for (i = 0; i < studentsArr.length; i++) {
    const student = studentsArr[i];
    const report = Object.assign({}, subHoursMapModel);

    // looping through attendances
    // console.log("Initial report");
    student.attendance.forEach((subs) => {
      // looping through subjects
      subjectsArr.forEach((s) => {
        // console.log(s);
        // console.log(subs);
        report[s] += parseInt(subs.subjects[s]);
      });
    });
    // console.log(report);
    // console.log("report end --------");

    const subAttendance = {};
    for (const [key, value] of Object.entries(report)) {
      // console.log(key, value);
      subAttendance[subjectNamesMap[key]] = value;
    }

    const st = {};
    st.id = student.rollNumber;
    st.name = student.name;
    st.subjects = subAttendance;
    stAttReport.push(st);
  }

  const heldHrsWithSubNames = {};
  for (const [key, value] of Object.entries(subHoursMap)) {
    // console.log(key, value);
    heldHrsWithSubNames[subjectNamesMap[key]] = value;
  }

  return res.status(200).json({
    status: success.SUCCESS,
    message: "Fetched attendance report for class",
    data: {
      // subjects: subjectNamesMap,
      report: stAttReport,
      held: heldHrsWithSubNames,
      startDate: start,
      endDate: end,
    },
  });
}

module.exports = {
  postAttendanceForSingleSubject,
  createAttendanceSlot,
  getAttendanceSlotsForClass,
  getAttSlotForClassAndDate,
  getStudentAttendanceReportByMonth,
  getClassAttendanceReportByMonth,
};
