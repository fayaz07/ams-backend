const Class = require("../models/class");
const { errors } = require("../utils/constants");
const success = require("../utils/constants").successMessages;
const { getSubjectsIdsFromIdsArray } = require("./subject");
const UserControllers = require("./user");
const mongoose = require("mongoose");

async function createClass(req, res) {
  var errMsg = null;
  if (!req.body.name) errMsg = "Class name is required";
  else if (!req.body.subjects) errMsg = "Subjects are required";
  else if (!Array.isArray(req.body.subjects))
    errMsg = "Subjects must be an array";
  else if (req.body.subjects.length < 1)
    errMsg = "Atleast one subject is required";

  if (errMsg)
    return res.status(400).json({
      status: errors.FAILED,
      message: errMsg,
    });

  const instituteId = req.authUser.instituteId;

  // fetch subjects
  const subjects = await getSubjectsIdsFromIdsArray(
    req.body.subjects,
    instituteId
  );
  var subIds = [];

  subjects.forEach((e) => {
    subIds.push({
      subjectId: e._id,
      teacherId: null,
    });
  });

  //  console.log(subIds);

  if (subIds.length < 1) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Sujects must be valid",
    });
  }

  const subject = new Class({
    name: req.body.name,
    instituteId: req.authUser.instituteId,
    createdBy: req.authUser.userId,
    subjects: subIds,
  });

  try {
    const saved = await subject.save();
    return res.status(201).json({
      status: success.SUCCESS,
      message: "Created new class",
      data: {
        class: saved,
      },
    });
  } catch (err) {
    return res.status(403).json({
      status: errors.FAILED,
      message: "Unable to create class",
    });
  }
}

async function getAllClassesOfInstitute(req, res) {
  const classes = await Class.find(
    {
      instituteId: req.authUser.instituteId,
    },
    { "subjects._id": 0 }
  );
  return res.status(200).json({
    status: success.SUCCESS,
    message: "Fetched all classes of your institute",
    data: {
      classes: classes,
    },
  });
}

async function assignClassTeacher(req, res) {
  const teacher = await UserControllers.fetchInstituteIdByUserId(
    req.body.teacherId
  );
  if (!teacher || !teacher._id) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Teacher profile not found",
    });
  }

  if (teacher.instituteId.toString() != req.authUser.instituteId.toString()) {
    return res.status(401).json({
      status: errors.FAILED,
      message: "Teacher can't be made class teacher",
    });
  }

  if (!req.body.classId) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Class Id is required",
    });
  }

  const classInstance = await getClassById(req.body.classId);
  if (!classInstance || !classInstance._id) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Class not found",
    });
  }

  if (
    classInstance.instituteId.toString() != req.authUser.instituteId.toString()
  ) {
    return res.status(401).json({
      status: errors.FAILED,
      message: "Can't perform this operation",
    });
  }

  try {
    if (
      classInstance.classTeacher &&
      classInstance.classTeacher.toString().length > 5
    ) {
      return res.status(400).json({
        status: errors.FAILED,
        message: "Class teacher already assigned",
      });
    }

    classInstance.classTeacher = teacher._id;
    const updated = await classInstance.save();
    if (updated) {
      return res.status(200).json({
        status: success.SUCCESS,
        message: "Class teacher set",
      });
    } else {
      return res.status(403).json({
        status: errors.FAILED,
        message: "Unable to set class teacher, please try later",
      });
    }
  } catch (err) {
    return res.status(403).json({
      status: errors.FAILED,
      message: "Unable to set class teacher, please try later",
      error: err,
    });
  }
}

async function getClassById(id) {
  return await Class.findById(mongoose.Types.ObjectId(id.toString()));
}

async function assignSubjectTeacher(req, res) {
  // fetch teacher
  const teacher = await UserControllers.fetchInstituteIdByUserId(
    req.body.teacherId
  );
  if (!teacher || !teacher._id) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Teacher profile not found",
    });
  }

  if (teacher.instituteId.toString() != req.authUser.instituteId.toString()) {
    return res.status(401).json({
      status: errors.FAILED,
      message: "Teacher can't be made class teacher",
    });
  }

  if (!req.body.classId) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Class Id is required",
    });
  }

  if (!req.body.subjectId) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Subject Id is required",
    });
  }

  const classInstance = await getClassById(req.body.classId);
  if (!classInstance || !classInstance._id) {
    return res.status(400).json({
      status: errors.FAILED,
      message: "Class not found",
    });
  }

  if (
    classInstance.instituteId.toString() != req.authUser.instituteId.toString()
  ) {
    return res.status(401).json({
      status: errors.FAILED,
      message: "Can't perform this operation",
    });
  }

  try {
    var subIndex = -1;

    // check if already assigned to any other subject
    // if subjectId matches, then store the index
    for (var i = 0; i < classInstance.subjects.length; i++) {
      const currSubject = classInstance.subjects[i];
      const subA = new String(currSubject.subjectId).trim();
      const subB = new String(req.body.subjectId).trim();

      const teacherA = new String(currSubject.teacherId).trim();
      const teacherB = new String(teacher._id).trim();

      // console.log("\n" + teacherA + "\n" + teacherB);
      // console.log(teacherA == teacherB);

      // teacher already assigned to some subject
      if (currSubject.teacherId && teacherA == teacherB) {
        return res.status(400).json({
          status: errors.FAILED,
          message:
            currSubject.subjectId.toString() === req.body.subjectId.toString()
              ? "Teacher already assigned to the specific subject"
              : "Teacher already assigned to other subject",
        });
      }

      // console.log(a == b);

      if (subA == subB) {
        subIndex = i;
      }
    }

    if (subIndex == -1) {
      return res.status(400).json({
        status: errors.FAILED,
        message: "Specified subject not assigned to this class",
      });
    }
    // console.log(subIndex);
    const subTeacher = classInstance.subjects[subIndex];
    subTeacher.teacherId = teacher._id;

    classInstance.subjects[i] = subTeacher;

    const updated = await classInstance.save();
    if (updated) {
      return res.status(200).json({
        status: success.SUCCESS,
        message: "Subject teacher assigned",
      });
    } else {
      return res.status(403).json({
        status: errors.FAILED,
        message: "Unable to assign Subject teacher, please try later",
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(403).json({
      status: errors.FAILED,
      message: "Unable to assign Subject teacher, please try later",
      error: err,
    });
  }
}

async function addStudentToClass(classId, studentId) {
  const updated = await Class.updateOne(
    { _id: classId },
    { $addToSet: { students: studentId } }
  );
  return updated;
}

async function addAttendanceSlot(classId, date) {
  return await Class.updateOne(
    { _id: classId },
    { $addToSet: { attendance: date } }
  );
}

async function checkIfSlotIsCreated(classId, sDate) {
  // console.log(sDate);
  return await Class.find({
    _id: classId,
    attendance: { $elemMatch: { date: sDate } },
  }).countDocuments();
}

async function getClassByIdAndProjection(id, projection) {
  return await Class.findById(
    mongoose.Types.ObjectId(id.toString()),
    projection
  );
}

async function getClassCountByConditionAndProjection(condition, projection) {
  return await Class.find(condition, projection).countDocuments();
}

module.exports = {
  createClass,
  getClassByIdAndProjection,
  addStudentToClass,
  assignSubjectTeacher,
  getAllClassesOfInstitute,
  assignClassTeacher,
  getClassById,
  addAttendanceSlot,
  getClassCountByConditionAndProjection,
  checkIfSlotIsCreated,
};
