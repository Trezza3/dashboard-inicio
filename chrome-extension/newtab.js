const DASHBOARD_URL = "https://dashboard-inicio.vercel.app";

const fallbackLink = document.getElementById("fallback-link");
if (fallbackLink) {
  fallbackLink.setAttribute("href", DASHBOARD_URL);
}

window.location.replace(DASHBOARD_URL);
