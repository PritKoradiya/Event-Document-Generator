const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const handleResponse = async (response) => {
  if (response.status === 413) {
    const error = new Error("Certificate PDF or bulk request is too large. The limit is 5 MB.");
    error.status = 413;
    error.code = "PDF_TOO_LARGE";
    throw error;
  }

  let result;
  try {
    result = await response.json();
  } catch (e) {
    if (!response.ok) {
      const error = new Error(
        response.status === 500
          ? "Server error while processing request. Please try again."
          : `Server returned error code ${response.status}. Please try again.`
      );
      error.status = response.status;
      throw error;
    }
    const error = new Error("Invalid response format received from server.");
    error.status = response.status;
    throw error;
  }

  if (!response.ok || (result && result.success === false)) {
    const error = new Error(result?.message || `Server returned error code ${response.status}. Please try again.`);
    error.status = response.status;
    error.code = result?.code;
    error.data = result;
    throw error;
  }

  return result;
};

export const createCertificate = async (certificateData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/certificates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(certificateData)
    });

    return handleResponse(response);
  } catch (error) {
    if (error.name === "TypeError" && error.message && error.message.toLowerCase().includes("fetch")) {
      const netError = new Error("Unable to connect to the certificate server. Please check that the backend server is running and try again.");
      netError.status = 0;
      netError.isNetworkError = true;
      throw netError;
    }
    throw error;
  }
};

export const bulkCreateCertificates = async (payload) => {
  try {
    const response = await fetch(`${API_BASE_URL}/certificates/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return handleResponse(response);
  } catch (error) {
    if (error.name === "TypeError" && error.message && error.message.toLowerCase().includes("fetch")) {
      const netError = new Error("Unable to connect to the certificate server. Please check that the backend server is running and try again.");
      netError.status = 0;
      netError.isNetworkError = true;
      throw netError;
    }
    throw error;
  }
};

export const saveDraftCertificate = async (certificateData) => {
  const response = await fetch(`${API_BASE_URL}/certificates/draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(certificateData)
  });

  return handleResponse(response);
};

export const getCertificates = async () => {
  const response = await fetch(`${API_BASE_URL}/certificates`);

  return handleResponse(response);
};

export const getCertificateById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/certificates/${id}`);

  return handleResponse(response);
};

export const updateCertificate = async (id, certificateData) => {
  const response = await fetch(`${API_BASE_URL}/certificates/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(certificateData)
  });

  return handleResponse(response);
};

export const deleteCertificate = async (id) => {
  const response = await fetch(`${API_BASE_URL}/certificates/${id}`, {
    method: "DELETE"
  });

  return handleResponse(response);
};

export const sendCertificateEmail = async (id, payload = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/certificates/${id}/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return handleResponse(response);
  } catch (error) {
    if (error.name === "TypeError" && error.message && error.message.toLowerCase().includes("fetch")) {
      const netError = new Error("Unable to connect to the email service. Please check that the server is running.");
      netError.status = 0;
      netError.isNetworkError = true;
      throw netError;
    }
    throw error;
  }
};

export const sendAllCertificateEmails = async (certificateIds) => {
  try {
    const response = await fetch(`${API_BASE_URL}/certificates/send-all-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ certificateIds })
    });

    return handleResponse(response);
  } catch (error) {
    if (error.name === "TypeError" && error.message && error.message.toLowerCase().includes("fetch")) {
      const netError = new Error("Unable to connect to the email service. Please check that the server is running.");
      netError.status = 0;
      netError.isNetworkError = true;
      throw netError;
    }
    throw error;
  }
};

export const retryCertificateEmail = async (id, payload = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/certificates/${id}/retry-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return handleResponse(response);
  } catch (error) {
    if (error.name === "TypeError" && error.message && error.message.toLowerCase().includes("fetch")) {
      const netError = new Error("Unable to connect to the email service. Please check that the server is running.");
      netError.status = 0;
      netError.isNetworkError = true;
      throw netError;
    }
    throw error;
  }
};

export const getCertificateEmailStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/certificates/email-status`);
  return handleResponse(response);
};

export const getEmailHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/email/health`);
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      configured: false,
      connected: false,
      message: "Unable to check email service status."
    };
  }
};

export default {
  createCertificate,
  bulkCreateCertificates,
  saveDraftCertificate,
  getCertificates,
  getCertificateById,
  updateCertificate,
  deleteCertificate,
  sendCertificateEmail,
  sendAllCertificateEmails,
  retryCertificateEmail,
  getCertificateEmailStatus,
  getEmailHealth
};
