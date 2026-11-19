
// SEKIFLEX COLLECTIONS - website and live order tracking

document.addEventListener("DOMContentLoaded", () => {
  // Website year
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Mobile navigation
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "×" : "☰";
    });
  }

  // Live customer order tracking
  const trackingForm = document.getElementById("tracking-form");

  if (trackingForm) {
    trackingForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const trackingNumber = document
        .getElementById("tracking-number")
        .value.trim().toUpperCase();

      const phoneLast4 = document
        .getElementById("phone-last4")
        .value.trim();

      const message = document.getElementById("tracking-message");
      const result = document.getElementById("tracking-result");
      const button = trackingForm.querySelector('button[type="submit"]');

      result.replaceChildren();

      if (!/^SC-\d{4}-\d{6}$/.test(trackingNumber)) {
        message.textContent = "Please enter your SC number in this format: SC-2026-000125.";
        return;
      }

      if (!/^\d{4}$/.test(phoneLast4)) {
        message.textContent = "Please enter the last four digits of your registered phone number.";
        return;
      }

      if (
        !window.supabase ||
        !window.SEKIFLEX_SUPABASE_URL ||
        !window.SEKIFLEX_SUPABASE_KEY
      ) {
        message.textContent = "The tracking service is not configured yet. Please try again later.";
        return;
      }

      message.textContent = "Checking your shipment. Please wait...";
      button.disabled = true;

      try {
        const client = window.supabase.createClient(
          window.SEKIFLEX_SUPABASE_URL,
          window.SEKIFLEX_SUPABASE_KEY
        );

        const { data, error } = await client.rpc(
          "track_sekiflex_order",
          {
            p_tracking_number: trackingNumber,
            p_phone_last4: phoneLast4
          }
        );

        if (error) {
          console.error("Tracking lookup error:", error);
          message.textContent = "We couldn't complete your tracking request. Please try again.";
          return;
        }

        const shipment = Array.isArray(data) ? data[0] : data;

        if (!shipment) {
          message.textContent = "We couldn't find a shipment matching those details. Please check your SC number and phone digits.";
          return;
        }

        message.textContent = "Your shipment information was found.";

        const heading = document.createElement("h2");
        heading.textContent = "Shipment details";
        result.appendChild(heading);

        const details = [
          ["Tracking number", shipment.tracking_number],
          ["Current status", shipment.status],
          ["Destination", shipment.destination],
          ["Courier", shipment.courier_name],
          ["Courier waybill", shipment.courier_waybill],
          ["Estimated delivery", shipment.estimated_delivery],
          ["Collection instructions", shipment.collection_instructions]
        ];

        details.forEach(([label, value]) => {
          if (value !== null && value !== undefined && value !== "") {
            const paragraph = document.createElement("p");
            const strong = document.createElement("strong");
            strong.textContent = label + ": ";
            paragraph.appendChild(strong);
            paragraph.appendChild(document.createTextNode(String(value)));
            result.appendChild(paragraph);
          }
        });

        if (shipment.updated_at) {
          const updated = document.createElement("small");
          updated.textContent =
            "Last updated: " + new Date(shipment.updated_at).toLocaleString();
          result.appendChild(updated);
        }

      } catch (error) {
        console.error("Tracking error:", error);
        message.textContent = "Something went wrong. Please try again later.";
      } finally {
        button.disabled = false;
      }
    });
  }

  // Admin preview remains unchanged for now
  const adminForm = document.getElementById("order-preview-form");

  if (adminForm) {
    adminForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const message = document.getElementById("admin-message");

      message.textContent =
        "Form preview only. Secure staff sign-in and database registration must be completed before live order registration.";
    });
  }
});
          
