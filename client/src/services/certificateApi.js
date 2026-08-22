const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const handleResponse = async (response) => {
  if (response.status === 413) {
    throw new Error("Bulk request is too large. Please use smaller signature images or generate a smaller batch.");
  }

  let result;
  try {
    result = await response.json();
  } catch (e) {
    if (!response.ok) {
      if (response.status === 500) {
        throw new Error("Server error while generating certificates. Please try again.");
      }
      throw new Error(`Server returned error code ${response.status}. Please try again.`);
    }
    throw new Error("Invalid response format received from server.");
  }

  if (!response.ok || (result && result.success === false)) {
    throw new Error(result?.message || `Server returned error code ${response.status}. Please try again.`);
  }

  return result;
};

export const createCertificate = async (certificateData) => {
  const response = await fetch(`${API_BASE_URL}/certificates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(certificateData)
  });

  return handleResponse(response);
};

export const bulkCreateCertificates = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/certificates/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return handleResponse(response);
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
