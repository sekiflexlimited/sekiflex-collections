// SEKIFLEX COLLECTIONS - public site interactions.
// Live tracking and secure order storage will be connected in the next backend phase.
document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "×" : "☰";
    });
  }

  const trackingForm = document.getElementById("tracking-form");
  if (trackingForm) {
    trackingForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = document.getElementById("tracking-number").value.trim().toUpperCase();
      const message = document.getElementById("tracking-message");
      const valid = /^SC-\d{4}-\d{6}$/.test(value);
      message.textContent = valid
        ? "Your reference format looks correct. Live tracking will be available after the secure order database is connected."
        : "Please enter a reference in this format: SC-2026-000125.";
    });
  }

  const adminForm = document.getElementById("order-preview-form");
  if (adminForm) {
    adminForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const message = document.getElementById("admin-message");
      message.textContent = "Form preview only. No customer information has been saved and no SC number has been issued. Secure sign-in and database connection are required before live registration.";
    });
  }
});
