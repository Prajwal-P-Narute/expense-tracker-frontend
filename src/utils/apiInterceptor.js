// src/utils/apiInterceptor.js
import { toast } from "react-toastify";

// Guard: once we've triggered the session-expired flow, ignore all subsequent 401/403s
let sessionExpiredHandled = false;

const isAuthError = (status) => status === 401 || status === 403;

/**
 * Centralized API response interceptor that handles token expiration.
 * Treats both 401 and 403 as "session expired" — Spring Security can return
 * either depending on whether the JWT filter populated the security context.
 * Only the FIRST such error among concurrent requests shows a toast + redirect.
 */
export const handleApiResponse = async (response) => {
  if (isAuthError(response.status)) {
    if (!sessionExpiredHandled) {
      sessionExpiredHandled = true;

      localStorage.removeItem("token");
      localStorage.removeItem("userName");
      sessionStorage.clear();

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

      setTimeout(() => {
        clearInterval(countdownInterval);
        toast.dismiss(toastId);
        sessionExpiredHandled = false; // reset for next login session
        window.location.href = "/login";
      }, 3000);
    }

    throw new Error("Session expired. Please login again.");
  }

  return response;
};

/**
 * Enhanced fetch wrapper with automatic token expiration handling.
 */
export const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem("token");

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

    await handleApiResponse(response);

    return response;
  } catch (error) {
    throw error;
  }
};