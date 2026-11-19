
document.addEventListener("DOMContentLoaded", async () => {
  // SEKIFLEX COLLECTIONS - COMPLETE STAFF AND CUSTOMER SYSTEM

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

  let db = null;

  if (
    window.supabase &&
    window.SEKIFLEX_SUPABASE_URL &&
    window.SEKIFLEX_SUPABASE_KEY
  ) {
    db = window.supabase.createClient(
      window.SEKIFLEX_SUPABASE_URL,
      window.SEKIFLEX_SUPABASE_KEY
    );
  }

  function showMessage(element, message, type = "info") {
    if (!element) return;

    const colors = {
      success: "#16803c",
      error: "#c62828",
      info: "#1769aa"
    };

    element.textContent = message;
    element.style.color = colors[type] || colors.info;
    element.style.fontWeight = "600";
  }

  // STATUS COLOURS

  function getStatusColor(value) {
    const status = String(value || "").toLowerCase();

    if (
      status.includes("delayed") ||
      status.includes("returned") ||
      status.includes("attempted") ||
      status.includes("awaiting payment")
    ) {
      return "#D93636";
    }

    if (
      status.includes("delivered") ||
      status.includes("ready for collection") ||
      status.includes("payment confirmed")
    ) {
      return "#239B59";
    }

    return "#D6A500";
  }

  function addDetail(container, label, value) {
    if (value === null || value === undefined || value === "") return;

    const p = document.createElement("p");
    p.style.margin = "7px 0";
    p.style.fontSize = "14px";
    p.style.overflowWrap = "anywhere";

    const strong = document.createElement("strong");
    strong.textContent = label + ": ";

    const text = document.createElement("span");
    text.textContent = String(value);

    if (
      label === "Customer status" ||
      label === "Shipment status"
    ) {
      text.style.color = getStatusColor(value);
      text.style.fontWeight = "700";
    }

    p.append(strong, text);
    container.appendChild(p);
  }

  function getErrorDetails(error) {
    return [
      error?.message,
      error?.details,
      error?.hint,
      error?.code
    ].filter(Boolean).join(" | ") || "Unknown database error";
  }

  // ESTIMATED DELIVERY DATE

  function getEstimatedDeliveryDate(days) {
    const numberOfDays = Number(days);

    if (
      !Number.isInteger(numberOfDays) ||
      numberOfDays < 1 ||
      numberOfDays > 7
    ) {
      throw new Error(
        "Please select an estimated delivery time from 1 to 7 days."
      );
    }

    const date = new Date();
    date.setDate(date.getDate() + numberOfDays);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // CUSTOMER TRACKING

  const trackingForm = document.getElementById("tracking-form");

  if (trackingForm) {
    trackingForm.addEventListener("submit", async event => {
      event.preventDefault();

      const number = document
        .getElementById("tracking-number")
        .value.trim()
        .toUpperCase();

      const phone = document
        .getElementById("phone-last4")
        .value.trim();

      const message = document.getElementById("tracking-message");
      const result = document.getElementById("tracking-result");
      const button = trackingForm.querySelector('button[type="submit"]');

      result.replaceChildren();

      if (!/^SC-\d{4}-\d{6}$/.test(number)) {
        showMessage(
          message,
          "Please enter a valid SC tracking number.",
          "error"
        );
        return;
      }

      if (!/^\d{4}$/.test(phone)) {
        showMessage(
          message,
          "Please enter the last four digits of your registered phone number.",
          "error"
        );
        return;
      }

      if (!db) {
        showMessage(message, "Tracking service is unavailable.", "error");
        return;
      }

      button.disabled = true;
      showMessage(message, "Checking shipment...", "info");

      try {
        const { data, error } = await db.rpc("track_sekiflex_order", {
          p_tracking_number: number,
          p_phone_last4: phone
        });

        if (error) throw error;

        const shipment = Array.isArray(data) ? data[0] : data;

        if (!shipment) {
          showMessage(
            message,
            "No shipment found. Please check your details.",
            "error"
          );
          return;
        }

        showMessage(
          message,
          "Shipment information found.",
          "success"
        );

        const heading = document.createElement("h2");
        heading.textContent = "Shipment details";
        result.appendChild(heading);

        addDetail(result, "Tracking number", shipment.tracking_number);
        addDetail(result, "Customer status", shipment.status);
        addDetail(result, "Payment status", shipment.payment_status);
        addDetail(result, "Country", shipment.country);
        addDetail(result, "Destination", shipment.destination);
        addDetail(result, "Currency", shipment.currency);

        if (shipment.order_amount != null) {
          addDetail(
            result,
            "Order amount",
            `${shipment.currency || ""} ${shipment.order_amount}`
          );
        }

        if (shipment.delivery_amount != null) {
          addDetail(
            result,
            "Delivery amount",
            `${shipment.currency || ""} ${shipment.delivery_amount}`
          );
        }

        addDetail(result, "Courier", shipment.courier_name);
        addDetail(result, "Courier waybill", shipment.courier_waybill);
        addDetail(result, "Estimated delivery", shipment.estimated_delivery);

        addDetail(
          result,
          "Collection instructions",
          shipment.collection_instructions
        );

        if (shipment.updated_at) {
          const updated = document.createElement("small");
          updated.textContent =
            "Last updated: " +
            new Date(shipment.updated_at).toLocaleString();

          result.appendChild(updated);
        }

      } catch (error) {
        console.error("Tracking error:", error);

        showMessage(
          message,
          "Tracking failed: " + getErrorDetails(error),
          "error"
        );

      } finally {
        button.disabled = false;
      }
    });
  }

  // STAFF DASHBOARD

  const loginSection = document.getElementById("admin-login");
  const dashboard = document.getElementById("admin-dashboard");

  if (!loginSection || !dashboard) return;

  const loginForm = document.getElementById("admin-login-form");
  const loginMessage = document.getElementById("login-message");
  const logoutButton = document.getElementById("admin-logout");
  const orderForm = document.getElementById("order-form");
  const orderMessage = document.getElementById("order-message");
  const ordersList = document.getElementById("orders-list");
  const searchInput = document.getElementById("order-search");

  const statuses = [
    "Awaiting payment",
    "Payment confirmed",
    "Order processing",
    "Package being packed",
    "Package packed and prepared",
    "Awaiting dispatch",
    "Dispatched / handed to courier",
    "In transit",
    "Arrived at destination facility",
    "Ready for collection",
    "Out for delivery",
    "Delivered",
    "Delivery delayed",
    "Delivery attempted",
    "Returned to sender"
  ];

  const paymentStatuses = [
    "Awaiting payment",
    "Payment confirmed"
  ];

  let currentOrders = [];

  function setDashboardVisible(visible) {
    loginSection.hidden = visible;
    dashboard.hidden = !visible;
  }

  // VERIFY STAFF ACCESS

  async function verifyStaff(user) {
    const { data, error } = await db
      .from("staff_members")
      .select("role, active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Staff verification error:", error);
      return false;
    }

    return Boolean(data && data.active === true);
  }

  async function enterDashboard(user) {
    const authorized = await verifyStaff(user);

    if (!authorized) {
      await db.auth.signOut();
      setDashboardVisible(false);

      showMessage(
        loginMessage,
        "This account is not authorized to access the staff dashboard.",
        "error"
      );

      return;
    }

    setDashboardVisible(true);
    await loadOrders();
  }

  // STAFF LOGIN

  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();

      if (!db) {
        showMessage(
          loginMessage,
          "Database connection unavailable.",
          "error"
        );
        return;
      }

      const email = document.getElementById("admin-email").value.trim();
      const password = document.getElementById("admin-password").value;
      const button = loginForm.querySelector('button[type="submit"]');

      button.disabled = true;
      showMessage(loginMessage, "Signing in securely...", "info");

      try {
        const { data, error } = await db.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        await enterDashboard(data.user);

      } catch (error) {
        console.error("Login error:", error);

        showMessage(
          loginMessage,
          "Sign-in failed. Check your email and password.",
          "error"
        );

      } finally {
        button.disabled = false;
      }
    });
  }

  // LOAD ORDERS AND DASHBOARD STATISTICS

  async function loadOrders() {
    if (!db) return;

    ordersList.textContent = "Loading orders...";

    const { data, error } = await db
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Orders loading error:", error);
      ordersList.textContent = "Could not load orders.";
      return;
    }

    currentOrders = data || [];

    const total = document.getElementById("stat-total");
    const payment = document.getElementById("stat-payment");
    const transit = document.getElementById("stat-transit");
    const delivered = document.getElementById("stat-delivered");

    if (total) {
      total.textContent = currentOrders.length;
    }

    if (payment) {
      payment.textContent = currentOrders.filter(
        order => order.payment_status === "Awaiting payment"
      ).length;
    }

    if (transit) {
      transit.textContent = currentOrders.filter(
        order => order.status === "In transit"
      ).length;
    }

    if (delivered) {
      delivered.textContent = currentOrders.filter(
        order => order.status === "Delivered"
      ).length;
    }

    renderOrders();
  }

  // DROPDOWN CREATOR

  function makeSelect(options, selectedValue) {
    const select = document.createElement("select");

    select.style.display = "block";
    select.style.width = "100%";
    select.style.marginTop = "8px";
    select.style.minHeight = "44px";
    select.style.padding = "8px";
    select.style.borderRadius = "8px";
    select.style.boxSizing = "border-box";

    options.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

    if (selectedValue && !options.includes(selectedValue)) {
      const option = document.createElement("option");
      option.value = selectedValue;
      option.textContent = selectedValue;
      select.appendChild(option);
    }

    select.value = selectedValue || options[0];

    return select;
  }

  // COMPACT EXPANDABLE CUSTOMER ORDER LIST

  function renderOrders() {
    ordersList.replaceChildren();

    const search = (searchInput?.value || "").trim().toLowerCase();

    const filtered = currentOrders.filter(order =>
      [
        order.tracking_number,
        order.customer_name,
        order.destination,
        order.country
      ].some(value =>
        String(value || "").toLowerCase().includes(search)
      )
    );

    if (!filtered.length) {
      ordersList.textContent = "No matching orders found.";
      return;
    }

    filtered.forEach(order => {
      const card = document.createElement("details");

      card.style.background = "#17191D";
      card.style.color = "#FFFFFF";
      card.style.border = "1px solid #444";
      card.style.borderRadius = "10px";
      card.style.margin = "8px 0";
      card.style.overflow = "hidden";

      const summary = document.createElement("summary");
      summary.style.listStyle = "none";
      summary.style.cursor = "pointer";
      summary.style.padding = "12px";

      const top = document.createElement("div");
      top.style.display = "flex";
      top.style.justifyContent = "space-between";
      top.style.alignItems = "center";
      top.style.gap = "8px";

      const name = document.createElement("strong");
      name.textContent = order.customer_name || "Customer";
      name.style.fontSize = "14px";
      name.style.overflowWrap = "anywhere";

      const arrow = document.createElement("span");
      arrow.textContent = "＋";
      arrow.style.color = "#D4AF37";
      arrow.style.fontSize = "20px";
      arrow.style.flexShrink = "0";

      top.append(name, arrow);

      const tracking = document.createElement("div");
      tracking.textContent = order.tracking_number || "No tracking number";
      tracking.style.color = "#D4AF37";
      tracking.style.fontSize = "12px";
      tracking.style.marginTop = "4px";

      const statusesLine = document.createElement("div");
      statusesLine.style.display = "flex";
      statusesLine.style.justifyContent = "space-between";
      statusesLine.style.alignItems = "center";
      statusesLine.style.flexWrap = "wrap";
      statusesLine.style.gap = "6px";
      statusesLine.style.marginTop = "8px";

      const shipmentStatus = document.createElement("span");
      shipmentStatus.textContent = order.status || "Awaiting payment";
      shipmentStatus.style.color = getStatusColor(order.status);
      shipmentStatus.style.fontSize = "12px";
      shipmentStatus.style.fontWeight = "700";

      const paymentStatus = document.createElement("span");
      paymentStatus.textContent = order.payment_status || "Awaiting payment";
      paymentStatus.style.color = getStatusColor(order.payment_status);
      paymentStatus.style.fontSize = "12px";
      paymentStatus.style.fontWeight = "700";

      statusesLine.append(shipmentStatus, paymentStatus);
      summary.append(top, tracking, statusesLine);

      const detailsBox = document.createElement("div");
      detailsBox.style.padding = "12px";
      detailsBox.style.borderTop = "1px solid #444";
      detailsBox.style.background = "#202226";

      const heading = document.createElement("h4");
      heading.textContent = "ORDER DETAILS";
      heading.style.color = "#D4AF37";
      heading.style.fontSize = "13px";
      heading.style.margin = "2px 0 12px";

      detailsBox.appendChild(heading);

      addDetail(detailsBox, "Customer", order.customer_name);
      addDetail(detailsBox, "Phone", order.customer_phone);
      addDetail(detailsBox, "Email", order.customer_email);
      addDetail(detailsBox, "Tracking number", order.tracking_number);
      addDetail(detailsBox, "Country", order.country);
      addDetail(detailsBox, "Destination", order.destination);
      addDetail(detailsBox, "Package", order.package_description);
      addDetail(detailsBox, "Currency", order.currency);
      addDetail(detailsBox, "Order amount", order.order_amount);
      addDetail(detailsBox, "Delivery amount", order.delivery_amount);
      addDetail(detailsBox, "Shipment status", order.status);
      addDetail(detailsBox, "Payment status", order.payment_status);
      addDetail(detailsBox, "Courier", order.courier_name);
      addDetail(detailsBox, "Courier waybill", order.courier_waybill);
      addDetail(detailsBox, "Estimated delivery", order.estimated_delivery);
      addDetail(detailsBox, "Collection instructions", order.collection_instructions);

      const paymentLabel = document.createElement("label");
      paymentLabel.textContent = "Update payment status";
      paymentLabel.style.display = "block";
      paymentLabel.style.marginTop = "16px";
      paymentLabel.style.fontSize = "13px";
      paymentLabel.style.fontWeight = "600";

      const paymentSelect = makeSelect(
        paymentStatuses,
        order.payment_status || "Awaiting payment"
      );

      const shipmentLabel = document.createElement("label");
      shipmentLabel.textContent = "Update shipment status";
      shipmentLabel.style.display = "block";
      shipmentLabel.style.marginTop = "14px";
      shipmentLabel.style.fontSize = "13px";
      shipmentLabel.style.fontWeight = "600";

      const shipmentSelect = makeSelect(
        statuses,
        order.status || "Awaiting payment"
      );

      const updateButton = document.createElement("button");
      updateButton.type = "button";
      updateButton.textContent = "SAVE ORDER UPDATES";
      updateButton.style.width = "100%";
      updateButton.style.marginTop = "15px";
      updateButton.style.padding = "13px";
      updateButton.style.border = "none";
      updateButton.style.borderRadius = "8px";
      updateButton.style.background = "#D4AF37";
      updateButton.style.color = "#17191D";
      updateButton.style.fontWeight = "700";
      updateButton.style.cursor = "pointer";

      const feedback = document.createElement("p");
      feedback.setAttribute("role", "status");
      feedback.style.fontSize = "13px";

      updateButton.addEventListener("click", async () => {
        updateButton.disabled = true;
        updateButton.textContent = "SAVING...";

        showMessage(feedback, "Saving updates...", "info");

        try {
          const { error } = await db
            .from("orders")
            .update({
              payment_status: paymentSelect.value,
              status: shipmentSelect.value
            })
            .eq("id", order.id);

          if (error) throw error;

          showMessage(
            feedback,
            "Order updates saved successfully.",
            "success"
          );

          await loadOrders();

        } catch (error) {
          console.error("Order update error:", error);

          showMessage(
            feedback,
            "Update failed: " + getErrorDetails(error),
            "error"
          );

        } finally {
          updateButton.disabled = false;
          updateButton.textContent = "SAVE ORDER UPDATES";
        }
      });

      detailsBox.append(
        paymentLabel,
        paymentSelect,
        shipmentLabel,
        shipmentSelect,
        updateButton,
        feedback
      );

      card.append(summary, detailsBox);

      card.addEventListener("toggle", () => {
        arrow.textContent = card.open ? "−" : "＋";
      });

      ordersList.appendChild(card);
    });
  }

  // SEARCH ORDERS

  if (searchInput) {
    searchInput.addEventListener("input", renderOrders);
  }

  // REFRESH ORDERS

  const refreshButton = document.getElementById("refresh-orders");

  if (refreshButton) {
    refreshButton.addEventListener("click", loadOrders);
  }

  // REGISTER A NEW ORDER

  if (orderForm) {
    orderForm.addEventListener("submit", async event => {
      event.preventDefault();

      if (!db) {
        showMessage(
          orderMessage,
          "Database connection unavailable.",
          "error"
        );
        return;
      }

      const button = orderForm.querySelector('button[type="submit"]');

      button.disabled = true;
      showMessage(orderMessage, "Registering your order...", "info");

      try {
        const amount = Number(
          document.getElementById("order-amount").value
        );

        const delivery = Number(
          document.getElementById("delivery-amount").value
        );

        if (
          !Number.isFinite(amount) ||
          !Number.isFinite(delivery) ||
          amount < 0 ||
          delivery < 0
        ) {
          throw new Error(
            "Please enter valid, non-negative amounts."
          );
        }

        const selectedDays =
          document.getElementById("estimated-delivery").value;

        const estimatedDeliveryDate =
          getEstimatedDeliveryDate(selectedDays);

        const order = {
          customer_name:
            document.getElementById("customer-name").value.trim(),

          customer_phone:
            document.getElementById("customer-phone").value.trim(),

          customer_email:
            document.getElementById("customer-email").value.trim() || null,

          order_source:
            document.getElementById("order-source").value,

          country:
            document.getElementById("country").value,

          currency:
            document.getElementById("currency").value,

          destination:
            document.getElementById("destination").value.trim(),

          package_description:
            document.getElementById("package-description").value.trim(),

          order_amount: amount,
          delivery_amount: delivery,

          payment_status:
            document.getElementById("payment-status").value,

          status: "Awaiting payment",

          courier_name:
            document.getElementById("courier-name").value.trim() || null,

          courier_waybill:
            document.getElementById("courier-waybill").value.trim() || null,

          estimated_delivery: estimatedDeliveryDate,

          collection_instructions:
            document.getElementById("collection-instructions").value.trim() || null
        };

        if (
          !order.customer_name ||
          !order.customer_phone ||
          !order.destination ||
          !order.package_description ||
          !order.country ||
          !order.currency
        ) {
          throw new Error(
            "Please complete all required order details."
          );
        }

        const { data, error } = await db
          .from("orders")
          .insert(order)
          .select("tracking_number")
          .single();

        if (error) throw error;

        showMessage(
          orderMessage,
          "Order registered successfully! Your SC tracking number is: " +
            data.tracking_number,
          "success"
        );

        orderForm.reset();

        document.getElementById("country").value = "Nigeria";
        document.getElementById("currency").value = "NGN";
        document.getElementById("delivery-amount").value = "0";

        await loadOrders();

      } catch (error) {
        console.error("Order registration error:", error);

        showMessage(
          orderMessage,
          "REGISTRATION FAILED: " + getErrorDetails(error),
          "error"
        );

      } finally {
        button.disabled = false;
      }
    });
  }

  // LOG OUT

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      if (db) await db.auth.signOut();

      setDashboardVisible(false);

      showMessage(
        loginMessage,
        "You have signed out securely.",
        "success"
      );
    });
  }

  // RESTORE STAFF SESSION

  setDashboardVisible(false);

  if (!db) {
    showMessage(
      loginMessage,
      "Database connection unavailable.",
      "error"
    );
    return;
  }

  const { data: sessionData, error: sessionError } =
    await db.auth.getSession();

  if (sessionError) {
    console.error("Session error:", sessionError);
  }

  if (sessionData?.session) {
    await enterDashboard(sessionData.session.user);
  }
});
