import { useState, useEffect, useCallback } from "react";
import {
  getAttendanceOptions,
  createDepartment as apiCreateDept,
  updateDepartment as apiUpdateDept,
  deleteDepartment as apiDeleteDept,
  createClass as apiCreateClass,
  updateClass as apiUpdateClass,
  deleteClass as apiDeleteClass
} from "../services/attendanceOptionApi.js";

export function useAttendanceOptions() {
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAttendanceOptions();
      if (res && res.data) {
        setDepartments(res.data.departments || []);
        setClasses(res.data.classes || []);
      }
    } catch (err) {
      console.error("Failed to load attendance options", err);
      setError(err.message || "Failed to load department and class options.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();

    const handleStorage = () => fetchOptions();
    window.addEventListener("attendanceOptionsUpdated", handleStorage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("attendanceOptionsUpdated", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, [fetchOptions]);

  const notifyUpdate = () => {
    try {
      window.dispatchEvent(new Event("attendanceOptionsUpdated"));
    } catch (e) {
      // Ignore
    }
  };

  const getClassesForDepartment = useCallback(
    (deptName, includeInactive = false) => {
      if (!deptName || deptName === "All") return classes;
      const target = (deptName || "").toString().replace(/^[-_\s]+/, "").trim().toUpperCase();
      return classes.filter((c) => {
        const cDept = (c.departmentName || c.departmentCode || c.department || "").toString().replace(/^[-_\s]+/, "").trim().toUpperCase();
        const matchesDept = cDept === target;
        const matchesStatus = includeInactive ? true : (c.isActive ?? ((c.status || "Active") === "Active"));
        return matchesDept && matchesStatus;
      });
    },
    [classes]
  );

  const createDepartment = async (data) => {
    const res = await apiCreateDept(data);
    await fetchOptions();
    notifyUpdate();
    return res;
  };

  const updateDepartment = async (id, data) => {
    const res = await apiUpdateDept(id, data);
    await fetchOptions();
    notifyUpdate();
    return res;
  };

  const deleteDepartment = async (id) => {
    const res = await apiDeleteDept(id);
    await fetchOptions();
    notifyUpdate();
    return res;
  };

  const createClass = async (data) => {
    const res = await apiCreateClass(data);
    await fetchOptions();
    notifyUpdate();
    return res;
  };

  const updateClass = async (id, data) => {
    const res = await apiUpdateClass(id, data);
    await fetchOptions();
    notifyUpdate();
    return res;
  };

  const deleteClass = async (id) => {
    const res = await apiDeleteClass(id);
    await fetchOptions();
    notifyUpdate();
    return res;
  };

  return {
    departments,
    classes,
    loading,
    error,
    refreshOptions: fetchOptions,
    getClassesForDepartment,
    createDepartment,
    addDepartment: createDepartment,
    updateDepartment,
    deleteDepartment,
    createClass,
    addClass: createClass,
    updateClass,
    deleteClass
  };
}

export default useAttendanceOptions;
