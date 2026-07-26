import mongoose from "mongoose";
import AttendanceSheet from "../models/AttendanceSheet.js";
import AttendanceStudent from "../models/AttendanceStudent.js";
import Certificate from "../models/Certificate.js";
import EventReport from "../models/EventReport.js";
import Poster from "../models/Poster.js";

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

export const getDashboardStats = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const [
      totalCertificates,
      generatedCertificates,
      draftCertificates,
      singleCertificates,
      bulkCertificates,
      totalPosters,
      generatedPosters,
      draftPosters,
      totalEventReports,
      generatedEventReports,
      draftEventReports,
      totalAttendanceSheets,
      generatedAttendanceSheets,
      draftAttendanceSheets,
      totalStudents,
      activeStudents
    ] = await Promise.all([
      Certificate.countDocuments(),
      Certificate.countDocuments({ status: "Generated" }),
      Certificate.countDocuments({ status: "Draft" }),
      Certificate.countDocuments({ generationType: "Single" }),
      Certificate.countDocuments({ generationType: "Bulk" }),
      Poster.countDocuments(),
      Poster.countDocuments({ status: "Generated" }),
      Poster.countDocuments({ status: "Draft" }),
      EventReport.countDocuments(),
      EventReport.countDocuments({ status: "Generated" }),
      EventReport.countDocuments({ status: "Draft" }),
      AttendanceSheet.countDocuments(),
      AttendanceSheet.countDocuments({ status: "Generated" }),
      AttendanceSheet.countDocuments({ status: "Draft" }),
      AttendanceStudent.countDocuments(),
      AttendanceStudent.countDocuments({ isActive: true })
    ]);

    return res.status(200).json({
      success: true,
      message: "Dashboard statistics fetched successfully",
      data: {
        certificates: {
          total: totalCertificates,
          generated: generatedCertificates,
          draft: draftCertificates,
          single: singleCertificates,
          bulk: bulkCertificates
        },
        posters: {
          total: totalPosters,
          generated: generatedPosters,
          draft: draftPosters
        },
        eventReports: {
          total: totalEventReports,
          generated: generatedEventReports,
          draft: draftEventReports
        },
        attendanceSheets: {
          total: totalAttendanceSheets,
          generated: generatedAttendanceSheets,
          draft: draftAttendanceSheets
        },
        studentMaster: {
          totalStudents,
          activeStudents
        },
        platform: {
          certificateTemplates: 24,
          posterDesigns: 12,
          modules: 4
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics"
    });
  }
};
