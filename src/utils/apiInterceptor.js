// src/utils/apiInterceptor.js
import { toast } from "react-toastify";

/**
 * Centralized API response interceptor that handles token expiration
 * Automatically clears storage and redirects to login when token expires
 */
export const handleApiResponse = async (response) => {
  // If response is 401 Unauthorized, clear session and redirect
  if (response.status === 401) {
    // Clear all storage
    localStorage.removeItem("token");
    sessionStorage.clear();
    
    // Set a flag to show toast on login page
    sessionStorage.setItem("sessionExpired", "true");
    
    // Show toast notification with countdown
    let countdown = 3;
    const toastId = toast.error(
      `Session expired. Redirecting to login in ${countdown} seconds...`,
      {
        position: "top-center",
        autoClose: false,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
      }
    );
    
    // Update countdown every second
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        toast.update(toastId, {
          render: `Session expired. Redirecting to login in ${countdown} seconds...`,
        });
      } else {
        clearInterval(countdownInterval);
      }
    }, 1000);
    
    // Redirect after 3 seconds
    setTimeout(() => {
      clearInterval(countdownInterval);
      toast.dismiss(toastId);
      window.location.href = "/login";
    }, 3000);
    
    // Throw error to stop further processing
    throw new Error("Session expired. Please login again.");
  }
  
  return response;
};

/**
 * Enhanced fetch wrapper with automatic token expiration handling
 */
export const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  
  // Add Authorization header if token exists
  const headers = {
    ...options.headers,
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // Check for 401 and handle token expiration
    await handleApiResponse(response);
    
    return response;
  } catch (error) {
    // If it's a network error or our custom error, propagate it
    throw error;
  }
};