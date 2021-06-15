const Student = require("../models/student");
const { errors } = require("../utils/constants");
const success = require("../utils/constants").successMessages;
const ClassControllers = require("./class");

async function createStudent(req, res) {
  var errMsg = null;
  if (!req.body.name) errMsg = "Student name is required";
  else if (!req.body.classId) errMsg = "Class Id is required";
  else if (!req.body.rollNumber) errMsg = "Roll Number Id is required";

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

  const student = new Student({
    name: req.body.name,
    instituteId: req.authUser.instituteId,
    createdBy: req.authUser.userId,
    classId: classInstance._id,
    rollNumber: req.body.rollNumber,
    phone: req.body.phone,
  });

  try {
    const saved = await student.save();
    // const addToClass =
    await ClassControllers.addStudentToClass(classInstance._id, student._id);
    // console.log(addToClass);
    return res.status(201).json({
      status: success.SUCCESS,
      message: "Created new Student",
      data: {
        student: saved,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(403).json({
      status: errors.FAILED,
      message: "Unable to create student",
      error: err,
    });
  }
}

async function getStudentsCountByInstituteId(instituteId) {
  return Student.find({ instituteId: instituteId }).countDocuments();
}

async function createAttendanceSlots(students, attendanceSlot) {
  return Student.updateMany(
    { _id: students },
    { $addToSet: { attendance: attendanceSlot } }
  );
}

async function postAttendanceForASubject(
  students,
  attendanceList,
  sDate,
  subjectId
) {
  // console.log(students);
  // console.log(attendanceList);
  // console.log(attendanceList[students[0]]);
  students.forEach(async (st) => {
    const stData = await Student.findOne(
      { _id: st },
      { attendance: { $elemMatch: { date: sDate } } }
    );
    // console.log(stData.attendance[0].subjects);
    // console.log(attendanceList[st]);
    stData.attendance[0].subjects.set(subjectId, attendanceList[st]);
    // console.log(stData.attendance[0].subjects);
    // console.log("----------------");
    await stData.save();
  });

  // const cursor = Student.aggregate([
  //   {
  //     $match: { _id: { $in: students } },
  //   },
  //   {
  //     $group: {
  //       _id: "$_id",
  //       attendance: { $addToSet: "$attendance" },
  //     },
  //   },
  //   { $unwind: "$attendance" },
  //   {
  //     $match: { attendance: { $elemMatch: { date: sDate } } },
  //   },
  //   {
  //     $limit: 1,
  //   },
  //   {
  //     $project: {
  //       attendance: { subjects: 1 },
  //     },
  //   },
  // ]).cursor();
  // // .exec();
  // cursor.then((v) => {
  //   console.log(v);
  // });
  // cursor.eachAsync(async (doc) => {
  //   // console.log(attendanceList[doc._id]);
  //   // console.log(doc.attendance[0].subjects);
  //   // doc.attendance[0].subjects[subjectId] = attendanceList[doc._id];
  //   // console.log(doc.attendance[0].subjects);
  //   console.log(typeof doc);
  // });
}

async function getListOfStudentsByIds(studentIds) {
  return await Student.find(
    { _id: { $in: studentIds } },
    { attendance: 0, createdAt: 0, updatedAt: 0, __v: 0 }
  );
}

async function getAllStudents(req, res) {
  const students = await Student.find(
    { instituteId: req.institute._id },
    { attendance: 0, createdAt: 0, updatedAt: 0, __v: 0 }
  );

  return res.status(200).json({
    status: success.SUCCESS,
    message: "Fetched students of institute",
    data: {
      students: students,
    },
  });
}

async function getStudentsOfClass(req, res) {
  if (!req.params.id) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "ClassId is required",
    });
  }

  const classInstance = await ClassControllers.getClassByIdAndProjection(
    req.params.id,
    {
      students: 1,
    }
  );
  //console.log(classInstance);

  if (classInstance.students.length == 0) {
    return res.status(200).json({
      status: success.SUCCESS,
      message: "There are currently no students in the class",
    });
  }

  const students = await getListOfStudentsByIds(classInstance.students);

  return res.status(200).json({
    status: success.SUCCESS,
    message: "Fetched students of class",
    data: {
      students: students,
    },
  });
}

module.exports = {
  createStudent,
  getAllStudents,
  getListOfStudentsByIds,
  getStudentsCountByInstituteId,
  createAttendanceSlots,
  postAttendanceForASubject,
  getStudentsOfClass,
};
